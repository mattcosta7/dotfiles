#!/usr/bin/env node
// Checks that react-current-apis still matches React's docs and published packages, without a model.
// 1. Every react.dev URL cited in its SKILL.md returns 200 (as .md).
// 2. Every API in its version table is exported by react or react-dom at the "Since" minor (x.y.0)
//    and not by the latest release of the minor before it.
// 3. The sentinel phrases in canary.json are still on their react.dev pages.
// Usage: node canary.mjs [canary.json]
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(process.argv[2] ?? join(here, 'canary.json'), 'utf8'));
const installed = join(here, '../../skills', config.skill, 'SKILL.md');
const skillFile = existsSync(installed) ? installed : join(here, 'arms', config.skill, 'SKILL.md');
const skill = readFileSync(skillFile, 'utf8');
const failures = [];
const fail = (msg) => { failures.push(msg); console.log(`FAIL ${msg}`); };
const ok = (msg) => console.log(`ok   ${msg}`);

const pages = new Map();
async function page(url) {
  if (!pages.has(url)) {
    pages.set(url, fetch(url).then(async (r) => ({ status: r.status, text: r.ok ? await r.text() : '' })));
  }
  return pages.get(url);
}

// 1. Links
// Placeholders such as https://react.dev/reference/react/<name>.md are templates, not links.
const urls = [...new Set([...skill.matchAll(/https:\/\/react\.dev\/[^\s)`<>\]]+/g)].map((m) => m[0]))].filter((u) => !/\/$/.test(u));
for (const url of urls) {
  const target = /\.(md|txt)$/.test(url) ? url : `${url}.md`;
  const { status } = await page(target);
  if (status === 200) ok(`200 ${target}`);
  else fail(`${status} ${target} (cited in ${config.skill})`);
}

// 2. Exports
const rows = [...skill.matchAll(/^\s*\|\s*(\d+)\.(\d+)\s*\|(.*)\|\s*$/gm)];
const apis = [];
for (const [, major, minor, cell] of rows) {
  for (const [, text, url] of cell.matchAll(/\[([^\]]+)\]\((https:\/\/react\.dev\/[^)]+)\)/g)) {
    const name = text.replace(/^`<?|>?(\(\))?`$/g, '');
    const m = url.match(/\/reference\/(react|react-dom)\/(?:hooks\/)?([A-Za-z]+)\.md$/);
    // Entries such as "`ref` as a prop" or "Fragment refs" are behaviors, not exports; their links were checked above.
    if (!m || m[2] !== name) continue;
    apis.push({ name, pkg: m[1], since: `${major}.${minor}` });
  }
}

const previous = (since) => {
  const [major, minor] = since.split('.').map(Number);
  return minor === 0 ? `^${major - 1}.0.0` : `~${major}.${minor - 1}.0`;
};
const alias = (pkg, spec) => `${pkg}-${spec.replace(/[^\d.]/g, '')}${spec.startsWith('^') || spec.startsWith('~') ? '-latest' : ''}`;
const deps = {};
for (const { pkg, since } of apis) {
  deps[alias(pkg, `${since}.0`)] = `npm:${pkg}@${since}.0`;
  deps[alias(pkg, previous(since))] = `npm:${pkg}@${previous(since)}`;
}
const dir = join(process.env.REACT_EVALS_DEPS ?? join(homedir(), '.cache/react-evals'), 'canary');
mkdirSync(dir, { recursive: true });
const manifest = `${JSON.stringify({ name: 'react-canary', private: true, dependencies: deps }, null, 2)}\n`;
const manifestFile = join(dir, 'package.json');
if (!existsSync(join(dir, 'node_modules')) || !existsSync(manifestFile) || readFileSync(manifestFile, 'utf8') !== manifest) {
  writeFileSync(manifestFile, manifest);
  execFileSync('npm', ['install', '--no-audit', '--no-fund', '--legacy-peer-deps', '--loglevel=error'], { cwd: dir, stdio: 'inherit' });
}
const exportsOf = (name) => {
  const pkg = name.startsWith('react-dom') ? 'react-dom' : 'react';
  const source = readFileSync(join(dir, 'node_modules', name, 'cjs', `${pkg}.development.js`), 'utf8');
  const version = JSON.parse(readFileSync(join(dir, 'node_modules', name, 'package.json'), 'utf8')).version;
  return { version, has: (api) => new RegExp(`exports\\.${api}\\s*=`).test(source) };
};
for (const { name, pkg, since } of apis) {
  const now = exportsOf(alias(pkg, `${since}.0`));
  const before = exportsOf(alias(pkg, previous(since)));
  if (!now.has(name)) fail(`${pkg}@${now.version} does not export ${name} (table says since ${since})`);
  else if (before.has(name)) fail(`${pkg}@${before.version} already exports ${name} (table says since ${since})`);
  else ok(`${name}: in ${pkg}@${now.version}, not in ${pkg}@${before.version}`);
}
if (apis.length === 0) fail(`no APIs parsed from the version table in ${skillFile}`);

// 3. Sentinels
for (const { url, phrase } of config.sentinels) {
  const { status, text } = await page(url);
  if (status === 200 && text.includes(phrase)) ok(`"${phrase}" on ${url}`);
  else fail(`"${phrase}" not found on ${url} (status ${status})`);
}

if (failures.length) {
  console.log(`FAIL ${failures.length} check(s) failed`);
  process.exit(1);
}
console.log(`${urls.length} react.dev links ok, ${apis.length} exports match their minor, ${config.sentinels.length} sentinels present`);
