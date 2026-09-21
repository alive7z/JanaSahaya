import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getSocket, joinIssueRoom, leaveIssueRoom, joinMapRoom, leaveMapRoom } from '../services/socket';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const listeners = useRef([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const active = getSocket();
    if (!isAuthenticated || !active) { setReady(false); return undefined; }
    const onConnect = () => setReady(true);
    const onDisconnect = () => setReady(false);
    const onAny = (event, ...payload) => listeners.current.forEach(({ event: expected, cb }) => {
      if (expected === event) cb(...payload);
    });
    active.on('connect', onConnect);
    active.on('disconnect', onDisconnect);
    active.onAny(onAny);
    setReady(active.connected);
    if (!active.connected) active.connect();
    return () => {
      active.off('connect', onConnect);
      active.off('disconnect', onDisconnect);
      active.offAny(onAny);
    };
  }, [isAuthenticated]);

  const subscribe = useCallback((event, cb) => {
    const entry = { event, cb };
    listeners.current.push(entry);
    return () => { listeners.current = listeners.current.filter((listener) => listener !== entry); };
  }, []);

  const value = useMemo(() => ({ ready, subscribe, joinIssueRoom, leaveIssueRoom, joinMapRoom, leaveMapRoom }), [ready, subscribe]);

  return (
    <SocketContext.Provider
      value={value}
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
