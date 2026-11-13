import React, { createContext, useContext, useMemo, useState } from 'react';

export const ROLES = {
  visitor: 'visitor',
  verifiedUser: 'verified_user',
  admin: 'admin',
  shopOwner: 'shop_owner',
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [role, setRole] = useState(ROLES.visitor);

  const value = useMemo(() => ({
    role,
    setRole,
    signOut: () => setRole(ROLES.visitor),
  }), [role]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}
