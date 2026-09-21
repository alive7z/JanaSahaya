import { io } from 'socket.io-client';

let socket = null;
const issueRooms = new Set();
let mapRoomRequested = false;

export function initSocket(accessToken) {
  if (!accessToken) return null;
  if (socket) {
    socket.auth = { token: accessToken };
    if (!socket.connected) socket.connect();
    return socket;
  }

  socket = io('/', {
    auth: { token: accessToken },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect_error', (err) => {
    // token invalid or server down — silent
    if (err.message === 'invalid_token' && socket) socket.disconnect();
  });
  socket.on('connect', () => {
    issueRooms.forEach((issueId) => socket.emit('join-issue', issueId));
    if (mapRoomRequested) socket.emit('join-map');
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinIssueRoom(issueId) {
  if (!issueId) return;
  const room = String(issueId);
  issueRooms.add(room);
  if (socket?.connected) socket.emit('join-issue', room);
}

export function leaveIssueRoom(issueId) {
  if (!issueId) return;
  const room = String(issueId);
  issueRooms.delete(room);
  if (socket?.connected) socket.emit('leave-issue', room);
}

export function joinMapRoom() {
  mapRoomRequested = true;
  if (socket?.connected) socket.emit('join-map');
}

export function leaveMapRoom() {
  mapRoomRequested = false;
  if (socket?.connected) socket.emit('leave-map');
}
