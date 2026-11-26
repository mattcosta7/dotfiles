import { test } from 'node:test';
import assert from 'node:assert/strict';
import { act, createElement as h } from 'react';
import { createRoot } from 'react-dom/client';
import App from '../src/App.jsx';

test('renders the search box and post picker', async () => {
  globalThis.fetch = async () => new Response('[]', { headers: { 'content-type': 'application/json' } });
  const container = document.createElement('div');
  const root = createRoot(container);
  await act(async () => root.render(h(App)));
  assert.ok(container.querySelector('[aria-label="Search posts"]'));
  assert.ok(container.querySelector('[aria-label="Post"]'));
  await act(async () => root.unmount());
});
