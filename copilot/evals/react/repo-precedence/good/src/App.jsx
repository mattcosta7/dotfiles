import RepoList from './RepoList.jsx';
import UserBadge from './UserBadge.jsx';

export default function App() {
  return (
    <main>
      <header>
        <h1>Dashboard</h1>
        <UserBadge />
      </header>
      <RepoList />
    </main>
  );
}
