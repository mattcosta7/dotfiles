import { Suspense, use } from 'react';
import { getComments } from './api.js';

function Comments({ postId }) {
  const comments = use(getComments(postId));
  return (
    <ul>
      {comments.map((comment) => (
        <li key={comment.id}>{comment.body}</li>
      ))}
    </ul>
  );
}

export default function CommentList({ postId }) {
  return (
    <Suspense fallback={<p>Loading comments…</p>}>
      <Comments postId={postId} />
    </Suspense>
  );
}
