#!/bin/bash
set -e
echo "🔄 Running database migrations..."
npx drizzle-kit migrate
echo "✅ Migrations complete"
