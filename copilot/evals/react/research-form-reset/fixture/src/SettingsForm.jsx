import { useActionState } from 'react';
import { updateSettings } from './api.js';

export default function SettingsForm() {
  const [error, formAction] = useActionState(async (_previous, formData) => {
    const result = await updateSettings(formData);
    return result.error ?? null;
  }, null);
  return (
    <form action={formAction}>
      <input name="displayName" />
      <button type="submit">Save</button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
