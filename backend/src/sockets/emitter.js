import { Server } from 'socket.io';
import env from '../config/env.js';
import { verifyAccessToken } from '../utils/jwt.js';

let io = null;
const userSockets = new Map(); // userId -> Set<socketId>

export function initSocket(server) {
  io = new Server(server, {
    cors: { origin: env.clientOrigin, credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('auth_required'));

    const { payload, error } = verifyAccessToken(token);
    if (error) return next(new Error('invalid_token'));

    socket.userId = payload.sub;
    next();
  });

  io.on('connection', (socket) => {
    if (!socket.userId) return;

    if (!userSockets.has(socket.userId)) userSockets.set(socket.userId, new Set());
    userSockets.get(socket.userId).add(socket.id);
    socket.join(`user:${socket.userId}`);

    socket.on('join-issue', (issueId) => socket.join(`issue:${issueId}`));
    socket.on('leave-issue', (issueId) => socket.leave(`issue:${issueId}`));

    socket.on('disconnect', () => {
      const set = userSockets.get(socket.userId);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) userSockets.delete(socket.userId);
      }
    });
  });

  return io;
}

export function getIO() {
  return io;
}

/** Number of live sockets currently connected (for monitoring). */
export function liveConnections() {
  return userSockets.size;
}

export function emitToUser(userId, event, data) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

export function emitToUsers(userIds, event, data) {
  if (!io) return;
  for (const id of userIds) emitToUser(id, event, data);
}

export function emitToIssue(issueId, event, data) {
  if (!io) return;
  io.to(`issue:${issueId}`).emit(event, data);
}

export function emitBroadcast(event, data) {
  if (!io) return;
  io.emit(event, data);
}