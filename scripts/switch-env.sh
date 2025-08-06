#!/bin/bash

# BackForge Environment Switcher
# Usage: ./scripts/switch-env.sh [development|production]

ENV=${1:-development}

if [[ "$ENV" != "development" && "$ENV" != "production" ]]; then
    echo "❌ Invalid environment. Use 'development' or 'production'"
    echo "Usage: ./scripts/switch-env.sh [development|production]"
    exit 1
fi

echo "🔄 Switching to $ENV environment..."

# Set environment variable
export NODE_ENV=$ENV

# Show current configuration
echo "📋 Current Configuration:"
echo "   Environment: $NODE_ENV"
echo "   Database: backforge_${ENV}"
echo "   Port: $(if [ "$ENV" = "development" ]; then echo "3000"; else echo "8080"; fi)"

# Test database connection
echo "🔍 Testing database connection..."
if npm run db:migrate > /dev/null 2>&1; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed"
    exit 1
fi

echo "✅ Environment switched to $ENV"
echo ""
echo "🚀 To start the server:"
echo "   Development: npm run dev"
echo "   Production:  npm start"
echo ""
echo "📊 To check database:"
echo "   psql -d backforge_${ENV} -c '\dt'" 