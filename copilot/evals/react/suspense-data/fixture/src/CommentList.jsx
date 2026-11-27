import { useEffect, useState } from 'react';
import { fetchComments } from './api.js';

export default function CommentList({ postId }) {
  const [result, setResult] = useState({ postId: null, comments: [] });

  useEffect(() => {
    fetchComments(postId).then((comments) => setResult({ postId, comments }));
  }, [postId]);

  if (result.postId !== postId) return <p>Loading comments…</p>;
  return (
    <ul>
      {result.comments.map((comment) => (
        <li key={comment.id}>{comment.body}</li>
      ))}
    </ul>
  );
}
