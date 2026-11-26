import { Suspense, use } from 'react';
import { fetchComments } from './api.js';

function CommentList({ postId }) {
  const comments = use(fetchComments(postId));
  return <ul>{comments.map((c) => <li key={c.id}>{c.body}</li>)}</ul>;
}

export default function Comments({ postId }) {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <CommentList postId={postId} />
    </Suspense>
  );
}
