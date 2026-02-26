#!/bin/bash
set -euo pipefail

echo "🔒 Building Secure PR Review Action..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/
rm -rf node_modules/

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --ignore-scripts

# Run linting
echo "🔍 Running linting..."
npm run lint

# Run type checking
echo "🔍 Running type checking..."
npm run typecheck

# Run tests
echo "🧪 Running tests..."
npm test

# Build the action
echo "🏗️ Building the action..."
npm run build

# Create distribution package
echo "📦 Creating distribution package..."
tar -czf secure-pr-review-action.tar.gz \
  --exclude='node_modules' \
  --exclude='src' \
  --exclude='*.test.ts' \
  --exclude='__tests__' \
  --exclude='.git' \
  --exclude='*.log' \
  action.yml \
  package.json \
  dist/ \
  README.md \
  LICENSE

echo "✅ Build completed successfully!"
echo "📦 Distribution package: secure-pr-review-action.tar.gz"
echo "🔒 Security-first, production-ready!"