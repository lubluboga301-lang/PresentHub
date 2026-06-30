#!/bin/bash
set -e

# Free port 5000 if something is already using it
fuser -k 5000/tcp 2>/dev/null || true

echo "📦 Installing dependencies..."
npm install --silent

echo "📦 Installing client dependencies..."
cd client && npm install --include=dev --silent
cd ..

echo "🔨 Building Mini App..."
cd client && node_modules/.bin/vite build
cd ..

echo "🚀 Starting server..."
node server/index.js
