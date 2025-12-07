#!/bin/bash
# Railway専用のビルドスクリプト
# Dockerfileを一時的に削除してNixpacksを強制使用

echo "🚀 Railway build script starting..."
echo "📦 Removing Dockerfiles to force Nixpacks..."

# Dockerfileを削除
rm -f Dockerfile Dockerfile.prod

echo "✅ Dockerfiles removed"
echo "🔧 Starting Nixpacks build..."
