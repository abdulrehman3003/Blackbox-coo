import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { User, AuthError } from "@supabase/supabase-js";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  company_id: string | null;
  avatar_url: string | null;
}

export interface Company {
  id: string;
  owner_id: string;
  name: string;
  industry: string | null;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  company: Company | null;
  loading: boolean;
  onboardingRequired: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: AuthError | null; data: unknown }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingRequired, setOnboardingRequired] = useState(false);
  const navigate = useNavigate();

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("users")
      .select("*, companies!fk_users_company(*)")
      .eq("id", userId)
      .maybeSingle();

    if (!error && data) {
      const p = data as Profile & { companies: Company | null };
      setProfile({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        role: p.role,
        company_id: p.company_id,
        avatar_url: p.avatar_url,
      });
      setCompany(p.companies ?? null);
      setOnboardingRequired(!p.company_id);
    } else {
      // No profile row yet (fresh signup) — force onboarding to create it
      setProfile(null);
      setCompany(null);
      setOnboardingRequired(true);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  useEffect(() => {
    // Get initial session — persists across page refreshes
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        fetchProfile(u.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          fetchProfile(u.id);
        } else {
          setProfile(null);
          setCompany(null);
          setOnboardingRequired(false);
        }
      },
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data?.user) {
      // Await profile fetch so ProtectedRoute has the correct
      // onboardingRequired state before the navigation.
      await fetchProfile(data.user.id);
      navigate("/dashboard");
    }
    return { error };
  }, [navigate, fetchProfile]);

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      // Sign up with Supabase Auth — pass full_name in user_metadata
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });

      // Navigate to onboarding only if there's an active session
      // (autoconfirm on). If confirmation is required, LoginPage handles the
      // "check your email" state — onboarding happens after first login.
      if (!error && data?.session) navigate("/onboarding");

      return { error: error as AuthError | null, data };
    },
    [navigate],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    navigate("/login");
  }, [navigate]);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    return { error };
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        company,
        loading,
        onboardingRequired,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}