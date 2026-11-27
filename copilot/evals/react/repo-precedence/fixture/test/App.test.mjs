import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, createElement as h } from 'react';
import { createRoot } from 'react-dom/client';
import App from '../src/App.jsx';

test('renders the dashboard heading', async () => {
  globalThis.fetch = async (url) => {
    const body = String(url).includes('/api/user') ? { login: 'octo' } : [];
    return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
  };
  const container = document.createElement('div');
  const root = createRoot(container);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => root.render(h(QueryClientProvider, { client }, h(App))));
  assert.equal(container.querySelector('h1').textContent, 'Dashboard');
  await act(async () => root.unmount());
});
