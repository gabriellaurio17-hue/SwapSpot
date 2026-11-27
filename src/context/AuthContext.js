import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export const ROLES = {
  visitor: 'visitor',
  verifiedUser: 'verified_user',
  admin: 'admin',
  shopOwner: 'shop_owner',
};

const STORAGE_KEY = 'swapspot_auth';

function loadStoredAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { role: ROLES.visitor, user: null };
    const parsed = JSON.parse(raw);
    const validRoles = Object.values(ROLES);
    const role = validRoles.includes(parsed?.role) ? parsed.role : ROLES.visitor;
    const user = parsed?.user && typeof parsed.user === 'object' ? parsed.user : null;
    return { role, user };
  } catch {
    return { role: ROLES.visitor, user: null };
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuthState] = useState(loadStoredAuth);

  const setAuth = useCallback((nextRole, nextUser = null) => {
    const next = { role: nextRole, user: nextUser };
    setAuthState(next);
    try {
      if (nextRole === ROLES.visitor) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
    } catch {
      // Ignore storage quota / privacy mode errors
    }
  }, []);

  const setRole = useCallback((nextRole) => {
    setAuth(nextRole, null);
  }, [setAuth]);

  const signOut = useCallback(() => {
    setAuth(ROLES.visitor, null);
  }, [setAuth]);

  const value = useMemo(() => ({
    role: auth.role,
    user: auth.user,
    setRole,
    setAuth,
    signOut,
  }), [auth, setRole, setAuth, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}
