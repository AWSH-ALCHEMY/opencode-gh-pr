#!/bin/bash
set -euo pipefail

echo "🚀 Releasing Secure PR Review Action..."

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")

# Validate version
if [ -z "$VERSION" ]; then
  echo "❌ Version not found in package.json" >&2
  exit 1
fi

echo "📦 Version: $VERSION"

# Run build script
echo "🏗️ Running build script..."
./build.sh

# Create Git tag
echo "🏷️ Creating Git tag v$VERSION..."
git tag -a "v$VERSION" -m "Release v$VERSION"
git push origin "v$VERSION"

# Create GitHub release
echo "🚀 Creating GitHub release..."
gh release create "v$VERSION" \
  --title "Release v$VERSION" \
  --notes "Security-focused release with enhanced protection and new features." \
  --target "main" \
  secure-pr-review-action.tar.gz

echo "✅ Release v$VERSION completed successfully!"