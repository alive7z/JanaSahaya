import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as authService from '../services/auth';
import { initSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [booting, setBooting] = useState(true);

  const applySession = useCallback((session, token) => {
    localStorage.setItem('accessToken', token);
    setUser(session.user);
    setRoles(session.roles);
    initSocket(token);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem('accessToken');
    disconnectSocket();
    setUser(null);
    setRoles([]);
  }, []);

  const boot = useCallback(async () => {
    setLoading(true);
    try {
      const session = await authService.me();
      setUser(session.user);
      setRoles(session.roles);
      initSocket(localStorage.getItem('accessToken'));
    } catch {
      clearSession();
    } finally {
      setLoading(false);
      setBooting(false);
    }
  }, [clearSession]);

  useEffect(() => {
    boot();
  }, [boot]);

  useEffect(() => {
    const onLogout = () => clearSession();
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, [clearSession]);

  const login = useCallback(
    async (payload) => {
      const session = await authService.login(payload);
      applySession(session, session.accessToken);
    },
    [applySession],
  );

  const register = useCallback(
    async (payload) => {
      const session = await authService.register(payload);
      applySession(session, session.accessToken);
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    await authService.logout();
    clearSession();
  }, [clearSession]);

  const hasRole = useCallback(
    (...names) => roles.some((r) => names.includes(r.name)),
    [roles],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        roles,
        loading,
        booting,
        isAuthenticated: !!user,
        hasRole,
        login,
        register,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}