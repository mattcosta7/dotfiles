import { renderCount } from './lib/renders.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { render, type, byLabel } from './lib/dom.mjs';

const { default: List } = await import('../src/List.jsx');

const items = ['Apple', 'Banana', 'Grape', 'Pineapple', 'Cherry'].map((label) => ({ id: label.toLowerCase(), label }));
const labels = (container) => [...container.querySelectorAll('li')].map((li) => li.textContent.trim());

test('the Filter input shows only matching items, ignoring case', async () => {
  const { container, unmount } = await render(h(List, { items }));
  const filter = byLabel(container, 'Filter');
  assert.ok(filter, 'an input labeled "Filter"');
  await type(filter, 'AP');
  assert.deepEqual(labels(container), ['Apple', 'Grape', 'Pineapple']);
  await unmount();
});

test('typing in an unrelated input does not re-render the rows', async () => {
  const { container, unmount } = await render(h(List, { items }));
  assert.ok(byLabel(container, 'Filter'), 'an input labeled "Filter"');
  const before = renderCount('Row');
  assert.ok(before >= items.length, `rows rendered ${before} times on mount`);
  await type(byLabel(container, 'Note'), 'hello');
  assert.equal(renderCount('Row') - before, 0, 'Row re-rendered while typing a note');
  await type(byLabel(container, 'Filter'), 'e');
  const filtered = renderCount('Row');
  await type(byLabel(container, 'Note'), '!');
  assert.equal(renderCount('Row') - filtered, 0, 'Row re-rendered while typing a note with a filter applied');
  await unmount();
});
