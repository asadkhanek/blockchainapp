@echo off
echo Starting Blockchain Client...
cd /d "%~dp0client"
node ..\node_modules\react-scripts\bin\react-scripts.js start
pause
