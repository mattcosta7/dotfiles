import { test } from 'node:test';
import assert from 'node:assert/strict';
import { act, createElement as h, use, useState, Suspense } from 'react';
import { render, waitFor, settle } from './lib/dom.mjs';

console.error = () => {};
let fetches = 0;
const fetchComments = (id) => {
  fetches++;
  return new Promise((r) => setTimeout(() => r([`comment for ${id}`]), 5));
};
const cache = new Map();
const cached = (id) => {
  if (!cache.has(id)) cache.set(id, fetchComments(id));
  return cache.get(id);
};
const Comments = ({ promise }) => h('ul', null, use(promise).map((c) => h('li', { key: c }, c)));
const fallback = h('p', null, 'loading');
let bump;

const shapes = {
  parentOutside: () => h(Suspense, { fallback }, h(Comments, { promise: fetchComments(1) })),
  parentOutsideRerenders: () => {
    const [n, set] = useState(0);
    bump = () => set(n + 1);
    return h(Suspense, { fallback }, h(Comments, { promise: fetchComments(1) }));
  },
  insideBoundary: () => h(Suspense, { fallback }, h(function Wrapper() { return h(Comments, { promise: fetchComments(1) }); })),
  cachedPromise: () => h(Suspense, { fallback }, h(Comments, { promise: cached(1) })),
};

async function mount(Shape) {
  fetches = 0;
  bump = null;
  return render(h(Shape));
}

test('a Promise created inside the boundary never leaves the fallback and refetches', async () => {
  const { container, unmount } = await mount(shapes.insideBoundary);
  assert.equal(await waitFor(() => container.textContent.includes('comment for 1'), 1500), false);
  assert.ok(fetches >= 2, `fetches=${fetches}`);
  await unmount();
});

test('a Promise from a committed parent renders with one fetch', async () => {
  const { container, unmount } = await mount(shapes.parentOutside);
  assert.ok(await waitFor(() => container.textContent.includes('comment for 1')));
  assert.equal(fetches, 1);
  await unmount();
});

test('a Promise from a re-rendering parent refetches on every parent render', async () => {
  const { container, unmount } = await mount(shapes.parentOutsideRerenders);
  assert.ok(await waitFor(() => container.textContent.includes('comment for 1')));
  for (let i = 0; i < 3; i++) {
    await act(async () => bump());
    await settle(100);
    await waitFor(() => container.textContent.includes('comment for 1'));
  }
  assert.equal(fetches, 4);
  await unmount();
});

test('a cached Promise renders with one fetch', async () => {
  const { container, unmount } = await mount(shapes.cachedPromise);
  assert.ok(await waitFor(() => container.textContent.includes('comment for 1')));
  assert.equal(fetches, 1);
  await unmount();
});
