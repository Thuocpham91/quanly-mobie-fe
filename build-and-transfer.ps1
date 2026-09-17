# ==============================================================================
# Build Docker Image, Transfer to Remote Server, and Auto-Start Container
# Project: quanly-mobie-fe-service
# ==============================================================================

param (
    [string]$ImageName     = "quanly-mobie-fe-service",
    [string]$Tag           = "latest",
    [string]$ServerHost    = "103.72.97.86",
    [string]$ServerUser    = "root",
    [int]   $ServerPort    = 24700,
    [string]$ServerPath    = "/root/quanly-mobie/quanly-mobie-fe-service",
    [string]$ContainerName = "quanly-mobie-fe-service",
    [string]$EnvFile       = ".env"
)

# Set encoding to UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  🚀 FRONTEND: BUILD -> TRANSFER -> DEPLOY" -ForegroundColor Cyan
Write-Host "  Server      : $ServerUser@$ServerHost`:$ServerPort" -ForegroundColor Cyan
Write-Host "  Remote Path : $ServerPath" -ForegroundColor Cyan
Write-Host "  Image       : $ImageName`:$Tag" -ForegroundColor Cyan
Write-Host "  Container   : $ContainerName" -ForegroundColor Cyan
Write-Host "  Env File    : $EnvFile" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# ─────────────────────────────────────────────────────────────
# STEP 1: Check Docker Daemon
# ─────────────────────────────────────────────────────────────
Write-Host "`n[1/6] Checking local Docker daemon..." -ForegroundColor Yellow
docker info > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker is not running. Please start Docker Desktop first!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker daemon is running normally." -ForegroundColor Green

# ─────────────────────────────────────────────────────────────
# STEP 2: Read configuration from .env file
# ─────────────────────────────────────────────────────────────
Write-Host "`n[2/6] Reading environment variables from '$EnvFile'..." -ForegroundColor Yellow
$ViteApiUrl = "https://apimobie.chuyendoisovn.com.vn/api/v1"
$VirtualHost = "mobie.chuyendoisovn.com.vn"

if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        $line = $_.Trim()
        if (-not $line.StartsWith("#") -and $line -match "^VITE_API_URL=(.+)$") {
            $ViteApiUrl = $matches[1].Trim()
        }
        if (-not $line.StartsWith("#") -and $line -match "^VIRTUAL_HOST=(.+)$") {
            $VirtualHost = $matches[1].Trim()
        }
    }
    Write-Host "   -> VITE_API_URL: $ViteApiUrl" -ForegroundColor Cyan
    Write-Host "   -> VIRTUAL_HOST: $VirtualHost" -ForegroundColor Cyan
} else {
    Write-Host "⚠️ '$EnvFile' not found, using default URL: $ViteApiUrl" -ForegroundColor Yellow
}

# ─────────────────────────────────────────────────────────────
# STEP 3: Build Docker Image (platform linux/amd64)
# ─────────────────────────────────────────────────────────────
$FullImage = "$ImageName`:$Tag"
Write-Host "`n[3/6] Building Docker image '$FullImage' (platform: linux/amd64)..." -ForegroundColor Yellow
Write-Host "   (This process may take 1-3 minutes depending on dependencies)" -ForegroundColor Gray

docker build --platform linux/amd64 `
    --build-arg "VITE_API_URL=$ViteApiUrl" `
    -t $FullImage .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker build failed! Please check the errors above." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Built image '$FullImage' successfully!" -ForegroundColor Green

# ─────────────────────────────────────────────────────────────
# STEP 4: Export Docker Image to .tar file
# ─────────────────────────────────────────────────────────────
$TarFile = "$ImageName.tar"
Write-Host "`n[4/6] Exporting Docker image to file '$TarFile'..." -ForegroundColor Yellow

if (Test-Path $TarFile) {
    Remove-Item -Force $TarFile -ErrorAction SilentlyContinue
}

docker save -o $TarFile $FullImage
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $TarFile)) {
    Write-Host "❌ Failed to save .tar file!" -ForegroundColor Red
    exit 1
}

