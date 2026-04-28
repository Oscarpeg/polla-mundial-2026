import { Match, MatchPhase, MatchStatus, Prediction } from '@prisma/client';
import { computePoints, sum } from '../src/services/ScoringService';
import { PredictionService } from '../src/services/PredictionService';

function makeMatch(overrides: Partial<Match> & { phase: MatchPhase }): Match {
  return {
    id: 'match-1',
    matchday: overrides.phase === MatchPhase.GROUPS ? 1 : null,
    scheduledAt: new Date('2026-06-15T18:00:00Z'),
    lockedAt: null,
    venue: null,
    homeTeamId: 'home-team',
    awayTeamId: 'away-team',
    resultHome90: null,
    resultAway90: null,
    resultHomeET: null,
    resultAwayET: null,
    resultHomePen: null,
    resultAwayPen: null,
    winnerId: null,
    matchStatus: MatchStatus.FINISHED,
    ...overrides,
  } as Match;
}

function makePrediction(overrides: Partial<Prediction> = {}): Prediction {
  return {
    id: 'pred-1',
    userId: 'user-1',
    matchId: 'match-1',
    pickHome90: 0,
    pickAway90: 0,
    pickHomeET: null,
    pickAwayET: null,
    pickHomePen: null,
    pickAwayPen: null,
    ptsWinner: 0,
    ptsExact: 0,
    ptsET: 0,
    ptsETExact: 0,
    ptsPen: 0,
    ptsPenExact: 0,
    ptsTotal: 0,
    createdAt: new Date('2026-06-01T00:00:00Z'),
    updatedAt: new Date('2026-06-01T00:00:00Z'),
    ...overrides,
  };
}

describe('computePoints — fase de grupos', () => {
  test('Caso 1: pick 2-1, resultado 2-1 → ptsWinner=1, ptsExact=2, ptsTotal=3', () => {
    const match = makeMatch({
      phase: MatchPhase.GROUPS,
      resultHome90: 2,
      resultAway90: 1,
    });
    const pred = makePrediction({ pickHome90: 2, pickAway90: 1 });

    const b = computePoints(match, pred);

    expect(b.ptsWinner).toBe(1);
    expect(b.ptsExact).toBe(2);
    expect(b.ptsET).toBe(0);
    expect(b.ptsETExact).toBe(0);
    expect(b.ptsPen).toBe(0);
    expect(b.ptsPenExact).toBe(0);
    expect(sum(b)).toBe(3);
  });

  test('Caso 2: pick 1-0, resultado 2-0 → ptsWinner=1, ptsExact=0, ptsTotal=1', () => {
    const match = makeMatch({
      phase: MatchPhase.GROUPS,
      resultHome90: 2,
      resultAway90: 0,
    });
    const pred = makePrediction({ pickHome90: 1, pickAway90: 0 });

    const b = computePoints(match, pred);

    expect(b.ptsWinner).toBe(1);
    expect(b.ptsExact).toBe(0);
    expect(sum(b)).toBe(1);
  });

  test('Caso 3: pick 0-0, resultado 1-0 → ptsWinner=0, ptsExact=0, ptsTotal=0', () => {
    const match = makeMatch({
      phase: MatchPhase.GROUPS,
      resultHome90: 1,
      resultAway90: 0,
    });
    const pred = makePrediction({ pickHome90: 0, pickAway90: 0 });

    const b = computePoints(match, pred);

    expect(b.ptsWinner).toBe(0);
    expect(b.ptsExact).toBe(0);
    expect(sum(b)).toBe(0);
  });
});

describe('computePoints — fase eliminatoria', () => {
  test('Caso 4: pick 1-1 ET 2-1, resultado 1-1 ET 2-1 → winner=1, exact=2, ET=1, ETExact=1, total=5', () => {
    const match = makeMatch({
      phase: MatchPhase.R16,
      resultHome90: 1,
      resultAway90: 1,
      resultHomeET: 2,
      resultAwayET: 1,
      winnerId: 'home-team',
    });
    const pred = makePrediction({
      pickHome90: 1,
      pickAway90: 1,
      pickHomeET: 2,
      pickAwayET: 1,
    });

    const b = computePoints(match, pred);

    expect(b.ptsWinner).toBe(1);
    expect(b.ptsExact).toBe(2);
    expect(b.ptsET).toBe(1);
    expect(b.ptsETExact).toBe(1);
    expect(b.ptsPen).toBe(0);
    expect(b.ptsPenExact).toBe(0);
    expect(sum(b)).toBe(5);
  });

  test('Caso 5: pick 0-0 ET 0-0 PEN 4-2, resultado idéntico → winner=1, exact=2, ET=1, ETExact=1, PEN=1, PENExact=2, total=8', () => {
    const match = makeMatch({
      phase: MatchPhase.R16,
      resultHome90: 0,
      resultAway90: 0,
      resultHomeET: 0,
      resultAwayET: 0,
      resultHomePen: 4,
      resultAwayPen: 2,
      winnerId: 'home-team',
    });
    const pred = makePrediction({
      pickHome90: 0,
      pickAway90: 0,
      pickHomeET: 0,
      pickAwayET: 0,
      pickHomePen: 4,
      pickAwayPen: 2,
    });

    const b = computePoints(match, pred);

    expect(b.ptsWinner).toBe(1);
    expect(b.ptsExact).toBe(2);
    expect(b.ptsET).toBe(1);
    expect(b.ptsETExact).toBe(1);
    expect(b.ptsPen).toBe(1);
    expect(b.ptsPenExact).toBe(2);
    expect(sum(b)).toBe(8);
  });
});

describe('PredictionService.savePick — deadline', () => {
  test('Caso 6: intentar guardar pick después del kickoff → MATCH_LOCKED', async () => {
    const pastMatch = {
      id: 'm1',
      phase: MatchPhase.GROUPS,
      scheduledAt: new Date(Date.now() - 60 * 1000),
      lockedAt: null,
    };
    const fakePrisma = {
      match: { findUnique: async () => pastMatch },
    } as any;

    const service = new PredictionService(fakePrisma);

    await expect(
      service.savePick('user-1', 'm1', { pickHome90: 1, pickAway90: 0 }),
    ).rejects.toMatchObject({ code: 'MATCH_LOCKED' });
  });
});
