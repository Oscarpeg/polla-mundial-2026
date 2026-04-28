import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  GlobalPredictionService,
  GlobalPredictionError,
} from '../services/GlobalPredictionService';
import { authenticateToken } from '../middleware/auth';

export function createGlobalPredictionsRouter(prisma: PrismaClient): Router {
  const router = Router();
  const service = new GlobalPredictionService(prisma);

  router.get('/me', authenticateToken, async (req, res) => {
    const globalPrediction = await service.getMyGlobalPrediction(req.user!.id);
    return res.status(200).json({ globalPrediction });
  });

  router.put('/', authenticateToken, async (req, res) => {
    try {
      const globalPrediction = await service.saveGlobalPick(req.user!.id, req.body ?? {});
      return res.status(200).json({ globalPrediction });
    } catch (e) {
      if (e instanceof GlobalPredictionError) {
        return res.status(e.status).json({ error: e.code, message: e.message });
      }
      console.error(e);
      return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Error interno' });
    }
  });

  return router;
}
