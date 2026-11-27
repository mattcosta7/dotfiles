#!/usr/bin/env node
// Grades a research-case transcript.
// Usage: node research.mjs <events.jsonl> <casedir> <fixture dir>
// PASS needs: the final "Answer: <letter>" matches case.json, every cited react/react PR, issue,
// commit and packages/ file:line resolves, and the fixture's git status stays clean.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parse, summarize } from './telemetry.mjs';

const [file, casedir, fixture] = process.argv.slice(2);
const want = JSON.parse(readFileSync(join(casedir, 'case.json'), 'utf8')).answer;
const version = readFileSync(join(casedir, 'react-version'), 'utf8').trim();
const text = summarize(parse(readFileSync(file, 'utf8'))).answer;
const clone = join(homedir(), '.cache/react-expert/react');

const run = (cmd, args, opts = {}) => {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], ...opts });
  } catch {
    return null;
  }
};

const got = [...text.matchAll(/answer\**\s*[:：]\s*\**\s*\(?([A-D])\b/gi)].at(-1)?.[1]?.toUpperCase() ?? 'none';

const refs = new Map();
for (const m of text.matchAll(/(?:github\.com\/)?(react\/react|facebook\/react|reactjs\/react\.dev)(?:\/(?:pull|issues)\/|#)(\d+)/g)) {
  const repo = m[1] === 'facebook/react' ? 'react/react' : m[1];
  refs.set(`${repo}#${m[2]}`, () => run('gh', ['api', `repos/${repo}/issues/${m[2]}`, '--jq', '.number']));
}
for (const m of text.matchAll(/(?<![\w/])(?:PR\s*)?#(\d{4,6})\b/g)) {
  if (![...refs.keys()].some((k) => k.endsWith(`#${m[1]}`))) {
    refs.set(`react/react#${m[1]}`, () => run('gh', ['api', `repos/react/react/issues/${m[1]}`, '--jq', '.number']));
  }
}
for (const m of text.matchAll(/(?:\/commit\/|commit\s+`?)([0-9a-f]{7,40})\b/gi)) {
  refs.set(`commit ${m[1]}`, () => run('gh', ['api', `repos/react/react/commits/${m[1]}`, '--jq', '.sha']));
}
for (const m of text.matchAll(/\b(packages\/[\w.@/-]+\.(?:js|ts|tsx|jsx)):(\d+)/g)) {
  refs.set(`${m[1]}:${m[2]}`, () => {
    const source = run('git', ['-C', clone, 'show', `v${version}:${m[1]}`], { maxBuffer: 64 * 1024 * 1024 });
    return source !== null && source.split('\n').length >= Number(m[2]);
  });
}
const bad = [...refs].filter(([, check]) => !check()).map(([ref]) => ref);

const status = run('git', ['-C', fixture, 'status', '--porcelain']);
const clean = status !== null && status.trim() === '';

console.log(`answer=${got} want=${want} refs=${refs.size - bad.length}/${refs.size}${bad.length ? ` unresolved=${bad.join(',')}` : ''} clean=${clean ? 'yes' : 'no'}`);
process.exit(got === want && bad.length === 0 && clean ? 0 : 1);
