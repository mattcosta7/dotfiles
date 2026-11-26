import { test } from 'node:test';
import assert from 'node:assert/strict';
import { act, createElement as h } from 'react';
import { createRoot } from 'react-dom/client';
import List from '../src/List.jsx';

test('renders one row per item', async () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  const items = [{ id: 'a', label: 'Apple' }, { id: 'b', label: 'Banana' }];
  await act(async () => root.render(h(List, { items })));
  assert.equal(container.querySelectorAll('li').length, 2);
  await act(async () => root.unmount());
});
