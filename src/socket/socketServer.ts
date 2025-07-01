// server/socketio/socketServer.ts
import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import * as materiService from '../services/materiService';

interface AuthenticatedSocket extends Socket {
  userId?: number;
  userName?: string;
}

export function setupSocketIO(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Authentication middleware for Socket.IO
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      socket.userId = decoded.userId;
      socket.userName = decoded.name;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User ${socket.userName} (${socket.userId}) connected`);
    
    // Join user to their personal room
    socket.join(`user_${socket.userId}`);

    // Send initial stats when user connects
    socket.on('request_stats', async () => {
      try {
        const stats = await getPersonalStats(socket.userId!);
        socket.emit('stats_update', stats);
      } catch (error) {
        socket.emit('stats_error', { message: 'Failed to fetch stats' });
      }
    });

    // Handle stats refresh request
    socket.on('refresh_stats', async () => {
      try {
        const stats = await getPersonalStats(socket.userId!);
        socket.emit('stats_update', stats);
      } catch (error) {
        socket.emit('stats_error', { message: 'Failed to refresh stats' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`User ${socket.userName} (${socket.userId}) disconnected`);
    });
  });

  return io;
}

// Get personal statistics for a user
async function getPersonalStats(userId: number) {
  try {
    const userMateri = await materiService.getAllMateriByUser(userId);
    
    const now = new Date();
    const stats = {
      total: userMateri.length,
      fitur: userMateri.filter(m => m.fitur && m.fitur.trim()).length,
      komunikasi: userMateri.filter(m => m.nama_materi && m.nama_materi.trim()).length,
      aktif: userMateri.filter(m => new Date(m.end_date) > now).length,
      expired: userMateri.filter(m => new Date(m.end_date) <= now).length,
      dokumen: userMateri.filter(m => m.dokumenMateri && m.dokumenMateri.length > 0).length,
      lastUpdated: new Date().toISOString()
    };

    return stats;
  } catch (error) {
    console.error('Error getting personal stats:', error);
    throw error;
  }
}

// Function to broadcast stats update to a specific user
export async function broadcastStatsUpdate(io: Server, userId: number) {
  try {
    const stats = await getPersonalStats(userId);
    io.to(`user_${userId}`).emit('stats_update', stats);
  } catch (error) {
    console.error('Error broadcasting stats update:', error);
  }
}