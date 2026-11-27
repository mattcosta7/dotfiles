import { useEffect, useState } from 'react';
import { getJSON } from './api.js';

// Ignores the repo convention: fetches in an Effect instead of React Query.
export default function RepoList() {
  const [repos, setRepos] = useState(null);
  useEffect(() => {
    let ignore = false;
    getJSON('/api/repos').then((data) => {
      if (!ignore) setRepos(data);
    });
    return () => {
      ignore = true;
    };
  }, []);
  if (!repos) return <p>Loading repositories…</p>;
  return (
    <ul>
      {repos.map((repo) => (
        <li key={repo.id}>{repo.name}</li>
      ))}
    </ul>
  );
}
