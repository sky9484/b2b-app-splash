# Splash Startup Script for Windows

Write-Host "🚀 Starting Splash..." -ForegroundColor Cyan

# Check if Docker is running
Write-Host "`n📦 Checking Docker..." -ForegroundColor Yellow
$dockerRunning = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    Write-Host "   Download from: https://www.docker.com/products/docker-desktop" -ForegroundColor Gray
    exit 1
}

# Start MongoDB
Write-Host "✓ Docker is running" -ForegroundColor Green
Write-Host "`n🗄️  Starting MongoDB..." -ForegroundColor Yellow
docker-compose up -d mongodb
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start MongoDB" -ForegroundColor Red
    exit 1
}

# Wait for MongoDB to be ready
Write-Host "⏳ Waiting for MongoDB to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check MongoDB health
$mongoReady = docker exec splash-mongodb mongosh --eval "db.runCommand('ping').ok" --quiet 2>&1
if ($mongoReady -match "1") {
    Write-Host "✓ MongoDB is ready" -ForegroundColor Green
} else {
    Write-Host "⚠️  MongoDB might not be fully ready yet, but continuing..." -ForegroundColor Yellow
}

# Start Backend
Write-Host "`n🔧 Starting Backend (FastAPI)..." -ForegroundColor Yellow
Write-Host "   Backend will run at: http://localhost:8001" -ForegroundColor Gray
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; uvicorn server:app --reload --port 8001"

# Wait a bit for backend to start
Start-Sleep -Seconds 3

# Start Frontend
Write-Host "`n⚛️  Starting Frontend (React)..." -ForegroundColor Yellow
Write-Host "   Frontend will run at: http://localhost:3000" -ForegroundColor Gray
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm start"

Write-Host "`n✅ All services starting!" -ForegroundColor Green
Write-Host "`n📝 Login credentials:" -ForegroundColor Cyan
Write-Host "   Email: admin@splash.com" -ForegroundColor White
Write-Host "   Password: Splash@2026" -ForegroundColor White
Write-Host "`n🌐 Open: http://localhost:3000" -ForegroundColor Cyan
Write-Host "`nPress Ctrl+C to stop this script (services will keep running)" -ForegroundColor Gray
Write-Host "To stop all services: docker-compose down" -ForegroundColor Gray

# Keep script running
while ($true) {
    Start-Sleep -Seconds 60
}
