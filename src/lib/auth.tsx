import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Role } from "@/lib/cdar-data";
import {
  apiLogin,
  apiLogout,
  apiMe,
  apiUpdateMe,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
  type ApiUser,
} from "@/lib/api";

export type SessionUser = {
  id: number;
  full_name: string;
  email: string;
  student_id: string | null;
  staff_id: string | null;
  role: Role;
  department: string;
  program: string;
  level: number;
  semester: number;
  phone_number: string;
  date_of_birth: string | null;
  gender: string;
  nationality: string;
  address: string;
  profile_picture: string | null;
};

const STORAGE_KEY = "cdar-session";

const toSessionUser = (u: ApiUser): SessionUser => ({
  id: u.id,
  full_name: u.full_name,
  email: u.email,
  student_id: u.student_id,
  staff_id: u.staff_id,
  role: u.role,
  department: u.department ?? "",
  program: u.program ?? "",
  level: u.level,
  semester: u.semester,
  phone_number: u.phone_number ?? "",
  date_of_birth: u.date_of_birth ?? null,
  gender: u.gender ?? "",
  nationality: u.nationality ?? "",
  address: u.address ?? "",
  profile_picture: u.profile_picture ?? null,
});

export const roleHome: Record<Role, string> = {
  student: "/student",
  lecturer: "/lecturer",
  admin: "/admin",
};

export const roleLogin: Record<Role, string> = {
  student: "/student/login",
  lecturer: "/lecturer/login",
  admin: "/admin/login",
};

type SignInInput = {
  identifier: string;
  password: string;
};

type AuthValue = {
  user: SessionUser | null;
  ready: boolean;
  signIn: (role: Role, input: SignInInput) => Promise<SessionUser>;
  signOut: () => Promise<void>;
  updateUser: (payload: FormData) => Promise<void>;
};

const AuthContext = createContext<AuthValue>({
  user: null,
  ready: false,
  signIn: async () => {
    throw new Error("AuthProvider not mounted");
  },
  signOut: async () => {},
  updateUser: async () => {},
});

function writeStoredSession(user: SessionUser | null) {
  if (user) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  else window.localStorage.removeItem(STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      const access = getAccessToken();

      if (!access) {
        if (!cancelled) {
          writeStoredSession(null);
          setUser(null);
          setReady(true);
        }
        return;
      }

      try {
        const me = await apiMe();
        if (!cancelled) {
          const session = toSessionUser(me);
          writeStoredSession(session);
          setUser(session);
        }
      } catch {
        // Token invalid/expired and no refresh available — drop the session.
        clearTokens();
        if (!cancelled) {
          writeStoredSession(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      ready,
      signIn: async (role, { identifier, password }) => {
        const res = await apiLogin(identifier, password);
        if (res.user.role !== role) {
          throw new Error(`This account belongs to the ${res.user.role} portal.`);
        }
        setTokens(res.access_token, res.refresh_token);
        const session = toSessionUser(res.user);
        writeStoredSession(session);
        setUser(session);
        return session;
      },
      signOut: async () => {
        await apiLogout(getRefreshToken());
        clearTokens();
        writeStoredSession(null);
        setUser(null);
      },
      updateUser: async (payload) => {
        const next = await apiUpdateMe(payload);
        const session = toSessionUser(next);
        writeStoredSession(session);
        setUser(session);
      },
    }),
    [user, ready],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
