import React, { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);
const SESSION_KEY = 'flow4ward_session';

// ─── Session helpers (only the logged-in user object, NOT passwords) ────────
function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
  catch { return null; }
}

function saveSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

// ─── Provider ────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => loadSession());

  /** Register a new account — stores in Neon PostgreSQL */
  const signUp = useCallback(async ({ name, email, password }) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed.');

    const session = { id: data.user.id, name: data.user.name, email: data.user.email };
    saveSession(session);
    setUser(session);
    return session;
  }, []);

  /** Login with existing credentials — verified against Neon PostgreSQL */
  const signIn = useCallback(async ({ email, password }) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed.');

    const session = { id: data.user.id, name: data.user.name, email: data.user.email };
    saveSession(session);
    setUser(session);
    return session;
  }, []);

  /** Log out — clears session from localStorage and React state */
  const signOut = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
