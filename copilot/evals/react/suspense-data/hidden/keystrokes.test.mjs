import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { render, waitFor, settle, type, byLabel } from './lib/dom.mjs';
import { serve } from './routes.mjs';

const { default: App } = await import('../src/App.jsx');

test('typing in the search box does not refetch comments', async () => {
  const api = serve();
  const { container, unmount } = await render(h(App));
  assert.ok(await waitFor(() => container.textContent.includes('First comment on post 1'), 2000), container.textContent);
  await type(byLabel(container, 'Search posts'), 'roadm');
  await settle(200);
  assert.equal(api.count('/api/posts/1/'), 1, `fetches: ${api.calls.join(', ')}`);
  assert.ok(container.textContent.includes('First comment on post 1'), container.textContent);
  await unmount();
});
