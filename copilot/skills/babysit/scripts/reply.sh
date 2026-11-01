#!/usr/bin/env bash
# Replies to a PR review comment. The reply text comes from a file so it is never part of a shell command.
# Usage: reply.sh OWNER/REPO PR_NUMBER COMMENT_DATABASE_ID BODY_FILE
set -euo pipefail

if [ "$#" -ne 4 ]; then
  echo "Usage: reply.sh OWNER/REPO PR_NUMBER COMMENT_DATABASE_ID BODY_FILE" >&2
  exit 2
fi
repo="$1"; pr="$2"; comment="$3"; body_file="$4"

[[ "$pr" =~ ^[0-9]+$ && "$comment" =~ ^[0-9]+$ ]] || { echo "PR and comment id must be numbers." >&2; exit 2; }
[[ "$repo" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]] || { echo "Repo must be OWNER/REPO." >&2; exit 2; }
[ -s "$body_file" ] || { echo "Body file is missing or empty: $body_file" >&2; exit 2; }

gh api --method POST "repos/$repo/pulls/$pr/comments/$comment/replies" \
  -F body=@"$body_file" --jq .html_url
