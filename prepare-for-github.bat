@echo off
echo Preparing Blockchain App for GitHub...
cd /d "%~dp0"
node prepare-for-github.js
pause
