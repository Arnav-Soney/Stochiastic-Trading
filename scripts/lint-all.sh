#!/bin/bash

echo "🔍 Running Frontend Linters..."
echo "================================"

# Frontend
echo "📦 Installing frontend dependencies..."
pnpm install

echo "🎨 Running ESLint..."
pnpm lint || echo "⚠️ ESLint found issues"

echo "📘 Running TypeScript check..."
pnpm exec tsc --noEmit || echo "⚠️ TypeScript found issues"

echo ""
echo "🐍 Running Backend Linters..."
echo "================================"

# Backend
cd server

echo "📦 Installing Python dependencies..."
pip install -r requirements.txt || echo "⚠️ Some dependencies may be optional"

echo "🎨 Running Black formatter..."
black . || echo "⚠️ Black found formatting issues"

echo "📦 Running isort..."
isort . || echo "⚠️ isort found import sorting issues"

echo "🔍 Running Flake8..."
flake8 . --count --max-complexity=10 --max-line-length=127 --statistics || echo "⚠️ Flake8 found issues"

echo "🔬 Running Pylint..."
pylint . --exit-zero --max-line-length=127 --disable=C0111,C0103,R0913,R0914 || echo "⚠️ Pylint found issues"

echo "🎯 Running MyPy..."
mypy . --ignore-missing-imports || echo "⚠️ MyPy found type issues"

cd ..

echo ""
echo "✅ Linting complete!"
echo ""
echo "To auto-fix formatting issues, run:"
echo "  black server/"
echo "  isort server/"
