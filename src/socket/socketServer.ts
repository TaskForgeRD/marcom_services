// src/socket/socketServer.ts - Fix untuk TypeScript error
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
        if (!socket.role) {
          socket.emit("stats_error", { message: "User role not found" });
          return;
        }
        const stats = await getStats(socket.role);
        socket.emit("stats_update", stats);
      } catch (error) {
        socket.emit("stats_error", { message: "Failed to fetch stats" });
      }
    });

    socket.on("request_stats_with_filters", async (filters: any) => {
      try {
        if (!socket.role) {
          socket.emit("stats_error", { message: "User role not found" });
          return;
        }
        const stats = await getStatsWithFilters(filters, socket.role);
        socket.emit("stats_update", stats);
      } catch (error) {
        socket.emit("stats_error", {
          message: "Failed to fetch filtered stats",
        });
      }
    });

    socket.on("request_monthly_stats", async () => {
      try {
        if (!socket.role) {
          socket.emit("stats_error", { message: "User role not found" });
          return;
        }
        const monthlyStats = await getMonthlyStats(socket.role);
        socket.emit("monthly_stats_update", monthlyStats);
      } catch (error) {
        socket.emit("stats_error", {
          message: "Failed to fetch monthly stats",
        });
      }
    });

    socket.on("request_monthly_stats_with_filters", async (filters: any) => {
      try {
        if (!socket.role) {
          socket.emit("stats_error", { message: "User role not found" });
          return;
        }
        const monthlyStats = await getMonthlyStatsWithFilters(
          filters,
          socket.role
        );
        socket.emit("monthly_stats_update", monthlyStats);
      } catch (error) {
        socket.emit("stats_error", {
          message: "Failed to fetch filtered monthly stats",
        });
      }
    });

    socket.on("refresh_stats", async () => {
      try {
        if (!socket.role) {
          socket.emit("stats_error", { message: "User role not found" });
          return;
        }
        const stats = await getStats(socket.role);
        const monthlyStats = await getMonthlyStats(socket.role);
        socket.emit("stats_update", stats);
        socket.emit("monthly_stats_update", monthlyStats);
      } catch (error) {
        socket.emit("stats_error", { message: "Failed to refresh stats" });
      }
    });

    socket.on("disconnect", () => {});
  });

  return io;
}

async function getStats(userRole: Role) {
  try {
    const stats = await statsService.getCompleteStats({}, userRole);
    return stats;
  } catch (error) {
    throw error;
  }
}

async function getStatsWithFilters(filters: any, userRole: Role) {
  try {
    const stats = await statsService.getCompleteStats(filters, userRole);
    return stats;
  } catch (error) {
    throw error;
  }
}

async function getMonthlyStats(userRole: Role) {
  try {
    const monthlyStats = await statsService.getMonthlyStats({}, userRole);
    return monthlyStats;
  } catch (error) {
    throw error;
  }
}

async function getMonthlyStatsWithFilters(filters: any, userRole: Role) {
  try {
    console.log(filters);
    const monthlyStats = await statsService.getMonthlyStats(filters, userRole);
    return monthlyStats;
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
    if (!userRole) {
      console.error("User role is required for broadcasting stats");
      return;
    }

    const stats = filters
      ? await getStatsWithFilters(filters, userRole)
      : await getStats(userRole);

    const monthlyStats = filters
      ? await getMonthlyStatsWithFilters(filters, userRole)
      : await getMonthlyStats(userRole);

    io.to(`user`).emit("stats_update", stats);
    io.to(`user`).emit("monthly_stats_update", monthlyStats);
  } catch (error) {
    console.error("Error broadcasting stats update:", error);
    throw error;
  }
}
