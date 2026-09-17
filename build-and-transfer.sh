#!/usr/bin/env bash
# ==============================================================================
# Build Docker Image, Transfer to Remote Server, and Auto-Start Container
# Project: quanly-mobie-fe-service
# ==============================================================================

set -e

IMAGE_NAME="${IMAGE_NAME:-quanly-mobie-fe-service}"
TAG="${TAG:-latest}"
SERVER_HOST="${SERVER_HOST:-103.72.97.86}"
SERVER_USER="${SERVER_USER:-root}"
SERVER_PORT="${SERVER_PORT:-24700}"
SERVER_PATH="${SERVER_PATH:-/root/quanly-mobie/quanly-mobie-fe-service}"
CONTAINER_NAME="${CONTAINER_NAME:-quanly-mobie-fe-service}"
ENV_FILE="${ENV_FILE:-.env}"

echo "=================================================="
echo "  🚀 FRONTEND: BUILD -> TRANSFER -> DEPLOY"
echo "  Server      : $SERVER_USER@$SERVER_HOST:$SERVER_PORT"
echo "  Remote Path : $SERVER_PATH"
echo "  Image       : $IMAGE_NAME:$TAG"
echo "  Container   : $CONTAINER_NAME"
echo "  Env File    : $ENV_FILE"
echo "=================================================="

# 1. Check Docker
echo -e "\n[1/6] Checking local Docker daemon..."
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first!"
    exit 1
fi
echo "✅ Docker daemon is running normally."

# 2. Extract Variables from .env
VITE_API_URL="https://apimobie.chuyendoisovn.com.vn/api/v1"
VIRTUAL_HOST="mobie.chuyendoisovn.com.vn"

if [ -f "$ENV_FILE" ]; then
    EXTRACTED_URL=$(grep -E "^VITE_API_URL=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '\r' || true)
    if [ -n "$EXTRACTED_URL" ]; then
        VITE_API_URL="$EXTRACTED_URL"
    fi
    EXTRACTED_HOST=$(grep -E "^VIRTUAL_HOST=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '\r' || true)
    if [ -n "$EXTRACTED_HOST" ]; then
        VIRTUAL_HOST="$EXTRACTED_HOST"
    fi
fi
echo -e "\n[2/6] Using VITE_API_URL: $VITE_API_URL"
echo "      Using VIRTUAL_HOST: $VIRTUAL_HOST"

# 3. Build Docker image
FULL_IMAGE="$IMAGE_NAME:$TAG"
echo -e "\n[3/6] Building Docker image '$FULL_IMAGE' (linux/amd64)..."
docker build --platform linux/amd64 \
    --build-arg "VITE_API_URL=$VITE_API_URL" \
    -t "$FULL_IMAGE" .

# 4. Save to tar
TAR_FILE="$IMAGE_NAME.tar"
echo -e "\n[4/6] Exporting Docker image to file '$TAR_FILE'..."
rm -f "$TAR_FILE"
docker save -o "$TAR_FILE" "$FULL_IMAGE"

# 5. Upload to Server
echo -e "\n[5/6] Uploading files to server via SCP..."
ssh -p "$SERVER_PORT" -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "mkdir -p $SERVER_PATH"
scp -P "$SERVER_PORT" -o StrictHostKeyChecking=no "$TAR_FILE" "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/"
scp -P "$SERVER_PORT" -o StrictHostKeyChecking=no docker-compose.yml "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/"
if [ -f "$ENV_FILE" ]; then
    scp -P "$SERVER_PORT" -o StrictHostKeyChecking=no "$ENV_FILE" "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/.env"
fi

rm -f "$TAR_FILE"
echo "🧹 Deleted local file '$TAR_FILE'."

# 6. Run on Server
echo -e "\n[6/6] Starting container on server..."
ssh -p "$SERVER_PORT" -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" bash <<EOF
echo '==> 1. Loading Docker image...'
docker load -i $SERVER_PATH/$TAR_FILE
rm -f $SERVER_PATH/$TAR_FILE

echo '==> 2. Ensuring gasy-network exists...'
docker network inspect gasy-network >/dev/null 2>&1 || docker network create gasy-network

echo '==> 3. Restarting service with Docker Compose...'
cd $SERVER_PATH
docker compose down 2>/dev/null || true
docker compose up -d --force-recreate

echo '==> 4. Checking container status:'
docker ps --filter "name=$CONTAINER_NAME"
EOF

echo ""
echo "=================================================="
echo " 🎉 FRONTEND DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo " 🌐 Domain access : https://$VIRTUAL_HOST"
echo " 🌐 Or Direct IP  : http://$SERVER_HOST:3011"
echo "=================================================="
