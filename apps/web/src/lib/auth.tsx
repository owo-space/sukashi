import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { apiGet, apiPost, readAuthData, writeAuthData } from "./api";

interface LoginResponse {
  token: string;
  is_admin: boolean;
  auth_data: string;
}

interface CheckLoginResponse {
  is_login: boolean;
  is_admin?: boolean;
}

interface AuthState {
  loading: boolean;
  authed: boolean;
  isAdmin: boolean;
}

interface AuthContextValue extends AuthState {
  login(email: string, password: string, opts?: { emailCode?: string }): Promise<LoginResponse>;
  register(input: {
    email: string;
    password: string;
    invite_code?: string;
    email_code?: string;
  }): Promise<LoginResponse>;
  forget(input: { email: string; password: string; email_code: string }): Promise<LoginResponse>;
  logout(): void;
  refresh(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => ({
    loading: true,
    authed: Boolean(readAuthData()),
    isAdmin: false
  }));

  const refresh = useCallback(async () => {
    try {
      const r = await apiGet<CheckLoginResponse>("/user/checkLogin");
      setState({
        loading: false,
        authed: Boolean(r.is_login),
        isAdmin: Boolean(r.is_admin)
      });
    } catch {
      setState({ loading: false, authed: false, isAdmin: false });
    }
  }, []);

  useEffect(() => {
    if (readAuthData()) {
      void refresh();
    } else {
      setState({ loading: false, authed: false, isAdmin: false });
    }
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const r = await apiPost<LoginResponse>("/passport/auth/login", { email, password });
      writeAuthData(r.auth_data);
      setState({ loading: false, authed: true, isAdmin: Boolean(r.is_admin) });
      return r;
    },
    []
  );

  const register = useCallback<AuthContextValue["register"]>(async (input) => {
    const r = await apiPost<LoginResponse>("/passport/auth/register", input);
    writeAuthData(r.auth_data);
    setState({ loading: false, authed: true, isAdmin: Boolean(r.is_admin) });
    return r;
  }, []);

  const forget = useCallback<AuthContextValue["forget"]>(async (input) => {
    const r = await apiPost<LoginResponse>("/passport/auth/forget", input);
    writeAuthData(r.auth_data);
    setState({ loading: false, authed: true, isAdmin: Boolean(r.is_admin) });
    return r;
  }, []);

  const logout = useCallback(() => {
    writeAuthData(null);
    setState({ loading: false, authed: false, isAdmin: false });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, register, forget, logout, refresh }),
    [state, login, register, forget, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside <AuthProvider>");
  return ctx;
}
