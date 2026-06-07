import {

  createContext,

  useCallback,

  useEffect,

  useMemo,

  useState,

  type ReactNode,

} from 'react';

import { useNavigate } from 'react-router-dom';

import { authApi } from '../api/endpoints';

import { getStoredAuth, setStoredAuth, setUnauthorizedHandler } from '../api/client';

import { stopNotificationConnection } from '../api/signalr';

import type { LoginRequest, LoginResponse, Role, User } from '../types';

import { hasRole } from '../utils/roles';



export interface LoginResult {

  requiresTwoFactor: boolean;

  twoFactorUserId?: string;

}



interface AuthContextValue {

  user: User | null;

  isAuthenticated: boolean;

  isLoading: boolean;

  login: (credentials: LoginRequest) => Promise<LoginResult>;

  login2Fa: (userId: string, code: string) => Promise<void>;

  logout: () => void;

  hasRole: (...roles: Role[]) => boolean;

}



export const AuthContext = createContext<AuthContextValue | null>(null);



function persistSession(response: LoginResponse) {

  setStoredAuth({

    accessToken: response.accessToken,

    refreshToken: response.refreshToken,

    expiresAt: response.expiresAt,

  });

  localStorage.setItem('nsms_user', JSON.stringify(response.user));

}



export function AuthProvider({ children }: { children: ReactNode }) {

  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);

  const [isLoading, setIsLoading] = useState(true);



  const logout = useCallback(() => {

    void stopNotificationConnection();

    setStoredAuth(null);

    localStorage.removeItem('nsms_user');

    setUser(null);

    navigate('/login', { replace: true });

  }, [navigate]);



  useEffect(() => {

    setUnauthorizedHandler(logout);

    const stored = getStoredAuth();

    const savedUser = localStorage.getItem('nsms_user');

    if (stored && savedUser) {

      try {

        setUser(JSON.parse(savedUser) as User);

      } catch {

        logout();

      }

    }

    setIsLoading(false);

  }, [logout]);



  const completeLogin = useCallback(

    (response: LoginResponse) => {

      persistSession(response);

      setUser(response.user);

      navigate('/app/dashboard', { replace: true });

    },

    [navigate],

  );



  const login = useCallback(

    async (credentials: LoginRequest): Promise<LoginResult> => {

      const response = await authApi.login(credentials);

      if (response.requiresTwoFactor && response.twoFactorUserId) {

        return {

          requiresTwoFactor: true,

          twoFactorUserId: response.twoFactorUserId,

        };

      }

      completeLogin(response);

      return { requiresTwoFactor: false };

    },

    [completeLogin],

  );



  const login2Fa = useCallback(

    async (userId: string, code: string) => {

      const response = await authApi.login2Fa({ userId, code });

      completeLogin(response);

    },

    [completeLogin],

  );



  const value = useMemo<AuthContextValue>(

    () => ({

      user,

      isAuthenticated: !!user,

      isLoading,

      login,

      login2Fa,

      logout,

      hasRole: (...roles: Role[]) => hasRole(user, ...roles),

    }),

    [user, isLoading, login, login2Fa, logout],

  );



  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;

}


