#!/usr/bin/env node
// Turns React rows from run.sh's results.tsv into the skill-optimizer readout:
// pass rate per model and case for the baseline arm and each other arm, with the delta, mean AIU and mean seconds.
// Usage: node report.mjs <results.tsv> [baseline arm, default base]
import { readFileSync } from 'node:fs';

const [file, baseline = 'base'] = process.argv.slice(2);
const rows = readFileSync(file, 'utf8').trim().split('\n').map((line) => line.split('\t'))
  .filter(([name]) => name?.startsWith('react-') && name.split('/').length === 3)
  .map(([name, result, secs, note = '']) => {
    const [kase, arm, model] = name.split('/');
    return { kase: kase.slice('react-'.length), arm, model, pass: result === 'PASS', secs: Number(secs), aiu: Number(note.match(/aiu=([\d.]+)/)?.[1] ?? 0) };
  });

const groups = new Map();
for (const r of rows) {
  const key = `${r.model}\t${r.kase}\t${r.arm}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(r);
}
const stat = (model, kase, arm) => {
  const g = groups.get(`${model}\t${kase}\t${arm}`) ?? [];
  const mean = (k) => (g.length ? g.reduce((s, r) => s + r[k], 0) / g.length : 0);
  return { n: g.length, pass: g.filter((r) => r.pass).length, aiu: mean('aiu'), secs: mean('secs') };
};
const pct = (s) => (s.n ? Math.round((100 * s.pass) / s.n) : null);
const cell = (s) => (s.n ? `${s.pass}/${s.n}` : '–');

const models = [...new Set(rows.map((r) => r.model))].sort();
const cases = [...new Set(rows.map((r) => r.kase))].sort();
const arms = [...new Set(rows.map((r) => r.arm))].filter((a) => a !== baseline).sort();

const head = ['Model', 'Case', `${baseline} (Without)`];
for (const arm of arms) head.push(`${arm} (With)`, `Δ ${arm}`);
head.push(`AIU ${[baseline, ...arms].join(' / ')}`, `Secs ${[baseline, ...arms].join(' / ')}`);
console.log(`| ${head.join(' | ')} |`);
console.log(`|${head.map(() => '---').join('|')}|`);
const zeros = [];
const negatives = [];
for (const model of models) {
  for (const kase of cases) {
    const base = stat(model, kase, baseline);
    const line = [model, kase, cell(base)];
    const aiu = [base.aiu.toFixed(1)];
    const secs = [Math.round(base.secs)];
    for (const arm of arms) {
      const s = stat(model, kase, arm);
      const delta = pct(s) !== null && pct(base) !== null ? pct(s) - pct(base) : null;
      line.push(cell(s), delta === null ? '–' : `${delta > 0 ? '+' : ''}${delta}%`);
      aiu.push(s.n ? s.aiu.toFixed(1) : '–');
      secs.push(s.n ? Math.round(s.secs) : '–');
      if (s.n && s.pass === 0) zeros.push(`${kase}/${arm}/${model}`);
      if (delta !== null && delta < 0) negatives.push(`${kase}/${arm}/${model} (${delta}%)`);
    }
    if (line.slice(2).every((c) => c === '–')) continue;
    line.push(aiu.join(' / '), secs.join(' / '));
    console.log(`| ${line.join(' | ')} |`);
  }
}
console.log();
console.log(`Universal failures (0% with the arm): ${zeros.length ? zeros.join(', ') : 'none'}`);
console.log(`Regressions (negative deltas): ${negatives.length ? negatives.join(', ') : 'none'}`);
