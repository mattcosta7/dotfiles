export async function fetchComments(postId) {
  const response = await fetch(`/api/posts/${postId}/comments`);
  if (!response.ok) throw new Error(`Failed to load comments for post ${postId}`);
  return response.json();
}
