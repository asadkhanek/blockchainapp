# PowerShell script to start the Blockchain app with MongoDB
Write-Host "Starting Blockchain App with MongoDB Connection..." -ForegroundColor Cyan
Write-Host "=============================================="

# Set working directory
Set-Location -Path "c:\Users\masad\OneDrive\Desktop\block chain\blockchain-app"

# Check for MongoDB Memory Server package
Write-Host "Checking for MongoDB Memory Server package..." -ForegroundColor Yellow
$packageExists = npm list --depth=0 | Select-String -Pattern "mongodb-memory-server"

if (-not $packageExists) {
    Write-Host "Installing MongoDB Memory Server..." -ForegroundColor Yellow
    npm install mongodb-memory-server --save-dev
}

# Set environment variables
$env:USE_MONGO = "true"
$env:PORT = "5000"

Write-Host "Starting server with MongoDB support..." -ForegroundColor Green
node mongodb-server.js

Read-Host -Prompt "Press Enter to exit"
