// src/socket/socketServer.ts - Updated to handle filtered stats
import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import * as materiService from "../services/materiService";
import { UserPayload } from "../middlewares/authMiddleware";
import { Role } from "../models/userModel";

interface AuthenticatedSocket extends Socket {
  userId?: number;
  userName?: string;
  role?: Role;
}

interface FilterParams {
  brand?: string;
  cluster?: string;
  fitur?: string;
  jenis?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
  onlyVisualDocs?: boolean;
}

export function setupSocketIO(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Authentication middleware for Socket.IO
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
    console.log(`User ${socket.userName} (${socket.userId}) connected`);

    // Join user to their personal room
    socket.join(`user_${socket.userId}`);

    // Send initial stats when user connects (without filters)
    socket.on("request_stats", async () => {
      try {
        const stats = await getStats(socket.role);
        socket.emit("stats_update", stats);
      } catch (error) {
        socket.emit("stats_error", { message: "Failed to fetch stats" });
      }
    });

    // NEW: Handle filtered stats request
    socket.on("request_filtered_stats", async (filterParams: FilterParams) => {
      try {
        console.log(
          `Requesting filtered stats for user ${socket.userName}:`,
          filterParams
        );
        const stats = await getFilteredStats(socket.role, filterParams);
        socket.emit("stats_update", stats);
      } catch (error) {
        console.error("Error getting filtered stats:", error);
        socket.emit("stats_error", {
          message: "Failed to fetch filtered stats",
        });
      }
    });

    // Handle stats refresh request
    socket.on("refresh_stats", async () => {
      try {
        const stats = await getStats(socket.role);
        socket.emit("stats_update", stats);
      } catch (error) {
        socket.emit("stats_error", { message: "Failed to refresh stats" });
      }
    });

    // NEW: Handle filtered stats refresh
    socket.on("refresh_filtered_stats", async (filterParams: FilterParams) => {
      try {
        const stats = await getFilteredStats(socket.role, filterParams);
        socket.emit("stats_update", stats);
      } catch (error) {
        socket.emit("stats_error", {
          message: "Failed to refresh filtered stats",
        });
      }
    });

    socket.on("disconnect", () => {
      console.log(`User ${socket.userName} (${socket.userId}) disconnected`);
    });
  });

  return io;
}

// Helper function untuk cek status aktif (sama dengan di materiService)
function isMateriAktif(itemEndDate: string | null): boolean {
  if (!itemEndDate) return false;
  const now = new Date();
  const todayUTC = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  );
  const endDate = new Date(itemEndDate);
  return endDate > todayUTC;
}

// Helper function untuk apply filters (sama logic dengan materiService)
function applyFilters(data: any[], filters: FilterParams) {
  return data.filter((item) => {
    // Brand filter
    if (filters.brand && item.brand !== filters.brand) {
      return false;
    }

    // Cluster filter
    if (filters.cluster && item.cluster !== filters.cluster) {
      return false;
    }

    // Fitur filter
    if (filters.fitur && item.fitur !== filters.fitur) {
      return false;
    }

    // Jenis filter
    if (filters.jenis && item.jenis !== filters.jenis) {
      return false;
    }

    // Status filter
    if (filters.status) {
      const isAktif = item.end_date && isMateriAktif(item.end_date);
      if (filters.status === "Aktif" && !isAktif) return false;
      if (filters.status === "Expired" && isAktif) return false;
    }

    // Date range filter
    if (filters.start_date && filters.end_date) {
      const filterStartDate = new Date(filters.start_date);
      const filterEndDate = new Date(filters.end_date);
      const itemStartDate = item.start_date ? new Date(item.start_date) : null;
      const itemEndDate = item.end_date ? new Date(item.end_date) : null;

      if (itemStartDate && itemEndDate) {
        // Check for overlap
        const hasOverlap =
          itemStartDate <= filterEndDate && itemEndDate >= filterStartDate;
        if (!hasOverlap) return false;
      }
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const namaMatch = item.nama_materi.toLowerCase().includes(searchLower);

      const keywordMatch = Array.isArray(item.dokumenMateri)
        ? item.dokumenMateri.some((dokumen: any) =>
            (dokumen.keywords || []).some((keyword: string) =>
              keyword.toLowerCase().includes(searchLower)
            )
          )
        : false;

      if (!namaMatch && !keywordMatch) return false;
    }

    // Visual docs filter
    if (filters.onlyVisualDocs) {
      const hasKeyVisualDoc =
        Array.isArray(item.dokumenMateri) &&
        item.dokumenMateri.some(
          (dokumen: any) => dokumen.tipeMateri === "Key Visual"
        );
      if (!hasKeyVisualDoc) return false;
    }

    return true;
  });
}

