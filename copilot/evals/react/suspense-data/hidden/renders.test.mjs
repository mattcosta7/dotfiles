import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { render, waitFor } from './lib/dom.mjs';
import { serve } from './routes.mjs';

const { default: App } = await import('../src/App.jsx');

test('comments for the selected post render within 2 seconds', async () => {
  const api = serve();
  const { container, unmount } = await render(h(App));
  assert.ok(await waitFor(() => container.textContent.includes('First comment on post 1'), 2000), container.textContent);
  assert.equal(api.count('/api/posts/1/'), 1);
  await unmount();
});
