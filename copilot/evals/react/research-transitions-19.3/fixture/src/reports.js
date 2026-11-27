const cache = new Map();

export function loadReport(id) {
  if (!cache.has(id)) cache.set(id, fetch(`/api/reports/${id}`).then((response) => response.json()));
  return cache.get(id);
}
