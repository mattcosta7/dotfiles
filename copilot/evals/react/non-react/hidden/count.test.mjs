import { test } from 'node:test';
import assert from 'node:assert/strict';

const { countWords, countLines } = await import('../src/count.js');

test('words separated by any run of whitespace', () => {
  assert.equal(countWords('a  b'), 2);
  assert.equal(countWords(' hello\nworld\t '), 2);
  assert.equal(countWords('one two three'), 3);
});

test('empty and blank input have no words', () => {
  assert.equal(countWords(''), 0);
  assert.equal(countWords('  \n\t'), 0);
});

test('countLines is unchanged', () => {
  assert.equal(countLines('a\nb\n'), 2);
  assert.equal(countLines(''), 0);
});
