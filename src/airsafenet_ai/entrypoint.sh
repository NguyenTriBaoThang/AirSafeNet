#!/bin/sh

MODEL_PATH="/app/src/airsafenet_ai/models/airsafenet_best_model.pkl"
MODEL_URL="https://huggingface.co/nguyentribaothang/airsafenet/resolve/main/airsafenet_best_model.pkl"

echo "🔍 Checking model..."

if [ ! -f "$MODEL_PATH" ]; then
  echo "⬇️ Downloading model from HuggingFace..."
  mkdir -p /app/src/airsafenet_ai/models

  curl -L -o "$MODEL_PATH" "$MODEL_URL"

  if [ ! -f "$MODEL_PATH" ]; then
    echo "❌ Download failed!"
    exit 1
  fi

  echo "✅ Model downloaded successfully"
else
  echo "✅ Model already exists"
fi

echo "🚀 Starting FastAPI..."

exec uvicorn app.api:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers 2 \
    --log-level info \
    --access-log