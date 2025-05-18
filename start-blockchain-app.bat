@echo off
echo Starting Blockchain App Server...
echo ===============================

rem Set the location to the blockchain app directory
cd /d "c:\Users\masad\OneDrive\Desktop\block chain\blockchain-app"

rem Configure environment variables properly
set USE_MOCK_DB=true
set PORT=5000

rem Choose which server to run based on preference
rem Uncomment one of the following sections:

echo Starting minimal server...
node minimal-server.js
pause

rem echo Starting simple server...
rem node simple-server.js
rem pause

rem echo Starting development server...
rem node dev-server.js
rem pause

rem echo Starting full server with MongoDB...
rem node full-server.js
rem pause
