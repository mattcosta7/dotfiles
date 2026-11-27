export async function updateSettings(formData) {
  const name = String(formData.get('displayName') ?? '').trim();
  if (name.length < 3) return { error: 'Display name must be at least 3 characters' };
  const response = await fetch('/api/settings', { method: 'POST', body: formData });
  return response.ok ? { ok: true } : { error: 'Could not save settings' };
}
