# Blockchain Web Application

A comprehensive web-based blockchain application with full blockchain and cryptographic functionality.

## Features

- User Management (registration, authentication, profiles)
- Blockchain Core (explorer, mining, transactions)
- Wallet Management (create, send/receive, history)
- Smart Contracts (creation, execution, monitoring)
- Admin Panel (user management, network monitoring)

## Live Demo

Check out the live demo of this application at [https://asadkhanek.github.io/blockchainapp](https://asadkhanek.github.io/blockchainapp)

## Technology Stack

- **Frontend**: React.js with Redux
- **Backend**: Node.js with Express
- **Database**: MongoDB
- **Blockchain**: Custom implementation with Ethereum compatibility

## Installation

### Prerequisites
- Node.js (v16+)
- MongoDB (v4+)
- Git

### Setup
1. Clone the repository
   ```
   git clone https://github.com/asadkhanek/blockchainapp.git
   cd blockchainapp
   ```

2. Install dependencies
   ```
   npm run install-all
   ```

3. Set up environment variables (create a .env file in the root directory)
   ```
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/blockchain-app
   JWT_SECRET=your_secret_key_here
   NODE_ENV=development
   USE_MOCK_DB=true  # Set to false to use real MongoDB
   ```

4. Run the application
   ```
   npm run dev
   ```

## Deployment

The frontend of this application can be deployed to GitHub Pages. The backend requires a separate server.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
