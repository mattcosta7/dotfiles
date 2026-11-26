import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h, Fragment, Suspense, use, useState, startTransition, act, version } from 'react';
import { render, settle } from './lib/dom.mjs';

// 19.2 entangles separate Transitions; 19.3 renders them independently (react/react#37290).
const SECOND_COMMITS_EARLY = false;

let slow;
let set;
function Slow({ a }) {
  if (a > 0) use(slow);
  return h('p', null, 'a=' + a);
}
function App() {
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  set = { setA, setB };
  return h(Fragment, null, h(Suspense, { fallback: h('p', null, 'loading') }, h(Slow, { a })), h('p', null, 'b=' + b));
}

test('a second Transition waits for a suspended first one on ' + version, async () => {
  slow = new Promise((r) => setTimeout(r, 600));
  const { container, unmount } = await render(h(App));
  await act(async () => startTransition(() => set.setA(1)));
  await act(async () => startTransition(() => set.setB(1)));
  await settle(200);
  assert.equal(container.textContent, SECOND_COMMITS_EARLY ? 'a=0b=1' : 'a=0b=0');
  await settle(800);
  assert.equal(container.textContent, 'a=1b=1');
  await unmount();
});
