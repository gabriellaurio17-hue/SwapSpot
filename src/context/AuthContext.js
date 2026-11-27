import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export const ROLES = {
  visitor: 'visitor',
  verified: 'verified',
  admin: 'admin',
  shopOwner: 'shopOwner',
  suspended: 'suspended',
};

const AuthContext = createContext(null);

function computeRole(session, profile) {
  if (!session) return ROLES.visitor;
  if (profile && profile.status === 'suspended') return ROLES.suspended;
  if (profile && profile.role === 'admin') return ROLES.admin;
  if (profile && profile.role === 'store_owner') return ROLES.shopOwner;
  return ROLES.verified;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) {
        console.error('Failed to load profile', error);
        setProfile(null);
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error('Failed to load profile', err);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;
        if (error) throw error;
        const sess = data.session;
        setSession(sess);
        setUser(sess?.user ?? null);
        if (sess?.user) {
          await fetchProfile(sess.user.id);
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error('Failed to initialize auth session', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initialize();

    const { data } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      if (!mounted) return;
      setSession(sess);
      setUser(sess?.user ?? null);
      // Wrap the profile fetch in setTimeout(..., 0).
      setTimeout(async () => {
        if (!mounted) return;
        if (sess?.user) {
          await fetchProfile(sess.user.id);
        } else {
          setProfile(null);
        }
      }, 0);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const role = useMemo(() => computeRole(session, profile), [session, profile]);

  const signUp = useCallback(async (email, password, fullName) => {
    const siteUrl = process.env.REACT_APP_SITE_URL || 'https://swap-spot-liart.vercel.app';
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${siteUrl}/auth?mode=login`,
      },
    });
    if (error) throw error;
  }, []);

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const value = useMemo(
    () => ({ session, user, profile, loading, role, signUp, signIn, signOut }),
    [session, user, profile, loading, role, signUp, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}