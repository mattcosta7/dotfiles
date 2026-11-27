import { Suspense, use } from 'react';
import { fetchComments } from './api.js';

function Comments({ commentsPromise }) {
  const comments = use(commentsPromise);
  return (
    <ul>
      {comments.map((comment) => (
        <li key={comment.id}>{comment.body}</li>
      ))}
    </ul>
  );
}

// Creates the Promise during render: every parent re-render starts a new fetch.
export default function CommentList({ postId }) {
  return (
    <Suspense fallback={<p>Loading comments…</p>}>
      <Comments commentsPromise={fetchComments(postId)} />
    </Suspense>
  );
}
