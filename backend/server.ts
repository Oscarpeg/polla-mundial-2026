import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { createAuthRouter } from './src/routes/auth';
import { createMatchesRouter } from './src/routes/matches';
import { createPredictionsRouter } from './src/routes/predictions';
import { createGlobalPredictionsRouter } from './src/routes/globalPredictions';
import { createBracketRouter } from './src/routes/bracket';
import { createLeaderboardRouter } from './src/routes/leaderboard';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.use('/api/auth', createAuthRouter(prisma));
app.use('/api/matches', createMatchesRouter(prisma));
app.use('/api/predictions', createPredictionsRouter(prisma));
app.use('/api/global-predictions', createGlobalPredictionsRouter(prisma));
app.use('/api/bracket', createBracketRouter(prisma));
app.use('/api/leaderboard', createLeaderboardRouter(prisma));

app.use((err: any, req: any, res: any, next: any) => {
  console.error(err);
  res.status(500).json({ error: "INTERNAL_ERROR", message: "Error interno del servidor" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
