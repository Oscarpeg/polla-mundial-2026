import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { PredictionService, PredictionError } from '../services/PredictionService';
import { authenticateToken } from '../middleware/auth';

export function createPredictionsRouter(prisma: PrismaClient): Router {
  const router = Router();
  const service = new PredictionService(prisma);

  router.get('/me', authenticateToken, async (req, res) => {
    const predictions = await service.getMyPredictions(req.user!.id);
    return res.status(200).json({ predictions });
  });

  router.get('/preview', authenticateToken, async (req, res) => {
    const { groups, globalPrediction } = await service.getPreview(req.user!.id);
    return res.status(200).json({ groups, globalPrediction });
  });

  router.put('/:matchId', authenticateToken, async (req, res) => {
    try {
      const prediction = await service.savePick(
        req.user!.id,
        String(req.params.matchId),
        req.body ?? {},
      );
      return res.status(200).json({ prediction });
    } catch (e) {
      if (e instanceof PredictionError) {
        return res.status(e.status).json({ error: e.code, message: e.message });
      }
      console.error(e);
      return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Error interno' });
    }
  });

  return router;
}
