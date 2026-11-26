import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h, Suspense, use } from 'react';
import { browser } from 'react-dom';
import { renderToString } from 'react-dom/server';

function Editor() {
  use(browser());
  return h('div', { role: 'textbox' });
}

test('use(browser()) outside a Suspense boundary fails the server render', () => {
  assert.throws(() => renderToString(h('main', null, h(Editor))), /outside a Suspense boundary/);
});

test('inside a Suspense boundary the server renders the fallback', () => {
  const html = renderToString(h('main', null, h(Suspense, { fallback: h('p', null, 'Loading editor') }, h(Editor))));
  assert.match(html, /Loading editor/);
  assert.doesNotMatch(html, /textbox/);
});
