import { useState } from 'react';
import CommentList from './CommentList.jsx';

const posts = [
  { id: 1, title: 'Release notes' },
  { id: 2, title: 'Roadmap' },
  { id: 3, title: 'Team update' },
];

export default function App() {
  const [query, setQuery] = useState('');
  const [postId, setPostId] = useState(1);
  const visible = posts.filter((post) => post.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <main>
      <input aria-label="Search posts" value={query} onChange={(event) => setQuery(event.target.value)} />
      <select aria-label="Post" value={postId} onChange={(event) => setPostId(Number(event.target.value))}>
        {posts.map((post) => (
          <option key={post.id} value={post.id} disabled={!visible.includes(post)}>
            {post.title}
          </option>
        ))}
      </select>
      <CommentList postId={postId} />
    </main>
  );
}
