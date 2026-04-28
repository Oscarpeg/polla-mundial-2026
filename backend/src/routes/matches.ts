import { Router } from 'express';
import { MatchPhase, PrismaClient } from '@prisma/client';
import { MatchService, MatchError } from '../services/MatchService';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const VALID_PHASES = new Set<string>(Object.values(MatchPhase));

export function createMatchesRouter(prisma: PrismaClient): Router {
  const router = Router();
  const matchService = new MatchService(prisma);

  router.get('/', async (_req, res) => {
    const matches = await matchService.getAllMatches();
    return res.status(200).json({ matches });
  });

  router.get('/phase/:phase', async (req, res) => {
    const raw = String(req.params.phase ?? '').toUpperCase();
    if (!VALID_PHASES.has(raw)) {
      return res.status(400).json({ error: 'INVALID_PHASE', message: 'Fase inválida' });
    }
    const matches = await matchService.getMatchesByPhase(raw as MatchPhase);
    return res.status(200).json({ matches });
  });

  router.get('/group/:group', async (req, res) => {
    const group = String(req.params.group ?? '').toUpperCase();
    const matches = await matchService.getMatchesByGroup(group);
    return res.status(200).json({ matches });
  });

  router.put(
    '/:matchId/result',
    authenticateToken,
    requireAdmin,
    async (req, res) => {
      try {
        const match = await matchService.updateResult(
          String(req.params.matchId),
          req.body ?? {},
          req.user!.id,
        );
        return res.status(200).json({ match });
      } catch (e) {
        if (e instanceof MatchError) {
          return res.status(e.status).json({ error: e.code, message: e.message });
        }
        console.error(e);
        return res
          .status(500)
          .json({ error: 'INTERNAL_ERROR', message: 'Error interno' });
      }
    },
  );

  return router;
}
