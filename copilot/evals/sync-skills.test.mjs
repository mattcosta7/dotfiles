import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'sync-skills-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  cpSync(new URL('../sync-skills.sh', import.meta.url), join(root, 'sync-skills.sh'));
  mkdirSync(join(root, 'bin'));
  mkdirSync(join(root, 'skills'));
  writeFileSync(join(root, 'bin/git'), `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
if (args[0] === 'clone') {
  const repo = args.at(-2).replace('https://github.com/', '');
  fs.cpSync(path.join(process.env.FIXTURES, repo), args.at(-1), { recursive: true });
} else if (args[0] === '-C' && args[2] === 'rev-parse') {
  console.log('a'.repeat(40));
} else {
  throw new Error('Unexpected git command: ' + args.join(' '));
}
`, { mode: 0o755 });
  const upstream = join(root, 'upstream');
  const source = join(upstream, 'example/tools');
  for (const name of ['vite', 'vitest', 'unrelated']) {
    const dir = join(source, 'skills', name);
    mkdirSync(join(dir, 'references'), { recursive: true });
    writeFileSync(join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: Test skill.\n---\n`);
    writeFileSync(join(dir, 'references/usage.md'), name);
  }
  writeFileSync(join(source, 'LICENSE'), 'Fixture license');
  const other = join(upstream, 'example/other/skills/keep');
  mkdirSync(other, { recursive: true });
  writeFileSync(join(other, 'SKILL.md'), '---\nname: keep\ndescription: New upstream content.\n---\n');
  return {
    root,
    run: (...args) => execFileSync('sh', [join(root, 'sync-skills.sh'), ...args], {
      env: { ...process.env, PATH: `${join(root, 'bin')}:${process.env.PATH}`, FIXTURES: upstream },
      encoding: 'utf8',
      stdio: 'pipe',
    }),
  };
}

test('imports only explicitly included skills with their references and license', t => {
  const { root, run } = fixture(t);
  writeFileSync(join(root, 'skill-sources.txt'), 'example/tools skills - vite,vitest\n');
  run();
  assert.deepEqual(readdirSync(join(root, 'skills')).sort(), ['vite', 'vitest']);
  assert.equal(readFileSync(join(root, 'skills/vite/references/usage.md'), 'utf8'), 'vite');
  assert.equal(readFileSync(join(root, 'licenses/example_tools-LICENSE'), 'utf8'), 'Fixture license');
  const lock = readFileSync(join(root, 'skills.lock'), 'utf8');
  assert.match(lock, /example\/tools a{40} vite\n/);
  assert.match(lock, /example\/tools a{40} vitest\n/);
  assert.doesNotMatch(lock, /unrelated/);
});

test('refreshing one source preserves other sources and local skills', t => {
  const { root, run } = fixture(t);
  writeFileSync(join(root, 'skill-sources.txt'),
    'example/tools skills - vite,vitest\nexample/other skills\n');
  for (const name of ['keep', 'local']) {
    mkdirSync(join(root, 'skills', name));
    writeFileSync(join(root, 'skills', name, 'SKILL.md'), `Original ${name}`);
  }
  const keptEntry = `example/other ${'b'.repeat(40)} keep\n`;
  writeFileSync(join(root, 'skills.lock'), `# Lock\n${keptEntry}`);
  run('example/tools');
  assert.equal(readFileSync(join(root, 'skills/keep/SKILL.md'), 'utf8'), 'Original keep');
  assert.equal(readFileSync(join(root, 'skills/local/SKILL.md'), 'utf8'), 'Original local');
  const lock = readFileSync(join(root, 'skills.lock'), 'utf8');
  assert.ok(lock.includes(keptEntry));
  assert.deepEqual(readdirSync(join(root, 'skills')).sort(), ['keep', 'local', 'vite', 'vitest']);
  run('example/tools');
  assert.equal(readFileSync(join(root, 'skills.lock'), 'utf8'), lock);
  assert.equal(readFileSync(join(root, 'skills/keep/SKILL.md'), 'utf8'), 'Original keep');
});

test('a full refresh still supports existing skip lists', t => {
  const { root, run } = fixture(t);
  writeFileSync(join(root, 'skill-sources.txt'),
    'example/tools skills unrelated\nexample/other skills\n');
  run();
  assert.deepEqual(readdirSync(join(root, 'skills')).sort(), ['keep', 'vite', 'vitest']);
});

test('an unknown source fails without changing installed skills or the lock', t => {
  const { root, run } = fixture(t);
  writeFileSync(join(root, 'skill-sources.txt'), 'example/tools skills - vite,vitest\n');
  mkdirSync(join(root, 'skills/local'));
  writeFileSync(join(root, 'skills/local/SKILL.md'), 'Original local');
  const lock = '# Original lock\n';
  writeFileSync(join(root, 'skills.lock'), lock);
  assert.throws(() => run('example/missing'), error => {
    assert.match(error.stderr, /unknown source 'example\/missing'/);
    return true;
  });
  assert.deepEqual(readdirSync(join(root, 'skills')), ['local']);
  assert.equal(readFileSync(join(root, 'skills.lock'), 'utf8'), lock);
});

test('a missing included skill fails before replacing installed skills', t => {
  const { root, run } = fixture(t);
  writeFileSync(join(root, 'skill-sources.txt'), 'example/tools skills - missing\n');
  mkdirSync(join(root, 'skills/vite'));
  writeFileSync(join(root, 'skills/vite/SKILL.md'), 'Original vite');
  const lock = `# Original lock\nexample/tools ${'b'.repeat(40)} vite\n`;
  writeFileSync(join(root, 'skills.lock'), lock);
  assert.throws(() => run(), error => {
    assert.match(error.stderr, /missing included skill 'missing'/);
    return true;
  });
  assert.equal(readFileSync(join(root, 'skills/vite/SKILL.md'), 'utf8'), 'Original vite');
  assert.equal(readFileSync(join(root, 'skills.lock'), 'utf8'), lock);
});
