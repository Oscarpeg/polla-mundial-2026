import { create } from 'zustand';
import type { User } from '../types';
import * as api from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  initFromStorage: () => void;
}

function persist(user: User, token: string) {
  localStorage.setItem(api.TOKEN_KEY, token);
  localStorage.setItem(api.USER_KEY, JSON.stringify(user));
}

function clearPersisted() {
  localStorage.removeItem(api.TOKEN_KEY);
  localStorage.removeItem(api.USER_KEY);
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { user, token } = await api.login({ email, password });
      persist(user, token);
      set({ user, token, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  register: async (username, email, password) => {
    set({ isLoading: true });
    try {
      const { user, token } = await api.register({ username, email, password });
      persist(user, token);
      set({ user, token, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  logout: () => {
    clearPersisted();
    set({ user: null, token: null });
  },

  initFromStorage: () => {
    const token = localStorage.getItem(api.TOKEN_KEY);
    const userJson = localStorage.getItem(api.USER_KEY);
    if (!token || !userJson) return;
    try {
      const user = JSON.parse(userJson) as User;
      set({ user, token });
    } catch {
      clearPersisted();
    }
  },
}));
