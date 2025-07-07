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
import dotenv from "dotenv";
dotenv.config();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create the app with increased body size limit
const app = new Elysia({
  serve: {
    maxRequestBodySize: 1024 * 1024 * 20, // 20MB buffer (lebih dari 15MB untuk header dll)
  },
})
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
app.listen(5000);
server.listen(5001); // Socket.IO on different port

console.log(`🦊 Elysia is running at localhost:5000`);
console.log(`🔌 Socket.IO is running at localhost:5001`);
console.log(`📁 Max file upload size: 15MB`);

// Export io instance for use in other files
export { io };
