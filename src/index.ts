import { Elysia } from 'elysia';
import { corsMiddleware } from './middlewares/cors';
import { errorHandler } from './middlewares/errorHandler';
import { brandController } from './controllers/brandController';
import { clusterController } from './controllers/clusterController';
import { materiController } from './controllers/materiController';
import { fileRoutes } from './routes/fileRoutes';

// Create the app
const app = new Elysia()
  .use(corsMiddleware)
  .use(errorHandler)
  .use(brandController)
  .use(clusterController)
  .use(materiController)
  .use(fileRoutes)
  .listen(process.env.PORT || 5000);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port || 5000}`);

export default app;