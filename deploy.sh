#!/bin/bash
# EDGE — One-command deploy to Google Cloud Run
# Usage: ./deploy.sh YOUR_GCP_PROJECT_ID YOUR_GEMINI_API_KEY

set -e

PROJECT_ID=${1:-"your-project-id"}
GEMINI_KEY=${2:-"your-gemini-key"}
REGION="us-central1"
SERVICE_NAME="edge-backend"
IMAGE="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "🚀 Deploying EDGE to Google Cloud Run..."
echo "Project: $PROJECT_ID | Region: $REGION"

# Build and push Docker image
echo "📦 Building Docker image..."
cd backend
gcloud builds submit --tag "$IMAGE" --project "$PROJECT_ID"

# Deploy to Cloud Run
echo "☁️  Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE" \
  --platform managed \
  --region "$REGION" \
  --allow-unauthenticated \
  --set-env-vars "GEMINI_API_KEY=$GEMINI_KEY,GOOGLE_CLOUD_PROJECT=$PROJECT_ID" \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 5 \
  --port 8080 \
  --project "$PROJECT_ID"

echo "✅ Backend deployed!"
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --platform managed \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --format "value(status.url)")

echo "🔗 Backend URL: $SERVICE_URL"
echo ""
echo "Next: Set NEXT_PUBLIC_WS_URL=${SERVICE_URL/https/wss} in your frontend .env"
