// Counts function component renders by name through a minimal React DevTools hook.
// Import this before anything that loads react-dom.
const PerformedWork = 1;
const counts = new Map();
let previous = new Set();

function nameOf(fiber) {
  const type = fiber.type;
  if (typeof type !== 'function') return null;
  return type.displayName || type.name || null;
}

function walk(fiber, visit) {
  for (let f = fiber; f; f = f.sibling) {
    visit(f);
    if (f.child) walk(f.child, visit);
  }
}

globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
  isDisabled: false,
  supportsFiber: true,
  renderers: new Map(),
  inject(renderer) {
    const id = this.renderers.size + 1;
    this.renderers.set(id, renderer);
    return id;
  },
  onScheduleFiberRoot() {},
  onCommitFiberUnmount() {},
  onPostCommitFiberRoot() {},
  onCommitFiberRoot(_id, root) {
    const seen = new Set();
    walk(root.current.child, (fiber) => {
      const name = nameOf(fiber);
      if (!name) return;
      seen.add(fiber);
      // A fiber that was not cloned this commit did not render; a cloned one rendered only if it did work.
      if (!previous.has(fiber) && (fiber.flags & PerformedWork)) counts.set(name, (counts.get(name) ?? 0) + 1);
    });
    previous = seen;
  },
};

export const renderCount = (name) => counts.get(name) ?? 0;
