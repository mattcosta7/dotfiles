import { useQuery } from '@tanstack/react-query';
import { getJSON } from './api.js';

export default function RepoList() {
  const { data: repos, isPending, error } = useQuery({ queryKey: ['repos'], queryFn: () => getJSON('/api/repos') });
  if (isPending) return <p>Loading repositories…</p>;
  if (error) return <p role="alert">Couldn’t load repositories</p>;
  return (
    <ul>
      {repos.map((repo) => (
        <li key={repo.id}>{repo.name}</li>
      ))}
    </ul>
  );
}
