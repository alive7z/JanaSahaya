import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { getSocket, joinIssueRoom, leaveIssueRoom } from '../services/socket';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const listeners = useRef([]);
  const [ready, setReady] = useState(false);

  // Sync listeners with the active socket as it connects.
  useEffect(() => {
    const sync = () => {
      const s = getSocket();
      if (!s) return;
      s.onAny((event) => {
        listeners.current.forEach(({ event: e, cb }) => {
          if (e === event) cb(s);
        });
      });
      setReady(s.connected);
      s.on('connect', () => setReady(true));
    };
    sync();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      const s = getSocket();
      if (s && !s.connected) s.connect();
    }
  }, [isAuthenticated]);

  return (
    <SocketContext.Provider
      value={{
        ready,
        subscribe(event, cb) {
          const entry = { event, cb };
          listeners.current.push(entry);
          return () => {
            listeners.current = listeners.current.filter((l) => l !== entry);
          };
        },
        joinIssueRoom,
        leaveIssueRoom,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}