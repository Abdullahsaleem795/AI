import app from '../server/src/app.js';
import { connectDB } from '../server/src/config/db.js';

let isConnected = false;

// Vercel Serverless Function entry point
export default async function handler(req, res) {
  // Ensure database connection is active for this serverless invocation
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }
  
  // Forward request to Express app
  return app(req, res);
}
