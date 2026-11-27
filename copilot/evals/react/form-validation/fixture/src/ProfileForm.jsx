import { useState } from 'react';

// save({ name }) resolves to { error: string } when the server rejects the name, otherwise { ok: true }.
export default function ProfileForm({ save }) {
  const [name, setName] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsPending(true);
    setError(null);
    const result = await save({ name });
    setIsPending(false);
    if (result.error) setError(result.error);
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Name
        <input name="name" value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <button type="submit" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save'}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
