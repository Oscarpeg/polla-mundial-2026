import { PrismaClient } from '@prisma/client';

export class GlobalPredictionError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export type GlobalPickInput = {
  championId: string;
  runnerUpId: string;
  thirdId: string;
  fourthId: string;
};

// 11 junio 2026 11:00 AM UTC-5 (hora Colombia) = 16:00 UTC
export const GLOBAL_PREDICTION_DEADLINE = new Date('2026-06-11T16:00:00Z');

const globalInclude = {
  champion: true,
  runnerUp: true,
  third: true,
  fourth: true,
} as const;

export class GlobalPredictionService {
  constructor(private prisma: PrismaClient) {}

  async saveGlobalPick(userId: string, input: GlobalPickInput) {
    if (Date.now() > GLOBAL_PREDICTION_DEADLINE.getTime()) {
      throw new GlobalPredictionError(
        'GLOBAL_DEADLINE_PASSED',
        'El plazo para predicciones globales ya pasó',
      );
    }

    const fields: (keyof GlobalPickInput)[] = ['championId', 'runnerUpId', 'thirdId', 'fourthId'];
    for (const f of fields) {
      if (!input[f] || typeof input[f] !== 'string') {
        throw new GlobalPredictionError('VALIDATION_ERROR', `${f} es requerido`);
      }
    }

    const ids = fields.map((f) => input[f]);
    if (new Set(ids).size !== ids.length) {
      throw new GlobalPredictionError(
        'DUPLICATE_TEAMS',
        'No puedes elegir el mismo equipo en dos posiciones',
      );
    }

    const teams = await this.prisma.team.findMany({ where: { id: { in: ids } } });
    if (teams.length !== ids.length) {
      throw new GlobalPredictionError('VALIDATION_ERROR', 'Algún equipo seleccionado no existe');
    }

    return this.prisma.globalPrediction.upsert({
      where: { userId },
      update: {
        championId: input.championId,
        runnerUpId: input.runnerUpId,
        thirdId: input.thirdId,
        fourthId: input.fourthId,
      },
      create: {
        userId,
        championId: input.championId,
        runnerUpId: input.runnerUpId,
        thirdId: input.thirdId,
        fourthId: input.fourthId,
      },
      include: globalInclude,
    });
  }

  async getMyGlobalPrediction(userId: string) {
    return this.prisma.globalPrediction.findUnique({
      where: { userId },
      include: globalInclude,
    });
  }
}
