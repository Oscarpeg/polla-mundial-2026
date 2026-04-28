import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { LeaderboardService } from '../services/LeaderboardService';

export function createLeaderboardRouter(prisma: PrismaClient): Router {
  const router = Router();
  const service = new LeaderboardService(prisma);

  router.get('/', async (_req, res) => {
    const leaderboard = await service.getRanking();
    return res.status(200).json({ leaderboard });
  });

  return router;
}
