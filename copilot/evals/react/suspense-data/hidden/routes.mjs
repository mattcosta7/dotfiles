import { mockFetch } from './lib/dom.mjs';

export const comments = (postId) => [
  { id: `${postId}-a`, body: `First comment on post ${postId}` },
  { id: `${postId}-b`, body: `Second comment on post ${postId}` },
];

export function serve(delays = {}) {
  return mockFetch({
    '/api/posts/1/comments': { body: comments(1), delay: delays[1] ?? 20 },
    '/api/posts/2/comments': { body: comments(2), delay: delays[2] ?? 20 },
    '/api/posts/3/comments': { body: comments(3), delay: delays[3] ?? 20 },
  });
}
