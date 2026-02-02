#!/bin/bash

echo "🚀 Clover Analytics Dashboard - Quick Vercel Deployment"
echo "=================================================="
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

echo "🔑 Vercel login required..."
vercel login

echo "📂 Deploying dashboard..."
vercel

echo ""
echo "🔧 Setting up environment variables..."
echo "Please paste the OAuth client JSON when prompted:"

# Read OAuth client from file and set as environment variable
echo "Setting CLOVER_OAUTH_CLIENT..."
OAUTH_CLIENT_JSON=$(cat clover-oauth-client.json)
echo "$OAUTH_CLIENT_JSON" | vercel env add CLOVER_OAUTH_CLIENT production

echo "Setting CLOVER_OAUTH_TOKEN..."
OAUTH_TOKEN_JSON=$(cat clover-oauth-token.json)
echo "$OAUTH_TOKEN_JSON" | vercel env add CLOVER_OAUTH_TOKEN production

echo ""
echo "🚀 Deploying to production..."
vercel --prod

echo ""
echo "✅ Deployment complete!"
echo "🌐 Your dashboard is now live!"
echo "📊 Access it at the URL shown above"
echo ""
echo "Features available:"
echo "✅ Real-time GA4 analytics"
echo "✅ Search Console data"
echo "✅ Side-by-side comparison"
echo "✅ Auto-refresh every 5 minutes"
echo "✅ Mobile responsive design"
echo ""
echo "🎉 Your Clover Analytics Dashboard is ready!"