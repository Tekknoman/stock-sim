# Deployment Guide for Stock Simulation Project

This guide explains how to deploy the Stock Simulation project using GitHub Actions to free hosting services (Render.com for backend and Vercel for frontend).

## Prerequisites

1. GitHub repository with your code pushed to the `main` branch
2. Render.com account (free tier)
3. Vercel account (free tier)

## Setup Process

### 1. Render.com Setup (Backend)

1. Sign up or log in to [Render.com](https://render.com)
2. Create a new Web Service
   - Connect your GitHub repository
   - Select the repository containing your project
   - Use the following settings:
     - Name: `stock-sim-backend`
     - Root Directory: `backend`
     - Runtime: `Node`
     - Build Command: `npm ci`
     - Start Command: `npm start`
     - Plan: Free
   - Click "Create Web Service"

3. Set up environment variables:
   - Go to the "Environment" tab of your new service
   - Add the following variables:
     - `NODE_ENV`: `production`
     - `PORT`: `10000`

4. Get your Render API key:
   - Go to your Render dashboard
   - Click on your account avatar and select "Account Settings"
   - Go to the "API Keys" section
   - Create a new API key and copy it (you'll need this for GitHub Actions)

5. Get your service ID:
   - Go to the dashboard and select your backend service
   - The service ID is in the URL: `https://dashboard.render.com/web/srv-XXXXXXXX`
   - Copy the `srv-XXXXXXXX` part

### 2. Vercel Setup (Frontend)

1. Sign up or log in to [Vercel](https://vercel.com)
2. Import your GitHub repository
3. Configure the project:
   - Framework Preset: `Create React App`
   - Root Directory: `client`
   - Build Command: `npm run build`
   - Output Directory: `build`
   - Click "Deploy"

4. Set up environment variables:
   - Go to your project settings
   - Add the following environment variable:
     - `REACT_APP_API_URL`: The URL of your Render backend service (e.g., `https://stock-sim-backend.onrender.com/api`)

5. Get your Vercel token:
   - Go to your Vercel account settings
   - Go to the "Tokens" tab
   - Create a new token and copy it (you'll need this for GitHub Actions)

### 3. GitHub Secrets Setup

1. Go to your GitHub repository
2. Click on "Settings" > "Secrets and variables" > "Actions"
3. Add the following secrets:
   - `RENDER_API_KEY`: Your Render API key
   - `RENDER_BACKEND_SERVICE_ID`: Your Render service ID (starting with `srv-`)
   - `VERCEL_TOKEN`: Your Vercel token
   - `VERCEL_ORG_ID`: Your Vercel organization ID (found in Vercel project settings)
   - `VERCEL_PROJECT_ID`: Your Vercel project ID (found in Vercel project settings)

### 4. GitHub Actions Workflow

The GitHub Actions workflows are already set up in the `.github/workflows` directory. They will:

- Deploy the backend to Render when changes are pushed to the `backend` directory
- Deploy the frontend to Vercel when changes are pushed to the `client` directory

## Database Considerations

This project uses SQLite which is a file-based database. Render's free tier uses ephemeral storage, which means the database will be reset whenever the instance restarts (typically every few hours on the free plan).

For a more permanent solution, consider:
1. Using a PostgreSQL database on Render (has a free tier)
2. Using a cloud database service like MongoDB Atlas (has a free tier)
3. Upgrading to Render's paid plan for persistent storage

## Testing the Deployment

After setting up the deployment pipeline:

1. Make a small change to your frontend or backend code
2. Commit and push to the `main` branch
3. Watch the GitHub Actions workflow run in the "Actions" tab
4. Check that your changes are deployed to Render and Vercel

## Limitations of Free Tier Hosting

1. **Render.com Free Tier:**
   - Service spins down after 15 minutes of inactivity
   - Limited to 750 hours of usage per month
   - No persistent storage
   - Limited resources

2. **Vercel Free Tier:**
   - Limited to hobby projects
   - Limited number of deployments
   - Some features restricted to paid plans

For a production environment, consider upgrading to paid plans on these services or exploring other hosting options.