import { Elysia } from "elysia";
import { createServer } from "http";
import { corsMiddleware } from "./middlewares/cors";
import { errorHandler } from "./middlewares/errorHandler";
import { authController } from "./controllers/authController";
import { brandController } from "./controllers/brandController";
import { clusterController } from "./controllers/clusterController";
import { fiturController } from "./controllers/fiturController";
import { jenisController } from "./controllers/jenisContoller";
import { materiController } from "./controllers/materiController";
import { fileRoutes } from "./routes/fileRoutes";
import { setupSocketIO } from "./socket/socketServer";
import * as fs from "fs";
import * as path from "path";

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
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
  .use(fiturController)
  .use(jenisController)
  .use(materiController)
  .use(fileRoutes);

// Create HTTP server and setup Socket.IO
const server = createServer();
const io = setupSocketIO(server);

// Start the server
app.listen(5001);
server.listen(5002); // Socket.IO on different port

console.log(`🦊 Elysia is running at localhost:5000`);
console.log(`🔌 Socket.IO is running at localhost:5001`);

// Export io instance for use in other files
export { io };
