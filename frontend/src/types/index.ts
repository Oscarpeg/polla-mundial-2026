export type MatchPhase = 'GROUPS' | 'R32' | 'R16' | 'QF' | 'SF' | 'THIRD' | 'FINAL';
export type MatchStatus = 'PENDING' | 'LIVE' | 'FINISHED';

export interface User {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
}

export interface Team {
  id: string;
  name: string;
  code: string;
  group?: string | null;
  flagUrl?: string | null;
}

export interface Match {
  id: string;
  phase: MatchPhase;
  matchday?: number | null;
  scheduledAt: string;
  lockedAt?: string | null;
  venue?: string | null;
  homeTeam?: Team | null;
  awayTeam?: Team | null;
  resultHome90?: number | null;
  resultAway90?: number | null;
  resultHomeET?: number | null;
  resultAwayET?: number | null;
  resultHomePen?: number | null;
  resultAwayPen?: number | null;
  winnerId?: string | null;
  matchStatus: MatchStatus;
}

export interface Prediction {
  id: string;
  userId: string;
  matchId: string;
  pickHome90: number;
  pickAway90: number;
  pickHomeET?: number | null;
  pickAwayET?: number | null;
  pickHomePen?: number | null;
  pickAwayPen?: number | null;
  ptsWinner: number;
  ptsExact: number;
  ptsET: number;
  ptsETExact: number;
  ptsPen: number;
  ptsPenExact: number;
  ptsTotal: number;
  match?: Match;
}

export interface GlobalPrediction {
  id: string;
  userId: string;
  championId?: string | null;
  runnerUpId?: string | null;
  thirdId?: string | null;
  fourthId?: string | null;
  champion?: Team | null;
  runnerUp?: Team | null;
  third?: Team | null;
  fourth?: Team | null;
  ptsTotal: number;
  lockedAt?: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  pointsTotal: number;
  pointsMatches: number;
  pointsGlobal: number;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface PreviewResponse {
  groups: Record<MatchPhase, Prediction[]>;
  globalPrediction: GlobalPrediction | null;
}

export interface BracketStandingInput {
  group: string;
  firstId: string;
  secondId: string;
  thirdId: string;
}

export interface ResolveBracketResponse {
  message: string;
  matches: Match[];
}

export interface PickInput {
  pickHome90: number;
  pickAway90: number;
  pickHomeET?: number | null;
  pickAwayET?: number | null;
  pickHomePen?: number | null;
  pickAwayPen?: number | null;
}

export interface MatchResultInput {
  resultHome90: number;
  resultAway90: number;
  resultHomeET?: number | null;
  resultAwayET?: number | null;
  resultHomePen?: number | null;
  resultAwayPen?: number | null;
}

export interface GlobalPickInput {
  championId: string;
  runnerUpId: string;
  thirdId: string;
  fourthId: string;
}

export interface ApiErrorBody {
  error: string;
  message: string;
}
