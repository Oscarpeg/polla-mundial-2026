import { create } from 'zustand';
import type { Match } from '../types';
import * as api from '../services/api';

interface MatchesState {
  matches: Match[];
  isLoaded: boolean;
  isLoading: boolean;
  fetchAll: () => Promise<void>;
  updateMatchLocal: (m: Match) => void;
}

export const useMatchesStore = create<MatchesState>((set, get) => ({
  matches: [],
  isLoaded: false,
  isLoading: false,

  fetchAll: async () => {
    if (get().isLoading) return;
    set({ isLoading: true });
    try {
      const matches = await api.getAllMatches();
      set({ matches, isLoaded: true, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  updateMatchLocal: (m) => {
    const matches = get().matches.map((x) => (x.id === m.id ? m : x));
    set({ matches });
  },
}));
