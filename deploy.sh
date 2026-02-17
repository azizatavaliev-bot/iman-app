#!/bin/bash
# IMAN App - Railway Deployment Script

set -e  # Exit on any error

echo "========================================="
echo "IMAN App - Deploying to Railway"
echo "========================================="
echo ""

# Set Node.js path
export PATH="/Users/zaindynuuludavlyat1/Library/Application Support/Zed/node/node-v24.11.0-darwin-arm64/bin:$PATH"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Not in iman-app directory"
  exit 1
fi

echo "📦 Step 1: Installing dependencies..."
npm install

echo ""
echo "🔨 Step 2: Building production bundle..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build failed!"
  exit 1
fi

echo ""
echo "✅ Build successful!"
echo ""
echo "📤 Step 3: Deploying to Railway..."
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
  echo "⚠️  Railway CLI not found."
  echo ""
  echo "To deploy manually:"
  echo "1. Commit changes: git add . && git commit -m 'Fix: Improved audio unlock UX'"
  echo "2. Push to GitHub: git push origin main"
  echo "3. Railway will auto-deploy if connected to GitHub"
  echo ""
  echo "Or install Railway CLI:"
  echo "npm i -g @railway/cli"
  echo "railway login"
  echo "railway link"
  echo "railway up"
  exit 0
fi

# Deploy using Railway CLI
railway up

echo ""
echo "========================================="
echo "✅ Deployment complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Test on iOS Telegram Mini App"
echo "2. Verify audio unlock overlay appears"
echo "3. Confirm auto-play of Al-Fatiha works"
echo ""
