#!/bin/bash
set -e

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
