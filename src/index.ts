import { Elysia } from "elysia";
import * as fs from "fs";
import * as path from "path";
import { createServer } from "http";

import { corsMiddleware } from "./middlewares/cors";
import { errorHandler } from "./middlewares/errorHandler";

import { authController } from "./controllers/authController";
import { brandController } from "./controllers/brandController";
import { clusterController } from "./controllers/clusterController";
import { fiturController } from "./controllers/fiturController";
import { jenisController } from "./controllers/jenisController";
import { materiController } from "./controllers/materiController";

import { fileRoutes } from "./routes/fileRoutes";
import { setupSocketIO } from "./socket/socketServer";
import { usersController } from "./controllers/userController";

const PORT = Number(process.env.PORT) || 5001;
const HOST = process.env.HOST || "127.0.0.1";
const SOCKET_IO_PORT = Number(process.env.SOCKET_IO) || 5002;

const uploadsDir =
  process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = new Elysia()
  .use(corsMiddleware)
  .use(errorHandler)
  .use(authController)
  .use(brandController)
  .use(clusterController)
  .use(fiturController)
  .use(jenisController)
  .use(materiController)
  .use(usersController)
  .use(fileRoutes);

const server = createServer();
const io = setupSocketIO(server);

app.listen({
  port: PORT,
  hostname: HOST,
});
server.listen(SOCKET_IO_PORT, HOST);

console.log(`🦊 Elysia is running at http://${HOST}:${PORT}`);
console.log(`🔌 Socket.IO is running at http://${HOST}:${SOCKET_IO_PORT}`);

// Export io instance for use in other files
export { io };
