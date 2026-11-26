import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countLines, countWords } from '../src/count.js';

test('counts words separated by single spaces', () => {
  assert.equal(countWords('one two three'), 3);
});

test('counts lines with and without a trailing newline', () => {
  assert.equal(countLines('a\nb\n'), 2);
  assert.equal(countLines('a\nb'), 2);
  assert.equal(countLines(''), 0);
});
