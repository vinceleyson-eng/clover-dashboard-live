#!/bin/bash

# Set up Vercel environment variables for Clover Dashboard
echo "Setting up Vercel environment variables..."

# Read OAuth credentials
OAUTH_CLIENT=$(cat clover-oauth-client.json | tr -d '\n')
OAUTH_TOKEN=$(cat clover-oauth-token.json | tr -d '\n')

# Set environment variables in Vercel
vercel env add CLOVER_OAUTH_CLIENT "$OAUTH_CLIENT" production
vercel env add CLOVER_OAUTH_CLIENT "$OAUTH_CLIENT" preview
vercel env add CLOVER_OAUTH_CLIENT "$OAUTH_CLIENT" development

vercel env add CLOVER_OAUTH_TOKEN "$OAUTH_TOKEN" production
vercel env add CLOVER_OAUTH_TOKEN "$OAUTH_TOKEN" preview
vercel env add CLOVER_OAUTH_TOKEN "$OAUTH_TOKEN" development

echo "✅ Environment variables configured!"
echo "🚀 Ready to deploy: vercel --prod"