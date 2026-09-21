import { io } from 'socket.io-client';

let socket = null;
let token = '';

export function initSocket(accessToken) {
  token = accessToken;
  if (!accessToken) return null;
  if (socket && socket.connected) return socket;

  socket = io('/', {
    auth: { token: accessToken },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect_error', (err) => {
    // token invalid or server down — silent
    if (err.message === 'invalid_token' && socket) socket.disconnect();
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
  if (socket?.connected && issueId) socket.emit('join-issue', String(issueId));
}

export function leaveIssueRoom(issueId) {
  if (socket?.connected && issueId) socket.emit('leave-issue', String(issueId));
}