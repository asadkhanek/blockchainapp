@echo off
echo Starting Blockchain App with Real MongoDB Connection...
echo ==============================================

REM Set working directory
cd /d "c:\Users\masad\OneDrive\Desktop\block chain\blockchain-app"

REM Update environment variable for real MongoDB
set USE_MOCK_DB=false

REM Check if MongoDB is running
echo Checking if MongoDB is running on port 27017...
powershell -Command "if (Test-NetConnection -ComputerName localhost -Port 27017 -InformationLevel Quiet) { Write-Host 'MongoDB is running.' } else { Write-Host 'MongoDB is not running! Please start MongoDB service first.' }"

REM Set environment variables
set USE_MOCK_DB=false
set PORT=5000

echo Starting server with MongoDB support...
node server/index.js

echo.
echo If the server started successfully, you can now access it at http://localhost:5000
echo To start the client, run start-client.bat in another terminal
echo.
pause
