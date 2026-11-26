import { useQuery } from '@tanstack/react-query';
import { getJSON } from './api.js';

export default function UserBadge() {
  const { data: user, isPending, error } = useQuery({ queryKey: ['user'], queryFn: () => getJSON('/api/user') });
  if (isPending) return <span>…</span>;
  if (error) return <span role="alert">Couldn’t load your profile</span>;
  return <span>{user.login}</span>;
}
