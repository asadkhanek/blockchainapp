# MongoDB Setup Instructions

## Local MongoDB Installation

### Windows
1. Download the MongoDB Community Server from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
2. Run the installer and follow the installation instructions
3. Choose "Complete" installation and select "Install MongoDB as a Service"
4. Once installed, MongoDB will be running as a service on port 27017

### Mac
1. Install via Homebrew:
   ```
   brew tap mongodb/brew
   brew install mongodb-community
   ```
2. Start the MongoDB service:
   ```
   brew services start mongodb-community
   ```

### Linux (Ubuntu)
1. Import the MongoDB public key:
   ```
   wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
   ```
2. Create a list file for MongoDB:
   ```
   echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
   ```
3. Update and install:
   ```
   sudo apt-get update
   sudo apt-get install -y mongodb-org
   ```
4. Start MongoDB:
   ```
   sudo systemctl start mongod
   sudo systemctl enable mongod
   ```

## Using Docker
If you prefer using Docker, you can run MongoDB in a container:

```
docker run --name blockchain-mongodb -d -p 27017:27017 mongo:latest
```

## MongoDB Atlas (Cloud)
If you prefer a cloud solution:

1. Create an account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Create a new cluster
3. Configure network access to allow connections from your IP
4. Create a database user
5. Get your connection string and update it in the .env file

Once MongoDB is set up, update your .env file with:
```
USE_MOCK_DB=false
MONGO_URI=mongodb://localhost:27017/blockchain-app
```

For MongoDB Atlas, use the connection string provided by Atlas:
```
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/blockchain-app?retryWrites=true&w=majority
```

## Testing the Connection

You can test if the MongoDB connection is working by running:
```
node test-mongo-connection.js
```

If successful, you'll see "MongoDB connection successful" in the console.
