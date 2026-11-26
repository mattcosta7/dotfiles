import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor, mockFetch } from './lib/dom.mjs';

const { default: RepoList } = await import('../src/RepoList.jsx');
const { default: App } = await import('../src/App.jsx');

const repos = [{ id: 1, name: 'alpha' }, { id: 2, name: 'beta' }];

function withClient(element) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return { client, tree: h(QueryClientProvider, { client }, h(Suspense, { fallback: h('p', null, 'loading') }, element)) };
}

test('RepoList loads /api/repos through the React Query client', async () => {
  const api = mockFetch({ '/api/repos': { body: repos }, '/api/user': { body: { login: 'octo' } } });
  const { client, tree } = withClient(h(RepoList));
  const { container, unmount } = await render(tree);
  assert.ok(await waitFor(() => container.textContent.includes('alpha') && container.textContent.includes('beta')), container.textContent);
  assert.equal(api.count('/api/repos'), 1);
  const keys = client.getQueryCache().getAll().map((q) => JSON.stringify(q.queryKey));
  assert.ok(keys.length > 0, 'the repos request should go through useQuery and the provided QueryClient');
  await unmount();
});

test('App renders RepoList', async () => {
  mockFetch({ '/api/repos': { body: repos }, '/api/user': { body: { login: 'octo' } } });
  const { tree } = withClient(h(App));
  const { container, unmount } = await render(tree);
  assert.ok(await waitFor(() => container.textContent.includes('alpha')), container.textContent);
  await unmount();
});
