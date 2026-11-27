import { useActionState } from 'react';

// Returns only the error, so the automatic form reset clears what the user typed.
export default function ProfileForm({ save }) {
  const [error, formAction, isPending] = useActionState(async (_previous, formData) => {
    const result = await save({ name: formData.get('name') });
    return result.error ?? null;
  }, null);

  return (
    <form action={formAction}>
      <label>
        Name
        <input name="name" />
      </label>
      <button type="submit" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save'}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
