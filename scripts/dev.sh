#!/bin/bash

set -e

echo "🚀 Starting AI Daily Copilot..."

# ============================================================
# ROOT NODE DEPENDENCIES
# ============================================================

if [ ! -d "node_modules" ]; then
  echo "📦 Installing root dependencies..."
  npm install
else
  echo "✅ Root dependencies already installed."
fi


# ============================================================
# WEB DEPENDENCIES
# ============================================================

if [ ! -d "web/node_modules" ]; then
  echo "📦 Installing web dependencies..."
  npm --prefix web install
else
  echo "✅ Web dependencies already installed."
fi


# ============================================================
# PYTHON DEPENDENCIES
# ============================================================

echo "🐍 Checking Python dependencies..."

python -m pip install \
  -r ai-service/requirements.txt \
  --quiet

echo "✅ Python dependencies ready."


# ============================================================
# SUPABASE
# ============================================================

echo "🗄️ Checking Supabase..."

if supabase status >/dev/null 2>&1; then
  echo "✅ Supabase already running."
else
  echo "▶️ Starting Supabase..."
  supabase start
fi


# ============================================================
# NEXT.JS + FASTAPI
# ============================================================

echo "🌐 Starting Next.js and FastAPI..."

npx concurrently \
  "npm --prefix web run dev" \
  "cd ai-service && python -m uvicorn app.main:app --reload --port 8000"