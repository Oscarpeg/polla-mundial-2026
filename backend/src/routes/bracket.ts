import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { BracketService, BracketError } from '../services/BracketService';
import { authenticateToken, requireAdmin } from '../middleware/auth';

export function createBracketRouter(prisma: PrismaClient): Router {
  const router = Router();
  const service = new BracketService(prisma);

  router.post('/resolve', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const matches = await service.resolve(req.body ?? {});
      return res.status(200).json({ message: 'Bracket R32 activado', matches });
    } catch (e) {
      if (e instanceof BracketError) {
        return res.status(e.status).json({ error: e.code, message: e.message });
      }
      console.error(e);
      return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Error interno' });
    }
  });

  return router;
}
