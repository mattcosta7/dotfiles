#!/usr/bin/env node
// Summarizes a `copilot --output-format json` transcript.
// Usage: node telemetry.mjs <events.jsonl>            -> "skill=<0|1> docs=<n> aiu=<n> [skills=a,b] [exit=<code>]"
//        node telemetry.mjs --loaded <events.jsonl>   -> loaded skill names, space-separated
//        node telemetry.mjs --answer <events.jsonl>   -> the last assistant message
// skill=1 when react-current-apis or react-expert loaded. docs counts web_fetch calls to react.dev.
// aiu is the session's final totalNanoAiu / 1e9.
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const TARGETS = new Set(['react-current-apis', 'react-expert']);

export function parse(text) {
  const events = [];
  for (const line of text.split('\n')) {
    if (!line.startsWith('{')) continue;
    try {
      events.push(JSON.parse(line));
    } catch {
      // Non-JSON output (warnings, crashes) is ignored.
    }
  }
  return events;
}

export function summarize(events) {
  const starts = events.filter((e) => e.type === 'tool.execution_start').map((e) => e.data ?? {});
  const skills = [...new Set(starts.filter((d) => d.toolName === 'skill').map((d) => d.arguments?.skill).filter(Boolean))];
  const docs = starts.filter((d) => d.toolName === 'web_fetch' && String(d.arguments?.url ?? '').includes('react.dev')).length;
  const usage = events.filter((e) => e.type === 'session.usage_checkpoint').at(-1);
  const aiu = (usage?.data?.totalNanoAiu ?? 0) / 1e9;
  const result = events.find((e) => e.type === 'result');
  const answer = events.filter((e) => e.type === 'assistant.message' && e.data?.content?.trim()).at(-1)?.data.content ?? '';
  return { skills, skill: skills.some((s) => TARGETS.has(s)), docs, aiu, exitCode: result ? result.exitCode : null, answer };
}

export function format(s) {
  const parts = [`skill=${s.skill ? 1 : 0}`, `docs=${s.docs}`, `aiu=${s.aiu.toFixed(2)}`];
  if (s.skills.length) parts.push(`skills=${s.skills.join(',')}`);
  if (s.exitCode !== 0) parts.push(`exit=${s.exitCode ?? 'none'}`);
  return parts.join(' ');
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [flag, file] = process.argv[2]?.startsWith('--') ? process.argv.slice(2) : [null, process.argv[2]];
  const s = summarize(parse(readFileSync(file, 'utf8')));
  if (flag === '--loaded') console.log(s.skills.join(' '));
  else if (flag === '--answer') console.log(s.answer);
  else console.log(format(s));
}
