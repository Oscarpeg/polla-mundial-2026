import { Match, MatchPhase, PrismaClient } from '@prisma/client';

export class PredictionError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export type PickInput = {
  pickHome90: number;
  pickAway90: number;
  pickHomeET?: number | null;
  pickAwayET?: number | null;
  pickHomePen?: number | null;
  pickAwayPen?: number | null;
};

export class PredictionService {
  constructor(private prisma: PrismaClient) {}

  async savePick(userId: string, matchId: string, input: PickInput) {
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) {
      throw new PredictionError('MATCH_NOT_FOUND', 'Partido no encontrado', 404);
    }

    const now = Date.now();
    if (match.lockedAt && now > match.lockedAt.getTime()) {
      throw new PredictionError(
        'MATCH_LOCKED',
        'Este partido ya comenzó, no puedes modificar tu pick',
      );
    }
    if (!match.lockedAt && match.scheduledAt.getTime() < now) {
      throw new PredictionError(
        'MATCH_LOCKED',
        'Este partido ya comenzó, no puedes modificar tu pick',
      );
    }

    const validationError = validatePickShape(match, input);
    if (validationError) {
      throw new PredictionError('VALIDATION_ERROR', validationError);
    }

    const data = {
      pickHome90: input.pickHome90,
      pickAway90: input.pickAway90,
      pickHomeET: input.pickHomeET ?? null,
      pickAwayET: input.pickAwayET ?? null,
      pickHomePen: input.pickHomePen ?? null,
      pickAwayPen: input.pickAwayPen ?? null,
    };

    return this.prisma.prediction.upsert({
      where: { userId_matchId: { userId, matchId } },
      update: data,
      create: { userId, matchId, ...data },
    });
  }

  async getMyPredictions(userId: string) {
    return this.prisma.prediction.findMany({
      where: { userId },
      include: { match: { include: { homeTeam: true, awayTeam: true } } },
      orderBy: { match: { scheduledAt: 'asc' } },
    });
  }

  async getMyPredictionForMatch(userId: string, matchId: string) {
    return this.prisma.prediction.findUnique({
      where: { userId_matchId: { userId, matchId } },
    });
  }

  async getPreview(userId: string) {
    const predictions = await this.prisma.prediction.findMany({
      where: { userId },
      include: { match: { include: { homeTeam: true, awayTeam: true } } },
      orderBy: { match: { scheduledAt: 'asc' } },
    });

    type PredictionRow = (typeof predictions)[number];
    const groups: Record<MatchPhase, PredictionRow[]> = {
      GROUPS: [],
      R32: [],
      R16: [],
      QF: [],
      SF: [],
      THIRD: [],
      FINAL: [],
    };
    for (const p of predictions) {
      groups[p.match.phase].push(p);
    }

    const globalPrediction = await this.prisma.globalPrediction.findUnique({
      where: { userId },
      include: { champion: true, runnerUp: true, third: true, fourth: true },
    });

    return { groups, globalPrediction };
  }
}

function isNonNegativeInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0;
}

function validatePickShape(match: Match, p: PickInput): string | null {
  if (!isNonNegativeInt(p.pickHome90)) {
    return 'pickHome90 debe ser un entero no negativo';
  }
  if (!isNonNegativeInt(p.pickAway90)) {
    return 'pickAway90 debe ser un entero no negativo';
  }

  const etHomeSet = p.pickHomeET != null;
  const etAwaySet = p.pickAwayET != null;
  const penHomeSet = p.pickHomePen != null;
  const penAwaySet = p.pickAwayPen != null;

  if (match.phase === MatchPhase.GROUPS) {
    if (etHomeSet || etAwaySet || penHomeSet || penAwaySet) {
      return 'los partidos de grupos no admiten picks de prórroga ni penales';
    }
    return null;
  }

  // Knockout rules
  if (etHomeSet !== etAwaySet) {
    return 'pickHomeET y pickAwayET deben proveerse juntos';
  }
  if (etHomeSet) {
    const draw90 = p.pickHome90 === p.pickAway90;
    if (!draw90) {
      return 'solo se aceptan picks de prórroga cuando los 90 min se predicen como empate';
    }
    if (!isNonNegativeInt(p.pickHomeET)) return 'pickHomeET debe ser un entero no negativo';
    if (!isNonNegativeInt(p.pickAwayET)) return 'pickAwayET debe ser un entero no negativo';
    if ((p.pickHomeET as number) < p.pickHome90 || (p.pickAwayET as number) < p.pickAway90) {
      return 'los goles en prórroga son acumulados; no pueden ser menores que los de 90 min';
    }
  }

  if (penHomeSet !== penAwaySet) {
    return 'pickHomePen y pickAwayPen deben proveerse juntos';
  }
  if (penHomeSet) {
    if (!etHomeSet) {
      return 'los penales requieren también picks de prórroga';
    }
    if (p.pickHomeET !== 0 || p.pickAwayET !== 0) {
      return 'solo se aceptan picks de penales cuando la prórroga se predice como 0-0';
    }
    if (!isNonNegativeInt(p.pickHomePen)) return 'pickHomePen debe ser un entero no negativo';
    if (!isNonNegativeInt(p.pickAwayPen)) return 'pickAwayPen debe ser un entero no negativo';
    if (p.pickHomePen === p.pickAwayPen) {
      return 'los penales no pueden quedar empatados';
    }
  }

  return null;
}
