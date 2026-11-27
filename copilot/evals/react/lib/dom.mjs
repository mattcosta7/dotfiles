// Shared helpers for the hidden oracle tests: jsdom globals, mounting, polling and typing.
import 'global-jsdom/register';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

// global-jsdom leaves Node's FormData in place, which React's form Actions reject.
globalThis.FormData = window.FormData;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

export async function render(element) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(element));
  return {
    container,
    unmount: async () => {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}

export const sleep = (ms) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });

// Poll in short, separate act() calls: one long act() delays the fallback commit,
// and React throttles Suspense reveals for about 300 ms after it.
export async function waitFor(check, ms = 2000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (check()) return true;
    await sleep(25);
  }
  return check();
}

// Lets pending work run for ms without asserting anything.
export async function settle(ms) {
  await waitFor(() => false, ms);
}

export function byLabel(container, label) {
  const direct = container.querySelector(`[aria-label="${label}"]`);
  if (direct) return direct;
  for (const el of container.querySelectorAll('label')) {
    if (el.textContent.trim().startsWith(label)) {
      return el.control ?? el.querySelector('input, select, textarea');
    }
  }
  return null;
}

// Sets the value the way a user would, so both controlled and uncontrolled inputs see it.
export async function type(input, text, { append = true } = {}) {
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value').set;
  let value = append ? input.value : '';
  for (const ch of text) {
    value += ch;
    await act(async () => {
      setter.call(input, value);
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
  }
}

export async function select(el, value) {
  await act(async () => {
    el.value = String(value);
    el.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
}

export async function submit(form) {
  await act(async () => form.requestSubmit());
}

// Counts fetch calls per URL and answers from a route table: { '/api/x': { body, delay } }.
export function mockFetch(routes) {
  const calls = [];
  globalThis.fetch = async (input) => {
    const url = String(input?.url ?? input);
    calls.push(url);
    const route = Object.entries(routes).find(([path]) => url.includes(path));
    if (!route) return new Response('not found', { status: 404 });
    const { body, delay = 10 } = route[1];
    await new Promise((r) => setTimeout(r, delay));
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  return { calls, count: (path) => calls.filter((u) => u.includes(path)).length };
}
