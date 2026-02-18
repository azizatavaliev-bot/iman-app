#!/bin/bash

# IMAN App - Migration to PostgreSQL Script
# This script migrates from SQLite to PostgreSQL (Supabase)

set -e

echo "🚀 IMAN App - Migration to PostgreSQL"
echo "======================================"
echo ""

# Check if DATABASE_URL is provided
if [ -z "$1" ]; then
  echo "❌ Error: DATABASE_URL not provided"
  echo ""
  echo "Usage: ./migrate-to-postgres.sh <DATABASE_URL>"
  echo ""
  echo "Example:"
  echo "./migrate-to-postgres.sh 'postgresql://postgres:password@db.xxx.supabase.co:5432/postgres'"
  echo ""
  exit 1
fi

DATABASE_URL="$1"

echo "📦 Step 1: Install pg package..."
export PATH="/Users/zaindynuuludavlyat1/Library/Application Support/Zed/node/node-v24.11.0-darwin-arm64/bin:$PATH"
npm install pg@^8.13.1

echo ""
echo "📝 Step 2: Update package.json (remove better-sqlite3)..."
npm uninstall better-sqlite3

echo ""
echo "✅ Dependencies updated!"
echo ""
echo "📋 Next steps:"
echo "1. Set DATABASE_URL in Railway:"
echo "   Railway Dashboard → Variables → Add:"
echo "   Name: DATABASE_URL"
echo "   Value: $DATABASE_URL"
echo ""
echo "2. I will update server.js to use PostgreSQL"
echo ""
echo "Ready to proceed!"