// Get statistics (original - without filters)
async function getStats(userRole: UserPayload["role"]) {
  try {
    const userMateri = await materiService.getAllMateri(userRole);

    const now = new Date();
    const stats = {
      total: userMateri.length,
      fitur: userMateri.filter((m) => m.fitur && m.fitur.trim()).length,
      komunikasi: userMateri.filter(
        (m) => m.nama_materi && m.nama_materi.trim()
      ).length,
      aktif: userMateri.filter((m) => m.end_date && isMateriAktif(m.end_date))
        .length,
      expired: userMateri.filter(
        (m) => m.end_date && !isMateriAktif(m.end_date)
      ).length,
      dokumen: userMateri.reduce((total, m) => {
        return total + (m.dokumenMateri ? m.dokumenMateri.length : 0);
      }, 0),
      lastUpdated: new Date().toISOString(),
    };

    return stats;
  } catch (error) {
    console.error("Error getting personal stats:", error);
    throw error;
  }
}

// NEW: Get filtered statistics
async function getFilteredStats(
  userRole: UserPayload["role"],
  filters: FilterParams
) {
  try {
    console.log("Getting filtered stats with filters:", filters);

    // Get all user data
    const allUserMateri = await materiService.getAllMateri(userRole);

    // Apply filters
    const filteredMateri = applyFilters(allUserMateri, filters);

    console.log(
      `Filtered ${allUserMateri.length} items to ${filteredMateri.length} items`
    );

    // Calculate stats from filtered data
    const stats = {
      total: filteredMateri.length,
      fitur: filteredMateri.filter((m) => m.fitur && m.fitur.trim()).length,
      komunikasi: filteredMateri.filter(
        (m) => m.nama_materi && m.nama_materi.trim()
      ).length,
      aktif: filteredMateri.filter(
        (m) => m.end_date && isMateriAktif(m.end_date)
      ).length,
      expired: filteredMateri.filter(
        (m) => m.end_date && !isMateriAktif(m.end_date)
      ).length,
      dokumen: filteredMateri.reduce((total, m) => {
        return total + (m.dokumenMateri ? m.dokumenMateri.length : 0);
      }, 0),
      lastUpdated: new Date().toISOString(),
      // Add filter info for debugging
      appliedFilters: filters,
    };

    console.log("Calculated filtered stats:", stats);
    return stats;
  } catch (error) {
    console.error("Error getting filtered stats:", error);
    throw error;
  }
}

// Function to broadcast stats update to a specific user
export async function broadcastStatsUpdate(
  io: Server,
  userRole: UserPayload["role"]
) {
  try {
    const stats = await getStats(userRole);
    io.to(`user`).emit("stats_update", stats);
  } catch (error) {
    console.error("Error broadcasting stats update:", error);
  }
}

// NEW: Function to broadcast filtered stats update
export async function broadcastFilteredStatsUpdate(
  io: Server,
  userRole: UserPayload["role"],
  filters: FilterParams
) {
  try {
    const stats = await getFilteredStats(userRole, filters);
    io.to(`user`).emit("stats_update", stats);
  } catch (error) {
    console.error("Error broadcasting filtered stats update:", error);
  }
}
