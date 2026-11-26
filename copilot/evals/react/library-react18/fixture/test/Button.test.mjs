import { test } from 'node:test';
import assert from 'node:assert/strict';
import { act, createElement as h } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '../src/index.js';

test('renders a primary button by default', async () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  await act(async () => root.render(h(Button, null, 'Save')));
  assert.ok(container.querySelector('button').classList.contains('btn-primary'));
  await act(async () => root.unmount());
});
