export async function fetchComments(postId) {
  const response = await fetch(`/api/posts/${postId}/comments`);
  if (!response.ok) throw new Error(`Failed to load comments for post ${postId}`);
  return response.json();
}

// use() needs the same Promise across renders, so cache one per post.
const cache = new Map();
export function getComments(postId) {
  if (!cache.has(postId)) cache.set(postId, fetchComments(postId));
  return cache.get(postId);
}
