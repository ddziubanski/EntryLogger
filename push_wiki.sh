#!/usr/bin/env bash
# push_wiki.sh — Push docs/wiki/ pages to the GitHub Wiki for this repo.
#
# PREREQUISITE: You must initialize the wiki on GitHub first:
#   1. Go to https://github.com/ddziubanski/EntryLogger/wiki
#   2. Click "Create the first page" and save (content doesn't matter).
#   3. Then run this script.
set -euo pipefail

REPO="https://github.com/ddziubanski/EntryLogger.wiki.git"
WIKI_SRC="$(cd "$(dirname "$0")/docs/wiki" && pwd)"
WIKI_CLONE="/tmp/entrylogger-wiki-push-$$"

[[ -d "$WIKI_SRC" ]] || { echo "Error: $WIKI_SRC not found."; exit 1; }

echo "Cloning wiki repo..."
git clone "$REPO" "$WIKI_CLONE"

echo "Copying wiki pages..."
cp "$WIKI_SRC"/*.md "$WIKI_CLONE"/

cd "$WIKI_CLONE"
git add .
if git diff --cached --quiet; then
  echo "Nothing to push — wiki is already up to date."
else
  git commit -m "Update wiki from docs/wiki/"
  git push
  echo "Wiki pushed successfully."
fi

rm -rf "$WIKI_CLONE"
