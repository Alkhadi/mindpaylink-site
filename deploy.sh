#!/usr/bin/env zsh
set -euo pipefail

# Simple deploy: commit (if needed) -> push main -> configure Pages -> open site
# Usage: ./deploy.sh [commit message]

REPO_DIR=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
REMOTE_URL="https://github.com/Alkhadi/m-share-site.git"
BRANCH="main"
MSG=${1:-"Deploy: site updates"}

cd "$REPO_DIR"

# Ensure git repo and remote
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git init
fi
git symbolic-ref -q HEAD >/dev/null 2>&1 || git checkout -B "$BRANCH"
git branch --show-current | grep -q "^$BRANCH$" || git checkout -B "$BRANCH"

if git remote get-url origin >/dev/null 2>&1; then
  :
else
  git remote add origin "$REMOTE_URL"
fi

# Basics for GitHub Pages
touch .nojekyll || true
if [ ! -f CNAME ]; then
  echo "www.mindpaylink.com" > CNAME
fi

# Commit if anything changed
git add -A
if ! git diff --cached --quiet --ignore-submodules --; then
  git commit -m "$MSG"
fi

# Push main
git push -u origin "$BRANCH"

# Configure GitHub Pages (requires gh)
if command -v gh >/dev/null 2>&1; then
  gh repo set-default Alkhadi/m-share-site >/dev/null 2>&1 || true
  gh api --silent -X PUT repos/Alkhadi/m-share-site/pages --input - <<'JSON' >/dev/null 2>&1 || true
{"source":{"branch":"main","path":"/"},"cname":"www.mindpaylink.com"}
JSON
fi

# Open the site
open https://www.mindpaylink.com >/dev/null 2>&1 || true
