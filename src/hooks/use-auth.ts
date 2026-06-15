import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "admin" | "subscriber" | "driver";

export type AuthState = {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  companyId: string | null;
  expiresAt: string | null;
  isActive: boolean;
  loading: boolean;
  error?: Error | null;
};

const STORAGE_KEY = "rs_auth_profile_v1";

type PersistedProfile = {
  userId: string;
  roles: AppRole[];
  companyId: string | null;
  expiresAt: string | null;
  isActive: boolean;
};

const readPersisted = (): PersistedProfile | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedProfile) : null;
  } catch {
    return null;
  }
};

const writePersisted = (data: PersistedProfile | null) => {
  if (typeof window === "undefined") return;
  try {
    if (data) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
};

// Singleton state to persist between page navigations and prevent "Carregando" flicker
let cachedAuthState: AuthState | null = null;
let subscribers: ((state: AuthState) => void)[] = [];
let inflightProfilePromise: Promise<Omit<PersistedProfile, "userId"> | null> | null = null;
let inflightProfileForId: string | null = null;

const setCachedState = (newState: AuthState) => {
  if (
    cachedAuthState &&
    cachedAuthState.session?.access_token === newState.session?.access_token &&
    cachedAuthState.user?.id === newState.user?.id &&
    cachedAuthState.loading === newState.loading &&
    cachedAuthState.roles.join(",") === newState.roles.join(",") &&
    cachedAuthState.isActive === newState.isActive &&
    cachedAuthState.expiresAt === newState.expiresAt &&
    cachedAuthState.companyId === newState.companyId
  ) {
    return;
  }
  cachedAuthState = newState;
  subscribers.forEach((sub) => sub(newState));
};

export function useAuth() {
  const [state, setState] = useState<AuthState>(() => {
    if (cachedAuthState) return cachedAuthState;
    // Hydrate optimistically from persisted profile so the UI doesn't
    // block on "Carregando experiência..." while supabase.auth.getSession()
    // resolves. If the session ends up invalid, handleAuthChange will
    // immediately reconcile to a logged-out state.
    const persisted = typeof window !== "undefined" ? readPersisted() : null;
    return {
      session: null,
      user: null,
      roles: persisted?.roles ?? [],
      companyId: persisted?.companyId ?? null,
      expiresAt: persisted?.expiresAt ?? null,
      isActive: persisted?.isActive ?? true,
      loading: typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY) ? false : true,

    };
  });


  useEffect(() => {
    subscribers.push(setState);
    let mounted = true;

    const loadProfile = (userId: string, email?: string) => {
      // Share in-flight promise across concurrent callers instead of returning null
      if (inflightProfilePromise && inflightProfileForId === userId) return inflightProfilePromise;

      inflightProfileForId = userId;
      inflightProfilePromise = (async () => {
        try {
          const [rolesRes, profileRes] = await Promise.all([
            supabase.from("user_roles").select("role").eq("user_id", userId),
            supabase
              .from("profiles")
              .select("company_id, expires_at, active, role")
              .or(`user_id.eq.${userId}${email ? `,email.eq.${email}` : ""}`)
              .maybeSingle(),
          ]);

          const profile = profileRes.data;
          const roles = (rolesRes.data?.map((r: any) => r.role) as AppRole[]) ?? [];
          if (profile?.role && !roles.includes(profile.role as AppRole)) {
            roles.push(profile.role as AppRole);
          }
          
          // Sort roles to prioritize admin and subscriber for display purposes
          roles.sort((a, b) => {
            const priority: Record<string, number> = { admin: 0, subscriber: 1, driver: 2 };
            return (priority[a] ?? 99) - (priority[b] ?? 99);
          });

          return {
            roles,
            companyId: profile?.company_id ?? null,
            expiresAt: profile?.expires_at ?? null,
            isActive: profile?.active ?? true,
          };
        } catch (error) {
          console.error("[useAuth] Error loading profile for", userId, error);
          return null;
        } finally {
          // Clear shortly after to allow background refresh on next auth event
          setTimeout(() => {
            if (inflightProfileForId === userId) {
              inflightProfilePromise = null;
              inflightProfileForId = null;
            }
          }, 250);
        }
      })();

      return inflightProfilePromise;
    };

    const handleAuthChange = (session: Session | null, error: Error | null = null) => {
      if (!session) {
        writePersisted(null);
        if (mounted) {
          setCachedState({
            session: null,
            user: null,
            roles: [],
            companyId: null,
            expiresAt: null,
            isActive: true,
            loading: false,
            error,
          });
        }
        return;
      }

      // Hydrate from persisted profile so UI is instant on reloads
      const persisted = readPersisted();
      const prev =
        cachedAuthState && cachedAuthState.user?.id === session.user.id ? cachedAuthState : null;
      const seed =
        persisted && persisted.userId === session.user.id
          ? persisted
          : {
              roles: prev?.roles ?? [],
              companyId: prev?.companyId ?? null,
              expiresAt: prev?.expiresAt ?? null,
              isActive: prev?.isActive ?? true,
            };

      setCachedState({
        session,
        user: session.user,
        roles: seed.roles,
        companyId: seed.companyId,
        expiresAt: seed.expiresAt,
        isActive: seed.isActive,
        loading: false,
        error: null,
      });

      // Background refresh of profile/roles
      loadProfile(session.user.id, session.user.email).then((extra) => {
        if (!mounted || !extra) return;
        writePersisted({ userId: session.user.id, ...extra });
        setCachedState({
          session,
          user: session.user,
          ...extra,
          loading: false,
        });
      });
    };

    // Initial session check
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (mounted) handleAuthChange(session, error);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_OUT") {
        writePersisted(null);
        inflightProfilePromise = null;
        inflightProfileForId = null;
        setCachedState({
          session: null,
          user: null,
          roles: [],
          companyId: null,
          expiresAt: null,
          isActive: true,
          loading: false,
        });
      } else {
        handleAuthChange(session);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      subscribers = subscribers.filter((s) => s !== setState);
    };
  }, []);

  return state;
}

export const hasRole = (roles: AppRole[], role: AppRole) => roles?.includes(role) ?? false;
