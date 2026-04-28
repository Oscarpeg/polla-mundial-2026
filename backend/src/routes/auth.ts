import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthService, AuthError } from '../services/AuthService';
import { authenticateToken } from '../middleware/auth';

export function createAuthRouter(prisma: PrismaClient): Router {
  const router = Router();
  const authService = new AuthService(prisma);

  router.post('/register', async (req, res) => {
    const { username, email, password } = req.body ?? {};
    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Todos los campos son requeridos',
      });
    }
    try {
      const result = await authService.register(username, email, password);
      return res.status(200).json(result);
    } catch (e) {
      if (e instanceof AuthError) {
        return res.status(e.status).json({ error: e.code, message: e.message });
      }
      console.error(e);
      return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Error interno' });
    }
  });

  router.post('/login', async (req, res) => {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Todos los campos son requeridos',
      });
    }
    try {
      const result = await authService.login(email, password);
      return res.status(200).json(result);
    } catch (e) {
      if (e instanceof AuthError) {
        return res.status(e.status).json({ error: e.code, message: e.message });
      }
      console.error(e);
      return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Error interno' });
    }
  });

  router.get('/me', authenticateToken, async (req, res) => {
    const authUser = req.user!;
    const user = await prisma.user.findUnique({ where: { id: authUser.id } });
    if (!user) {
      return res.status(401).json({
        error: 'INVALID_TOKEN',
        message: 'Token inválido o expirado',
      });
    }
    return res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
      },
    });
  });

  return router;
}
