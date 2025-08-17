import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import * as statsService from "../services/statsService";
import { UserPayload } from "../middlewares/authMiddleware";
import { Role } from "../models/userModel";

interface AuthenticatedSocket extends Socket {
  userId?: number;
  userName?: string;
  role?: Role;
}

export function setupSocketIO(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      socket.userId = decoded.userId;
      socket.userName = decoded.name;
      socket.role = decoded.role;
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    socket.join(`user_${socket.userId}`);

    socket.on("request_stats", async () => {
      try {
        const stats = await getStats(socket.role);
        socket.emit("stats_update", stats);
      } catch (error) {
        socket.emit("stats_error", { message: "Failed to fetch stats" });
      }
    });

    socket.on("request_stats_with_filters", async (filters: any) => {
      try {
        const stats = await getStatsWithFilters(filters, socket.role);
        socket.emit("stats_update", stats);
      } catch (error) {
        socket.emit("stats_error", {
          message: "Failed to fetch filtered stats",
        });
      }
    });

    socket.on("refresh_stats", async () => {
      try {
        const stats = await getStats(socket.role);
        socket.emit("stats_update", stats);
      } catch (error) {
        socket.emit("stats_error", { message: "Failed to refresh stats" });
      }
    });

    socket.on("disconnect", () => {});
  });

  return io;
}

async function getStats(userRole: UserPayload["role"]) {
  try {
    const stats = await statsService.getCompleteStats({}, userRole);
    return stats;
  } catch (error) {
    throw error;
  }
}

async function getStatsWithFilters(
  filters: any,
  userRole: UserPayload["role"]
) {
  try {
    const stats = await statsService.getCompleteStats(filters, userRole);
    return stats;
  } catch (error) {
    throw error;
  }
}

export async function broadcastStatsUpdate(
  io: Server,
  userRole: UserPayload["role"],
  filters?: any
) {
  try {
    const stats = filters
      ? await getStatsWithFilters(filters, userRole)
      : await getStats(userRole);
    io.to(`user`).emit("stats_update", stats);
  } catch (error) {
    throw error;
  }
}
