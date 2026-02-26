# BOMIS Quiz App

Quiz app with automatic result storage in MongoDB.

## Local Setup

1. Install Node.js LTS.
2. Create `.env` file in project root:

   ```env
   MONGODB_URI=your_mongodb_atlas_connection_string
   ```

3. Install and run:

   ```bash
   npm install
   npm start
   ```

4. Open:
   - App: `http://localhost:3000`
   - Health: `http://localhost:3000/api/health`
   - Results: `http://localhost:3000/api/quiz-results`

## Render Deployment

- Service type: **Web Service**
- Build command: `npm install`
- Start command: `npm start`
- Environment variable:
  - `MONGODB_URI` = your Atlas URI

After deploy:
- `https://<service>.onrender.com`
- `https://<service>.onrender.com/api/quiz-results`
