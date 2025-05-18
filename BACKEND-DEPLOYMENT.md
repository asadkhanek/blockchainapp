# Backend Deployment Guide

This guide explains how to deploy the backend of your blockchain application to a hosting service.

## Option 1: Heroku Deployment

### Prerequisites
- A [Heroku](https://heroku.com) account
- [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) installed

### Steps

1. Create a `Procfile` in the root directory with the following content:
   ```
   web: node server/index.js
   ```

2. Add the following engines section to your package.json:
   ```json
   "engines": {
     "node": "16.x"
   }
   ```

3. Deploy to Heroku:
   ```bash
   heroku login
   heroku create your-blockchain-api
   git push heroku main
   ```

4. Configure environment variables:
   ```bash
   heroku config:set MONGO_URI=your_mongodb_connection_string
   heroku config:set JWT_SECRET=your_secret_key
   heroku config:set NODE_ENV=production
   heroku config:set USE_MOCK_DB=false
   ```

## Option 2: Digital Ocean App Platform

### Prerequisites
- A [Digital Ocean](https://www.digitalocean.com/) account

### Steps

1. Create a new App in the Digital Ocean App Platform
2. Connect to your GitHub repository
3. Configure as a Web Service with the following settings:
   - Source Directory: `/`
   - Build Command: `npm install`
   - Run Command: `node server/index.js`

4. Add environment variables:
   - MONGO_URI
   - JWT_SECRET
   - NODE_ENV=production
   - USE_MOCK_DB=false

## Option 3: AWS Elastic Beanstalk

### Prerequisites
- An [AWS](https://aws.amazon.com/) account
- [AWS CLI](https://aws.amazon.com/cli/) installed
- [EB CLI](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3-install.html) installed

### Steps

1. Initialize Elastic Beanstalk:
   ```bash
   eb init
   ```

2. Create an environment:
   ```bash
   eb create blockchain-api-env
   ```

3. Configure environment variables:
   ```bash
   eb setenv MONGO_URI=your_mongodb_connection_string JWT_SECRET=your_secret_key NODE_ENV=production USE_MOCK_DB=false
   ```

4. Deploy:
   ```bash
   eb deploy
   ```

## Connecting your frontend to the backend

Once your backend is deployed, update the `apiConfig.js` file in your frontend to point to the deployed API:

```javascript
const apiBaseURL = process.env.REACT_APP_API_URL || 'https://your-deployed-api-url.com/api';
```

Then set the environment variable in your GitHub repository settings (Settings > Secrets and variables > Actions):

- Name: `REACT_APP_API_URL`
- Value: `https://your-deployed-api-url.com/api`

This will automatically be included in the GitHub Actions workflow when deploying your frontend.
