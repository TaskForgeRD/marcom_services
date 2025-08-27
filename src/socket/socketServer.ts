// src/socket/socketServer.ts - Simplified to handle only unfiltered stats
import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import * as materiService from "../services/materiService";
import { UserPayload } from "../middlewares/authMiddleware";
import { Role } from "../models/userModel";

interface FilterOptions {
  start_date?: string;
  end_date?: string;
  brand?: string;
}

interface AuthenticatedSocket extends Socket {
  userId?: number;
  userName?: string;
  role?: Role;
}

interface ChartDataPoint {
  month: string;
  monthName: string;
  value: number;
}

interface StatsWithChart {
  total: number;
  fitur: number;
  komunikasi: number;
  aktif: number;
  expired: number;
  dokumen: number;
  lastUpdated: string;
  chartData: {
    total: ChartDataPoint[];
    fitur: ChartDataPoint[];
    komunikasi: ChartDataPoint[];
    aktif: ChartDataPoint[];
    expired: ChartDataPoint[];
    dokumen: ChartDataPoint[];
  };
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

    // Send initial unfiltered stats when user connects
    socket.on("request_stats", async (filter?: FilterOptions) => {
      try {
        console.log(`Requesting unfiltered stats for user ${socket.userName}`);
        let startDate, endDate, brand;
        if (filter) {
          if (filter.start_date) startDate = filter.start_date;
          if (filter.end_date) endDate = filter.end_date;
          if (filter.brand) brand = filter.brand;
        }
        const stats = await getStatsWithChart(
          socket.role,
          filter?.start_date,
          filter?.end_date,
          filter?.brand,
        );
        socket.emit("stats_update", stats);
      } catch (error) {
        console.error("Error getting unfiltered stats:", error);
        socket.emit("stats_error", { message: "Failed to fetch stats" });
      }
    });

    // Handle stats refresh request (always unfiltered)
    socket.on("refresh_stats", async (filter?: FilterOptions) => {
      try {
        let startDate, endDate, brand;
        if (filter) {
          if (filter.start_date) startDate = filter.start_date;
          if (filter.end_date) endDate = filter.end_date;
          if (filter.brand) brand = filter.brand;
        }

        console.log(`Refreshing unfiltered stats for user ${socket.userName}`);
        const stats = await getStatsWithChart(
          socket.role,
          filter?.start_date,
          filter?.end_date,
          filter?.brand,
        );
        socket.emit("stats_update", stats);
      } catch (error) {
        console.error("Error refreshing stats:", error);
        socket.emit("stats_error", { message: "Failed to refresh stats" });
      }
    });

    socket.on("disconnect", () => {
      console.log(`User ${socket.userName} (${socket.userId}) disconnected`);
    });
  });

  return io;
}

// Helper function untuk cek status aktif
function isMateriAktif(itemEndDate: string | null): boolean {
  if (!itemEndDate) return false;
  const now = new Date();
  const todayUTC = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
  );
  const endDate = new Date(itemEndDate);
  return endDate > todayUTC;
}

// Generate chart data for all 12 months
function generateMonthlyChartData(): ChartDataPoint[] {
  const months = [
    { month: "01", monthName: "Jan" },
    { month: "02", monthName: "Feb" },
    { month: "03", monthName: "Mar" },
    { month: "04", monthName: "Apr" },
    { month: "05", monthName: "May" },
    { month: "06", monthName: "Jun" },
    { month: "07", monthName: "Jul" },
    { month: "08", monthName: "Aug" },
    { month: "09", monthName: "Sep" },
    { month: "10", monthName: "Oct" },
    { month: "11", monthName: "Nov" },
    { month: "12", monthName: "Dec" },
  ];

  return months.map(({ month, monthName }) => ({
    month,
    monthName,
    value: 0,
  }));
}

// Calculate chart data from materi data
function calculateChartData(materiData: any[]) {
  const currentYear = new Date().getFullYear();

  // Initialize chart data for all metrics
  const chartData = {
    total: generateMonthlyChartData(),
    fitur: generateMonthlyChartData(),
    komunikasi: generateMonthlyChartData(),
    aktif: generateMonthlyChartData(),
    expired: generateMonthlyChartData(),
    dokumen: generateMonthlyChartData(),
  };

  // Process each materi
  materiData.forEach((materi) => {
    const startDate = new Date(materi.start_date);
    const endDate = new Date(materi.end_date);

    // Only process data from current year
    if (
      startDate.getFullYear() !== currentYear &&
      endDate.getFullYear() !== currentYear
    ) {
      return;
    }

    // Determine which months this materi is active in
    const startMonth = Math.max(
      0,
      startDate.getFullYear() === currentYear ? startDate.getMonth() : 0,
    );
    const endMonth = Math.min(
      11,
      endDate.getFullYear() === currentYear ? endDate.getMonth() : 11,
    );

    for (let month = startMonth; month <= endMonth; month++) {
      // Total count
      chartData.total[month].value += 1;

      // Fitur count
      if (materi.fitur && materi.fitur.trim()) {
        chartData.fitur[month].value += 1;
      }

      // Komunikasi count
      if (materi.nama_materi && materi.nama_materi.trim()) {
        chartData.komunikasi[month].value += 1;
      }

      // Status counts (check if active/expired in that specific month)
      const monthDate = new Date(currentYear, month, 15); // Mid month for comparison
      const isAktifInMonth = monthDate <= endDate;

      if (isAktifInMonth) {
        chartData.aktif[month].value += 1;
      } else {
        chartData.expired[month].value += 1;
      }

      // Dokumen count
      if (materi.dokumenMateri && Array.isArray(materi.dokumenMateri)) {
        chartData.dokumen[month].value += materi.dokumenMateri.length;
      }
    }
  });

  return chartData;
}

// Get statistics with chart data (always unfiltered)
async function getStatsWithChart(
  userRole: UserPayload["role"],
  startDate?: string,
  endDate?: string,
  brand?: string,
): Promise<StatsWithChart> {
  try {
    console.log("Getting unfiltered stats with chart data for role:", userRole);

    // Always get ALL data without any filters
    const allUserMateri = await materiService.getAllMateri(
      userRole,
      startDate,
      endDate,
      brand,
    );

    const stats = {
      total: allUserMateri.length,
      fitur: allUserMateri.filter((m) => m.fitur && m.fitur.trim()).length,
      komunikasi: allUserMateri.filter(
        (m) => m.nama_materi && m.nama_materi.trim(),
      ).length,
      aktif: allUserMateri.filter(
        (m) => m.end_date && isMateriAktif(m.end_date),
      ).length,
      expired: allUserMateri.filter(
        (m) => m.end_date && !isMateriAktif(m.end_date),
      ).length,
      dokumen: allUserMateri.reduce((total, m) => {
        return total + (m.dokumenMateri ? m.dokumenMateri.length : 0);
      }, 0),
      lastUpdated: new Date().toISOString(),
      chartData: calculateChartData(allUserMateri),
    };

    console.log("Calculated unfiltered stats:", stats);
    return stats;
  } catch (error) {
    console.error("Error getting stats with chart:", error);
    throw error;
  }
}

// Function to broadcast stats update to a specific user (always unfiltered)
export async function broadcastStatsUpdate(
  io: Server,
  userRole: UserPayload["role"],
) {
  try {
    console.log("Broadcasting unfiltered stats update for role:", userRole);
    // const stats = await getStatsWithChart(userRole);
    io.to(`user`).emit("has_update");
  } catch (error) {
    console.error("Error broadcasting stats update:", error);
  }
}
