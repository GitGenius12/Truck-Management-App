import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/services/api';
import { ENDPOINTS } from '@/constants/api';

export type UserRole = 'STAFF' | 'MANAGER' | 'DIRECTOR';
export type UserStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  isProfileComplete: boolean;
  profilePhoto?: string;
  favourites?: string[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
}

interface SignupData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
  });

  useEffect(() => {
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      const [token, userJson] = await Promise.all([
        AsyncStorage.getItem('auth_token'),
        AsyncStorage.getItem('auth_user'),
      ]);
      if (token && userJson) {
        setState({ user: JSON.parse(userJson), token, isLoading: false });
      } else {
        setState(s => ({ ...s, isLoading: false }));
      }
    } catch {
      setState(s => ({ ...s, isLoading: false }));
    }
  }

  async function login(email: string, password: string) {
    const res = await api.post<{ token: string; user: User }>(
      ENDPOINTS.LOGIN,
      { email, password }
    );
    await AsyncStorage.multiSet([
      ['auth_token', res.token],
      ['auth_user', JSON.stringify(res.user)],
    ]);
    setState({ user: res.user, token: res.token, isLoading: false });
  }

  async function signup(data: SignupData) {
    await api.post(ENDPOINTS.SIGNUP, data);
  }

  async function logout() {
    await AsyncStorage.multiRemove(['auth_token', 'auth_user']);
    setState({ user: null, token: null, isLoading: false });
  }

  function updateUser(updates: Partial<User>) {
    setState(s => {
      if (!s.user) return s;
      const updated = { ...s.user, ...updates };
      AsyncStorage.setItem('auth_user', JSON.stringify(updated));
      return { ...s, user: updated };
    });
  }

  return (
    <AuthContext.Provider value={{ ...state, login, signup, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
