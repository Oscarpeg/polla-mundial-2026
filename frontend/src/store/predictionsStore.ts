import { create } from 'zustand';
import type { GlobalPickInput, GlobalPrediction, PickInput, Prediction } from '../types';
import * as api from '../services/api';

interface PredictionsState {
  predictions: Prediction[];
  globalPrediction: GlobalPrediction | null;
  isLoading: boolean;
  fetchMyPredictions: () => Promise<void>;
  savePick: (matchId: string, pick: PickInput) => Promise<Prediction>;
  fetchGlobalPrediction: () => Promise<void>;
  saveGlobalPick: (input: GlobalPickInput) => Promise<GlobalPrediction>;
}

export const usePredictionsStore = create<PredictionsState>((set, get) => ({
  predictions: [],
  globalPrediction: null,
  isLoading: false,

  fetchMyPredictions: async () => {
    set({ isLoading: true });
    try {
      const predictions = await api.getMyPredictions();
      set({ predictions, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  savePick: async (matchId, pick) => {
    const updated = await api.savePick(matchId, pick);
    const current = get().predictions;
    const idx = current.findIndex((p) => p.matchId === matchId);
    if (idx >= 0) {
      const next = current.slice();
      next[idx] = { ...current[idx], ...updated };
      set({ predictions: next });
    } else {
      set({ predictions: [...current, updated] });
    }
    return updated;
  },

  fetchGlobalPrediction: async () => {
    set({ isLoading: true });
    try {
      const globalPrediction = await api.getMyGlobalPrediction();
      set({ globalPrediction, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  saveGlobalPick: async (input) => {
    const updated = await api.saveGlobalPick(input);
    set({ globalPrediction: updated });
    return updated;
  },
}));
