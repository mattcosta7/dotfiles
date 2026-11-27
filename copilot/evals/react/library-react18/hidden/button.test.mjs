import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h, createRef, version } from 'react';
import { render } from './lib/dom.mjs';

const { Button } = await import('../src/index.js');

async function html(props) {
  const { container, unmount } = await render(h(Button, props, 'Go'));
  const out = container.innerHTML;
  await unmount();
  return out;
}

test(`ref points at the <button> on React ${version}`, async () => {
  const ref = createRef();
  const { unmount } = await render(h(Button, { ref }, 'Go'));
  assert.ok(ref.current instanceof window.HTMLButtonElement, `ref.current is ${ref.current}`);
  await unmount();
});

test(`size changes the rendered button and defaults to medium on React ${version}`, async () => {
  const small = await html({ size: 'small' });
  const medium = await html({ size: 'medium' });
  const large = await html({ size: 'large' });
  assert.notEqual(small, medium);
  assert.notEqual(medium, large);
  assert.notEqual(small, large);
  assert.equal(await html({}), medium);
  assert.doesNotMatch(small, /\ssize=/, 'size should not leak onto the <button> as an attribute');
});

test(`existing props keep working on React ${version}`, async () => {
  assert.equal(await html({}), await html({ variant: 'primary', type: 'button' }));
  const danger = await html({ variant: 'danger', className: 'wide', type: 'submit', 'aria-label': 'Delete' });
  assert.match(danger, /btn-danger/);
  assert.match(danger, /wide/);
  assert.match(danger, /type="submit"/);
  assert.match(danger, /aria-label="Delete"/);
  let clicked = 0;
  const { container, unmount } = await render(h(Button, { onClick: () => clicked++ }, 'Go'));
  container.querySelector('button').click();
  assert.equal(clicked, 1);
  await unmount();
});
