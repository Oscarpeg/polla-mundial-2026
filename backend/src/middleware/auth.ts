import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  id: string;
  email: string;
  isAdmin: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Token requerido',
    });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({
      error: 'SERVER_CONFIG',
      message: 'JWT_SECRET no configurado',
    });
  }

  try {
    const payload = jwt.verify(token, secret) as jwt.JwtPayload & AuthUser;
    req.user = {
      id: payload.id,
      email: payload.email,
      isAdmin: Boolean(payload.isAdmin),
    };
    next();
  } catch {
    return res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Token inválido o expirado',
    });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Requiere permisos de administrador',
    });
  }
  next();
}
