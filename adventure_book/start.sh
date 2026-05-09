#!/usr/bin/env bash
# Launches the Adventure Book app: installs deps if missing, starts Vite,
# and opens the GitHub Pages subpath used in local development.

set -e
cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  echo "First run: installing dependencies (one-time, about 30s)..."
  npm install
fi

echo "Starting Our Adventure Book..."
echo "   Press Ctrl+C to stop."
echo

# Open the browser shortly after Vite is ready.
( sleep 2 && open http://localhost:5173/public_lumber/adventure_book/ >/dev/null 2>&1 ) &

exec npm run dev
