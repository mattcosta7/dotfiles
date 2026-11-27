import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { render, type, submit, waitFor, settle, byLabel } from './lib/dom.mjs';

const { default: ProfileForm } = await import('../src/ProfileForm.jsx');

const ERROR = 'Name must be at least 3 characters';

function server() {
  const calls = [];
  const save = async ({ name }) => {
    calls.push(name);
    await new Promise((r) => setTimeout(r, 5));
    return String(name).trim().length < 3 ? { error: ERROR } : { ok: true };
  };
  return { calls, save };
}

async function mount() {
  const api = server();
  const view = await render(h(ProfileForm, { save: api.save }));
  const form = view.container.querySelector('form');
  // React renders a javascript: URL placeholder for a function passed to <form action>.
  assert.match(form.getAttribute('action') ?? '', /^javascript:/, 'ProfileForm should pass a function to <form action>');
  return { ...view, ...api, form, input: byLabel(view.container, 'Name') };
}

test('a rejected name shows the server error and keeps what the user typed', async () => {
  const { container, form, input, calls, unmount } = await mount();
  await type(input, 'ab');
  await submit(form);
  assert.ok(await waitFor(() => container.querySelector('[role=alert]')), 'error message should appear');
  await settle(100);
  assert.equal(container.querySelector('[role=alert]').textContent, ERROR);
  assert.deepEqual(calls, ['ab']);
  assert.equal(byLabel(container, 'Name').value, 'ab', 'the input should still hold the submitted name');
  await unmount();
});

test('a valid name calls save without an error', async () => {
  const { container, form, input, calls, unmount } = await mount();
  await type(input, 'alice');
  await submit(form);
  assert.ok(await waitFor(() => calls.length === 1), 'save should be called');
  await settle(100);
  assert.deepEqual(calls, ['alice']);
  assert.equal(container.querySelector('[role=alert]'), null);
  await unmount();
});
