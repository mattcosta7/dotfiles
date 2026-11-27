import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h, useActionState } from 'react';
import { render, submit, settle, type } from './lib/dom.mjs';

async function validate(name) {
  await new Promise((r) => setTimeout(r, 5));
  return name.trim().length < 3 ? 'Name must be at least three characters' : null;
}

function ErrorOnly() {
  const [error, formAction] = useActionState(async (_prev, fd) => validate(fd.get('name')), null);
  return h('form', { action: formAction }, h('input', { name: 'name' }), h('button', { type: 'submit' }, 'Save'),
    error && h('p', { role: 'alert' }, error));
}

function ReturnsSubmitted() {
  const [state, formAction] = useActionState(async (_prev, fd) => {
    const error = await validate(fd.get('name'));
    return error ? { error, submitted: fd } : { error: null, submitted: null };
  }, { error: null, submitted: null });
  return h('form', { action: formAction },
    h('input', { name: 'name', defaultValue: state.submitted?.get('name') ?? '' }),
    h('button', { type: 'submit' }, 'Save'),
    state.error && h('p', { role: 'alert' }, state.error));
}

async function submitInvalid(Component) {
  const { container, unmount } = await render(h(Component));
  await type(container.querySelector('input'), 'ab');
  await submit(container.querySelector('form'));
  await settle(100);
  const result = { alert: container.querySelector('[role=alert]')?.textContent ?? null, value: container.querySelector('input').value };
  await unmount();
  return result;
}

test('an Action that returns an error still resets the form, clearing the input', async () => {
  assert.deepEqual(await submitInvalid(ErrorOnly), { alert: 'Name must be at least three characters', value: '' });
});

test('returning the submitted values for defaultValue keeps the input', async () => {
  assert.deepEqual(await submitInvalid(ReturnsSubmitted), { alert: 'Name must be at least three characters', value: 'ab' });
});
