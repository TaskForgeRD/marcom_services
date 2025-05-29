// index.ts
import { Elysia } from 'elysia';
import { corsMiddleware } from './middlewares/cors';
import { errorHandler } from './middlewares/errorHandler';
import { authController } from './controllers/authController';
import { brandController } from './controllers/brandController';
import { clusterController } from './controllers/clusterController';
import { materiController } from './controllers/materiController';
import { fileRoutes } from './routes/fileRoutes';
import * as fs from 'fs';
import * as path from 'path';


// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create the app
const app = new Elysia()
.use(corsMiddleware)
.use(errorHandler)
.use(authController)
.use(brandController)
.use(clusterController)
.use(materiController)
.use(fileRoutes)
  .listen(5000);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port || 5000}`);