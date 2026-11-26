import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { render, waitFor, settle, select, byLabel } from './lib/dom.mjs';
import { serve } from './routes.mjs';

const { default: App } = await import('../src/App.jsx');

test('switching posts while the first is loading shows the second post', async () => {
  serve({ 1: 300, 2: 20 });
  const { container, unmount } = await render(h(App));
  await select(byLabel(container, 'Post'), 2);
  await settle(600);
  assert.ok(await waitFor(() => container.textContent.includes('First comment on post 2'), 1000), container.textContent);
  assert.ok(!container.textContent.includes('comment on post 1'), container.textContent);
  await unmount();
});
