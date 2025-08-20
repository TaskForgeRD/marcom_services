// src/socket/socketServer.ts - Updated to handle chart data
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
  appliedFilters?: FilterParams;
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

    // Send initial stats when user connects (without filters)
    socket.on("request_stats", async () => {
      try {
        const stats = await getStatsWithChart(socket.role);
        socket.emit("stats_update", stats);
      } catch (error) {
        socket.emit("stats_error", { message: "Failed to fetch stats" });
      }
    });

    // Handle filtered stats request
    socket.on("request_filtered_stats", async (filterParams: FilterParams) => {
      try {
        console.log(
          `Requesting filtered stats for user ${socket.userName}:`,
          filterParams
        );
        const stats = await getFilteredStatsWithChart(
          socket.role,
          filterParams
        );
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
        const stats = await getStatsWithChart(socket.role);
        socket.emit("stats_update", stats);
      } catch (error) {
        socket.emit("stats_error", { message: "Failed to refresh stats" });
      }
    });

    // Handle filtered stats refresh
    socket.on("refresh_filtered_stats", async (filterParams: FilterParams) => {
      try {
        const stats = await getFilteredStatsWithChart(
          socket.role,
          filterParams
        );
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

// Helper function untuk cek status aktif
function isMateriAktif(itemEndDate: string | null): boolean {
  if (!itemEndDate) return false;
  const now = new Date();
  const todayUTC = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  );
  const endDate = new Date(itemEndDate);
  return endDate > todayUTC;
}

// Helper function untuk apply filters
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
      startDate.getFullYear() === currentYear ? startDate.getMonth() : 0
    );
    const endMonth = Math.min(
      11,
      endDate.getFullYear() === currentYear ? endDate.getMonth() : 11
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

// Get statistics with chart data (original - without filters)
async function getStatsWithChart(
  userRole: UserPayload["role"]
): Promise<StatsWithChart> {
  try {
    const userMateri = await materiService.getAllMateri(userRole);

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
      chartData: calculateChartData(userMateri),
    };

    return stats;
  } catch (error) {
    console.error("Error getting stats with chart:", error);
    throw error;
  }
}

// Get filtered statistics with chart data
async function getFilteredStatsWithChart(
  userRole: UserPayload["role"],
  filters: FilterParams
): Promise<StatsWithChart> {
  try {
    console.log("Getting filtered stats with chart data, filters:", filters);

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
      appliedFilters: filters,
      chartData: calculateChartData(filteredMateri),
    };

    console.log("Calculated filtered stats with chart:", stats);
    return stats;
  } catch (error) {
    console.error("Error getting filtered stats with chart:", error);
    throw error;
  }
}

// Function to broadcast stats update to a specific user
export async function broadcastStatsUpdate(
  io: Server,
  userRole: UserPayload["role"]
) {
  try {
    const stats = await getStatsWithChart(userRole);
    io.to(`user`).emit("stats_update", stats);
  } catch (error) {
    console.error("Error broadcasting stats update:", error);
  }
}

// Function to broadcast filtered stats update
export async function broadcastFilteredStatsUpdate(
  io: Server,
  userRole: UserPayload["role"],
  filters: FilterParams
) {
  try {
    const stats = await getFilteredStatsWithChart(userRole, filters);
    io.to(`user`).emit("stats_update", stats);
  } catch (error) {
    console.error("Error broadcasting filtered stats update:", error);
  }
}
