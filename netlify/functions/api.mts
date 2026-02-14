/**
 * Netlify Serverless Function - API Handler
 * ==========================================
 * Wraps the Express app for Netlify Functions (Lambda).
 */

import "dotenv/config";
import serverless from "serverless-http";
import { createServer } from "../../server/index";
import { initializeStore } from "../../server/data/store";

const app = createServer();
const serverlessHandler = serverless(app);

// Cold-start initialization guard
let initialized = false;

export const handler = async (event: any, context: any) => {
  // Initialize DB on first invocation (cold start)
  if (!initialized) {
    await initializeStore();
    initialized = true;
  }
  return serverlessHandler(event, context);
};
