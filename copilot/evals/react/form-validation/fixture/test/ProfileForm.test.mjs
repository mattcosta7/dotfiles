import { test } from 'node:test';
import assert from 'node:assert/strict';
import { act, createElement as h } from 'react';
import { createRoot } from 'react-dom/client';
import ProfileForm from '../src/ProfileForm.jsx';

test('renders a name field and a save button', async () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  await act(async () => root.render(h(ProfileForm, { save: async () => ({ ok: true }) })));
  assert.ok(container.querySelector('input[name="name"]'));
  assert.equal(container.querySelector('button').textContent, 'Save');
  await act(async () => root.unmount());
});
