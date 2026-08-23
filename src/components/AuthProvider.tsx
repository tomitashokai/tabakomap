'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthState {
  user: User | null;
  /** 初回のセッション確定が済むまで true */
  loading: boolean;
  /** 匿名ユーザー（メール等で登録していない）かどうか */
  isAnonymous: boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  isAnonymous: false,
});

export const useAuth = () => useContext(AuthContext);

/**
 * セッションが無ければ匿名サインインして user_id を確保する。
 * 登録の手間なくチェックインできるようにするため、アプリ全体をこれで包む。
 */
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!active) return;

      if (session) {
        setUser(session.user);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInAnonymously();
      if (!active) return;
      if (error) console.error('[auth] anonymous sign-in failed:', error.message);
      setUser(data?.user ?? null);
      setLoading(false);
    })();

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, isAnonymous: user?.is_anonymous ?? false }}
    >
      {children}
    </AuthContext.Provider>
  );
}
