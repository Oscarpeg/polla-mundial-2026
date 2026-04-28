import axios from 'axios';
import type {
  AuthResponse,
  BracketStandingInput,
  GlobalPickInput,
  GlobalPrediction,
  LeaderboardEntry,
  Match,
  MatchPhase,
  MatchResultInput,
  PickInput,
  Prediction,
  PreviewResponse,
  ResolveBracketResponse,
  User,
} from '../types';

export const TOKEN_KEY = 'betplay.token';
export const USER_KEY = 'betplay.user';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

// Auth
export async function register(input: { username: string; email: string; password: string }): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/api/auth/register', input);
  return data;
}

export async function login(input: { email: string; password: string }): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/api/auth/login', input);
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await api.get<{ user: User }>('/api/auth/me');
  return data.user;
}

// Matches
export async function getAllMatches(): Promise<Match[]> {
  const { data } = await api.get<{ matches: Match[] }>('/api/matches');
  return data.matches;
}

export async function getMatchesByPhase(phase: MatchPhase): Promise<Match[]> {
  const { data } = await api.get<{ matches: Match[] }>(`/api/matches/phase/${phase}`);
  return data.matches;
}

export async function getMatchesByGroup(group: string): Promise<Match[]> {
  const { data } = await api.get<{ matches: Match[] }>(`/api/matches/group/${group}`);
  return data.matches;
}

export async function updateMatchResult(matchId: string, result: MatchResultInput): Promise<Match> {
  const { data } = await api.put<{ match: Match }>(`/api/matches/${matchId}/result`, result);
  return data.match;
}

// Predictions
export async function getMyPredictions(): Promise<Prediction[]> {
  const { data } = await api.get<{ predictions: Prediction[] }>('/api/predictions/me');
  return data.predictions;
}

export async function getPredictionsPreview(): Promise<PreviewResponse> {
  const { data } = await api.get<PreviewResponse>('/api/predictions/preview');
  return data;
}

export async function savePick(matchId: string, pick: PickInput): Promise<Prediction> {
  const { data } = await api.put<{ prediction: Prediction }>(`/api/predictions/${matchId}`, pick);
  return data.prediction;
}

// Global Predictions
export async function getMyGlobalPrediction(): Promise<GlobalPrediction | null> {
  const { data } = await api.get<{ globalPrediction: GlobalPrediction | null }>('/api/global-predictions/me');
  return data.globalPrediction;
}

export async function saveGlobalPick(input: GlobalPickInput): Promise<GlobalPrediction> {
  const { data } = await api.put<{ globalPrediction: GlobalPrediction }>('/api/global-predictions', input);
  return data.globalPrediction;
}

// Bracket
export async function resolveBracket(input: {
  standings: BracketStandingInput[];
  thirdsQualified: string[];
}): Promise<ResolveBracketResponse> {
  const { data } = await api.post<ResolveBracketResponse>('/api/bracket/resolve', input);
  return data;
}

// Leaderboard
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data } = await api.get<{ leaderboard: LeaderboardEntry[] }>('/api/leaderboard');
  return data.leaderboard;
}
