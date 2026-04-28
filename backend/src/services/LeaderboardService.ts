import { PrismaClient } from '@prisma/client';

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  username: string;
  pointsTotal: number;
  pointsMatches: number;
  pointsGlobal: number;
};

export class LeaderboardService {
  constructor(private prisma: PrismaClient) {}

  async getRanking(): Promise<LeaderboardEntry[]> {
    const [users, predictionGroups, globalPredictions] = await Promise.all([
      this.prisma.user.findMany({ select: { id: true, username: true } }),
      this.prisma.prediction.groupBy({
        by: ['userId'],
        _sum: { ptsTotal: true },
      }),
      this.prisma.globalPrediction.findMany({
        select: { userId: true, ptsTotal: true },
      }),
    ]);

    const matchPointsByUser = new Map<string, number>();
    for (const g of predictionGroups) {
      matchPointsByUser.set(g.userId, g._sum.ptsTotal ?? 0);
    }

    const globalPointsByUser = new Map<string, number>();
    for (const g of globalPredictions) {
      globalPointsByUser.set(g.userId, g.ptsTotal);
    }

    const rows = users.map((u) => {
      const pointsMatches = matchPointsByUser.get(u.id) ?? 0;
      const pointsGlobal = globalPointsByUser.get(u.id) ?? 0;
      return {
        userId: u.id,
        username: u.username,
        pointsMatches,
        pointsGlobal,
        pointsTotal: pointsMatches + pointsGlobal,
      };
    });

    rows.sort((a, b) => {
      if (b.pointsTotal !== a.pointsTotal) return b.pointsTotal - a.pointsTotal;
      return a.username.localeCompare(b.username);
    });

    // Competition ranking: tied users share the same rank, next rank skips.
    let lastPoints: number | null = null;
    let lastRank = 0;
    return rows.map((r, i) => {
      if (lastPoints === null || r.pointsTotal !== lastPoints) {
        lastRank = i + 1;
        lastPoints = r.pointsTotal;
      }
      return { rank: lastRank, ...r };
    });
  }
}