$TarSizeMB = [math]::Round((Get-Item $TarFile).Length / 1MB, 2)
Write-Host "✅ Saved '$TarFile' ($TarSizeMB MB)." -ForegroundColor Green

# ─────────────────────────────────────────────────────────────
# STEP 5: Create remote directory & Upload files to Server via SCP
# ─────────────────────────────────────────────────────────────
Write-Host "`n[5/6] Uploading files to server $ServerHost`:$ServerPort..." -ForegroundColor Yellow
Write-Host "   -> Ensuring directory '$ServerPath' exists on server..." -ForegroundColor Gray

ssh -p $ServerPort -o StrictHostKeyChecking=no "$ServerUser@$ServerHost" "mkdir -p $ServerPath"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to connect via SSH. Please check IP/Port/Password." -ForegroundColor Red
    Remove-Item -Force $TarFile -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "   -> Uploading '$TarFile' (retry up to 3 times if connection drops)..." -ForegroundColor Gray
$uploadSuccess = $false
for ($attempt = 1; $attempt -le 3; $attempt++) {
    if ($attempt -gt 1) {
        Write-Host "   [Attempt $attempt/3] Retrying upload..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
    }
    scp -P $ServerPort `
        -o StrictHostKeyChecking=no `
        -o ConnectTimeout=60 `
        -o ServerAliveInterval=30 `
        -o ServerAliveCountMax=6 `
        $TarFile "$ServerUser@$ServerHost`:$ServerPath/"
    if ($LASTEXITCODE -eq 0) {
        $uploadSuccess = $true
        break
    }
    Write-Host "   ⚠️ Upload attempt $attempt failed." -ForegroundColor Yellow
}
if (-not $uploadSuccess) {
    Write-Host "❌ Failed to upload '$TarFile' after 3 attempts!" -ForegroundColor Red
    Remove-Item -Force $TarFile -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "   -> Uploading 'docker-compose.yml'..." -ForegroundColor Gray
scp -P $ServerPort -o StrictHostKeyChecking=no docker-compose.yml "$ServerUser@$ServerHost`:$ServerPath/"

if (Test-Path $EnvFile) {
    Write-Host "   -> Uploading '$EnvFile' as '.env'..." -ForegroundColor Gray
    scp -P $ServerPort -o StrictHostKeyChecking=no $EnvFile "$ServerUser@$ServerHost`:$ServerPath/.env"
}

Write-Host "✅ All files uploaded to server successfully!" -ForegroundColor Green

# Remove local .tar file to free up space
Remove-Item -Force $TarFile -ErrorAction SilentlyContinue
Write-Host "🧹 Deleted local file '$TarFile'." -ForegroundColor Gray

# ─────────────────────────────────────────────────────────────
# STEP 6: Load Image & Run Container on Server
# ─────────────────────────────────────────────────────────────
Write-Host "`n[6/6] Starting container on server..." -ForegroundColor Yellow

$RemoteCommands = @"
echo '==> 1. Loading Docker image into Docker daemon...'
docker load -i $ServerPath/$TarFile
rm -f $ServerPath/$TarFile

echo '==> 2. Checking Docker network gasy-network...'
docker network inspect gasy-network >/dev/null 2>&1 || docker network create gasy-network

echo '==> 3. Restarting service with Docker Compose...'
cd $ServerPath
docker compose down 2>/dev/null || true
docker compose up -d --force-recreate

echo '==> 4. Current container status:'
docker ps --filter "name=$ContainerName"
"@

ssh -p $ServerPort -o StrictHostKeyChecking=no "$ServerUser@$ServerHost" $RemoteCommands

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host " 🎉 FRONTEND DEPLOYMENT COMPLETED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host " 🌐 Domain access : https://$VirtualHost" -ForegroundColor Cyan
    Write-Host " 🌐 Or Direct IP  : http://$ServerHost`:3011" -ForegroundColor Cyan
    Write-Host "==================================================" -ForegroundColor Green
} else {
    Write-Host "⚠️ There were warnings during server execution. Please check the logs." -ForegroundColor Yellow
}
