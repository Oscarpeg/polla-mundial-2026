import { PrismaClient, User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';

export class AuthError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export type PublicUser = {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
};

export type AuthResult = {
  user: PublicUser;
  token: string;
};

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    isAdmin: user.isAdmin,
  };
}

export class AuthService {
  constructor(private prisma: PrismaClient) {}

  generateToken(userId: string, email: string, isAdmin: boolean): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET no configurado');
    const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];
    return jwt.sign({ id: userId, email, isAdmin }, secret, { expiresIn });
  }

  async register(username: string, email: string, password: string): Promise<AuthResult> {
    const existingEmail = await this.prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      throw new AuthError('EMAIL_TAKEN', 'El email ya está registrado');
    }
    const existingUsername = await this.prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      throw new AuthError('USERNAME_TAKEN', 'El nombre de usuario ya está en uso');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { username, email, passwordHash },
    });

    const token = this.generateToken(user.id, user.email, user.isAdmin);
    return { user: toPublicUser(user), token };
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AuthError('INVALID_CREDENTIALS', 'Email o contraseña incorrectos', 401);
    }
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      throw new AuthError('INVALID_CREDENTIALS', 'Email o contraseña incorrectos', 401);
    }
    const token = this.generateToken(user.id, user.email, user.isAdmin);
    return { user: toPublicUser(user), token };
  }
}
