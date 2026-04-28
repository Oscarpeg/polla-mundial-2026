import { Match, MatchPhase, MatchStatus, Prediction, Prisma, PrismaClient } from '@prisma/client';

type DBClient = PrismaClient | Prisma.TransactionClient;

type PointsBreakdown = {
  ptsWinner: number;
  ptsExact: number;
  ptsET: number;
  ptsETExact: number;
  ptsPen: number;
  ptsPenExact: number;
};

const ZERO_POINTS: PointsBreakdown = {
  ptsWinner: 0,
  ptsExact: 0,
  ptsET: 0,
  ptsETExact: 0,
  ptsPen: 0,
  ptsPenExact: 0,
};

export function sum(p: PointsBreakdown): number {
  return p.ptsWinner + p.ptsExact + p.ptsET + p.ptsETExact + p.ptsPen + p.ptsPenExact;
}

export class ScoringService {
  constructor(private prisma: PrismaClient) {}

  async calculateMatch(matchId: string, client: DBClient = this.prisma): Promise<void> {
    const match = await client.match.findUnique({
      where: { id: matchId },
      include: { predictions: true },
    });
    if (!match) return;
    if (match.matchStatus !== MatchStatus.FINISHED) return;
    if (match.resultHome90 == null || match.resultAway90 == null) return;

    for (const pred of match.predictions) {
      const breakdown = computePoints(match, pred);
      const ptsTotal = sum(breakdown);
      await client.prediction.update({
        where: { id: pred.id },
        data: { ...breakdown, ptsTotal },
      });
    }

    if (match.phase === MatchPhase.THIRD || match.phase === MatchPhase.FINAL) {
      await this.calculateGlobalPredictions(client);
    }
  }

  async calculateGlobalPredictions(client: DBClient = this.prisma): Promise<void> {
    const final = await client.match.findFirst({ where: { phase: MatchPhase.FINAL } });
    const third = await client.match.findFirst({ where: { phase: MatchPhase.THIRD } });
    if (!final || !third) return;
    if (final.matchStatus !== MatchStatus.FINISHED || third.matchStatus !== MatchStatus.FINISHED) return;
    if (!final.winnerId || !third.winnerId) return;
    if (!final.homeTeamId || !final.awayTeamId) return;
    if (!third.homeTeamId || !third.awayTeamId) return;

    const championId = final.winnerId;
    const runnerUpId = final.homeTeamId === championId ? final.awayTeamId : final.homeTeamId;
    const thirdId = third.winnerId;
    const fourthId = third.homeTeamId === thirdId ? third.awayTeamId : third.homeTeamId;

    const globals = await client.globalPrediction.findMany();
    for (const gp of globals) {
      const ptsChampion = gp.championId && gp.championId === championId ? 10 : 0;
      const ptsRunnerUp = gp.runnerUpId && gp.runnerUpId === runnerUpId ? 6 : 0;
      const ptsThird = gp.thirdId && gp.thirdId === thirdId ? 4 : 0;
      const ptsFourth = gp.fourthId && gp.fourthId === fourthId ? 2 : 0;
      const ptsTotal = ptsChampion + ptsRunnerUp + ptsThird + ptsFourth;

      await client.globalPrediction.update({
        where: { id: gp.id },
        data: { ptsChampion, ptsRunnerUp, ptsThird, ptsFourth, ptsTotal },
      });
    }
  }
}

export function computePoints(match: Match, pred: Prediction): PointsBreakdown {
  const h90 = match.resultHome90!;
  const a90 = match.resultAway90!;
  const ph90 = pred.pickHome90;
  const pa90 = pred.pickAway90;
  const exact90 = h90 === ph90 && a90 === pa90;

  if (match.phase === MatchPhase.GROUPS) {
    // In groups, compare outcome letter (Home / Away / Draw).
    const actual = outcome(h90, a90);
    const predicted = outcome(ph90, pa90);
    return {
      ...ZERO_POINTS,
      ptsWinner: actual === predicted ? 1 : 0,
      ptsExact: exact90 ? 2 : 0,
    };
  }

  // Knockout phases
  const predictedWinnerId = determinePredictedWinnerId(match, pred);
  const ptsWinner = match.winnerId && predictedWinnerId && match.winnerId === predictedWinnerId ? 1 : 0;
  const ptsExact = exact90 ? 2 : 0;

  const wentToET = match.resultHomeET != null && match.resultAwayET != null;
  const predictedDraw90 = ph90 === pa90;
  const ptsET = predictedDraw90 && wentToET ? 1 : 0;

  let ptsETExact = 0;
  if (wentToET && pred.pickHomeET != null && pred.pickAwayET != null) {
    if (pred.pickHomeET === match.resultHomeET && pred.pickAwayET === match.resultAwayET) {
      ptsETExact = 1;
    }
  }

  const wentToPens = match.resultHomePen != null && match.resultAwayPen != null;
  const predictedET00 = pred.pickHomeET === 0 && pred.pickAwayET === 0;
  const ptsPen = predictedET00 && wentToPens ? 1 : 0;

  let ptsPenExact = 0;
  if (wentToPens && pred.pickHomePen != null && pred.pickAwayPen != null) {
    if (pred.pickHomePen === match.resultHomePen && pred.pickAwayPen === match.resultAwayPen) {
      ptsPenExact = 2;
    }
  }

  return { ptsWinner, ptsExact, ptsET, ptsETExact, ptsPen, ptsPenExact };
}

function outcome(h: number, a: number): 'H' | 'A' | 'D' {
  if (h > a) return 'H';
  if (a > h) return 'A';
  return 'D';
}

function determinePredictedWinnerId(match: Match, pred: Prediction): string | null {
  const { homeTeamId, awayTeamId } = match;
  if (!homeTeamId || !awayTeamId) return null;

  if (pred.pickHomePen != null && pred.pickAwayPen != null) {
    if (pred.pickHomePen > pred.pickAwayPen) return homeTeamId;
    if (pred.pickAwayPen > pred.pickHomePen) return awayTeamId;
    return null;
  }
  if (pred.pickHomeET != null && pred.pickAwayET != null) {
    if (pred.pickHomeET > pred.pickAwayET) return homeTeamId;
    if (pred.pickAwayET > pred.pickHomeET) return awayTeamId;
    return null;
  }
  if (pred.pickHome90 > pred.pickAway90) return homeTeamId;
  if (pred.pickAway90 > pred.pickHome90) return awayTeamId;
  return null;
}
