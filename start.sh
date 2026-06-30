#!/bin/bash
set -e

APP_PORT="${PORT:-5000}"

# Free port if something is already using it
fuser -k "${APP_PORT}/tcp" 2>/dev/null || true

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
