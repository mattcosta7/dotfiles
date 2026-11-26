import { useActionState } from 'react';

// save({ name }) resolves to { error: string } when the server rejects the name, otherwise { ok: true }.
export default function ProfileForm({ save }) {
  const [state, formAction, isPending] = useActionState(
    async (_previous, formData) => {
      const name = formData.get('name');
      const result = await save({ name });
      // The form resets after the Action, so return the submitted value for defaultValue.
      return result.error ? { error: result.error, name } : { error: null, name: '' };
    },
    { error: null, name: '' },
  );

  return (
    <form action={formAction}>
      <label>
        Name
        <input name="name" defaultValue={state.name} />
      </label>
      <button type="submit" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save'}
      </button>
      {state.error && <p role="alert">{state.error}</p>}
    </form>
  );
}
