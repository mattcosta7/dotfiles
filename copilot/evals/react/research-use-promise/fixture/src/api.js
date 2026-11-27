export async function fetchComments(postId) {
  const response = await fetch(`/api/posts/${postId}/comments`);
  return response.json();
}
