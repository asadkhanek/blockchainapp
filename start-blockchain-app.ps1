# Improved PowerShell script to start the blockchain app
Write-Host "Starting Blockchain App Server..."
Write-Host "==============================="

# Set the location to the blockchain app directory
Set-Location -Path "c:\Users\masad\OneDrive\Desktop\block chain\blockchain-app"

# Configure environment variables properly
$env:USE_MOCK_DB = "true"
$env:PORT = "5000"

# Choose which server to run based on preference
# Uncomment one of the following lines:

# For minimal server (most reliable):
Write-Host "Starting minimal server..."
node minimal-server.js

# For simple server with more features (if minimal doesn't work):
# Write-Host "Starting simple server..."
# node simple-server.js

# For development server with more blockchain features:
# Write-Host "Starting development server..."
# node dev-server.js

# If you have MongoDB installed or want to use the in-memory version:
# Write-Host "Starting full server with MongoDB..."
# node full-server.js
