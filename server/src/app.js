import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { notFoundHandler } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// --- Middleware ---
app.use(cors({
  origin: env.CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

app.use(express.json());

// --- API Routes ---
app.use('/api/v1', apiRouter);

// --- Error Handling ---
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
