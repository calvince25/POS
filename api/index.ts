// Vercel Serverless Entry Point
// This file exports the Express app as a serverless function handler
// Vercel's @vercel/node builder requires a default export of the request handler

import { app } from '../server/src/app';

export default app;
