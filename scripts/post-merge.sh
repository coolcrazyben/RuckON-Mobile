#!/bin/bash
set -e

echo "Installing dependencies..."
npm install --prefer-offline --no-audit --no-fund < /dev/null

echo "Pushing database schema..."
npm run db:push < /dev/null || true

echo "Post-merge setup complete."
