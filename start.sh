#!/bin/bash
set -e

echo "📦 Installing server dependencies..."
cd server && npm install --silent
cd ..

echo "📦 Installing client dependencies..."
cd client && npm install --include=dev --silent
cd ..

echo "🔨 Building Mini App..."
cd client && node_modules/.bin/vite build
cd ..

echo "🚀 Starting server..."
node server/index.js
