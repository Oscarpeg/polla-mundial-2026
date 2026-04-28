import { Match, MatchPhase, MatchStatus, PrismaClient } from '@prisma/client';
import { ScoringService } from './ScoringService';

type Slot = 'homeTeamId' | 'awayTeamId';

type NextSlotPlan = {
  matchId: string;
  slot: Slot;
  teamId: string;
};

export class MatchError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export type MatchResultInput = {
  resultHome90: number;
  resultAway90: number;
  resultHomeET?: number | null;
  resultAwayET?: number | null;
  resultHomePen?: number | null;
  resultAwayPen?: number | null;
};

const matchInclude = { homeTeam: true, awayTeam: true } as const;

export class MatchService {
  private scoringService: ScoringService;

  constructor(private prisma: PrismaClient, scoringService?: ScoringService) {
    this.scoringService = scoringService ?? new ScoringService(prisma);
  }

  async getAllMatches() {
    return this.prisma.match.findMany({
      include: matchInclude,
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async getMatchesByPhase(phase: MatchPhase) {
    return this.prisma.match.findMany({
      where: { phase },
      include: matchInclude,
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async getMatchesByGroup(group: string) {
    return this.prisma.match.findMany({
      where: {
        phase: MatchPhase.GROUPS,
        OR: [{ homeTeam: { group } }, { awayTeam: { group } }],
      },
      include: matchInclude,
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async updateResult(matchId: string, input: MatchResultInput, _adminId: string) {
    const validationError = validateResultInput(input);
    if (validationError) {
      throw new MatchError('INVALID_RESULT', validationError);
    }

    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) {
      throw new MatchError('MATCH_NOT_FOUND', 'Partido no encontrado', 404);
    }

    const knockoutError = validateKnockoutRules(match, input);
    if (knockoutError) {
      throw new MatchError('INVALID_RESULT', knockoutError);
    }

    const winnerId = computeWinner(match, input);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.match.update({
        where: { id: matchId },
        data: {
          resultHome90: input.resultHome90,
          resultAway90: input.resultAway90,
          resultHomeET: input.resultHomeET ?? null,
          resultAwayET: input.resultAwayET ?? null,
          resultHomePen: input.resultHomePen ?? null,
          resultAwayPen: input.resultAwayPen ?? null,
          winnerId,
          matchStatus: MatchStatus.FINISHED,
        },
        include: matchInclude,
      });

      await this.scoringService.calculateMatch(matchId, tx);

      if (winnerId && isPropagatingPhase(updated.phase)) {
        const plans = planBracketPropagation(updated, winnerId);
        for (const plan of plans) {
          await tx.match.update({
            where: { id: plan.matchId },
            data: { [plan.slot]: plan.teamId },
          });
        }
      }

      return updated;
    });
  }
}

function isPropagatingPhase(phase: MatchPhase): boolean {
  return (
    phase === MatchPhase.R32 ||
    phase === MatchPhase.R16 ||
    phase === MatchPhase.QF ||
    phase === MatchPhase.SF
  );
}

function planBracketPropagation(match: Match, winnerId: string): NextSlotPlan[] {
  const num = parseMatchNumber(match.id);
  if (num == null) return [];

  if (match.phase === MatchPhase.R32) {
    return [
      {
        matchId: `R16-${Math.ceil(num / 2)}`,
        slot: num % 2 === 1 ? 'homeTeamId' : 'awayTeamId',
        teamId: winnerId,
      },
    ];
  }

  if (match.phase === MatchPhase.R16) {
    return [
      {
        matchId: `QF-${Math.ceil(num / 2)}`,
        slot: num % 2 === 1 ? 'homeTeamId' : 'awayTeamId',
        teamId: winnerId,
      },
    ];
  }

  if (match.phase === MatchPhase.QF) {
    return [
      {
        matchId: `SF-${Math.ceil(num / 2)}`,
        slot: num % 2 === 1 ? 'homeTeamId' : 'awayTeamId',
        teamId: winnerId,
      },
    ];
  }

  if (match.phase === MatchPhase.SF) {
    if (!match.homeTeamId || !match.awayTeamId) return [];
    const loserId = winnerId === match.homeTeamId ? match.awayTeamId : match.homeTeamId;
    const slot: Slot = num === 1 ? 'homeTeamId' : 'awayTeamId';
    return [
      { matchId: 'FINAL', slot, teamId: winnerId },
      { matchId: '3RD', slot, teamId: loserId },
    ];
  }

  return [];
}

function parseMatchNumber(id: string): number | null {
  const m = id.match(/^(?:R32|R16|QF|SF)-(\d+)$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isNaN(n) ? null : n;
}

function isNonNegativeInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0;
}

function validateResultInput(input: MatchResultInput): string | null {
  if (!isNonNegativeInt(input.resultHome90)) {
    return 'resultHome90 debe ser un entero no negativo';
  }
  if (!isNonNegativeInt(input.resultAway90)) {
    return 'resultAway90 debe ser un entero no negativo';
  }

  const etHomeSet = input.resultHomeET != null;
  const etAwaySet = input.resultAwayET != null;
  if (etHomeSet !== etAwaySet) {
    return 'resultHomeET y resultAwayET deben proveerse juntos';
  }
  if (etHomeSet) {
    if (!isNonNegativeInt(input.resultHomeET)) return 'resultHomeET debe ser un entero no negativo';
    if (!isNonNegativeInt(input.resultAwayET)) return 'resultAwayET debe ser un entero no negativo';
    if ((input.resultHomeET as number) < input.resultHome90) {
      return 'resultHomeET debe incluir los goles de los 90 min (no puede ser menor)';
    }
    if ((input.resultAwayET as number) < input.resultAway90) {
      return 'resultAwayET debe incluir los goles de los 90 min (no puede ser menor)';
    }
  }

  const penHomeSet = input.resultHomePen != null;
  const penAwaySet = input.resultAwayPen != null;
  if (penHomeSet !== penAwaySet) {
    return 'resultHomePen y resultAwayPen deben proveerse juntos';
  }
  if (penHomeSet) {
    if (!isNonNegativeInt(input.resultHomePen)) return 'resultHomePen debe ser un entero no negativo';
    if (!isNonNegativeInt(input.resultAwayPen)) return 'resultAwayPen debe ser un entero no negativo';
    if (!etHomeSet) {
      return 'los penales requieren también resultados de prórroga';
    }
  }

  return null;
}

function validateKnockoutRules(match: Match, input: MatchResultInput): string | null {
  if (match.phase === MatchPhase.GROUPS) return null;

  const tied90 = input.resultHome90 === input.resultAway90;
  if (!tied90) return null;

  const etSet = input.resultHomeET != null && input.resultAwayET != null;
  if (!etSet) {
    return 'partido eliminatorio empatado en 90 min requiere resultados de prórroga';
  }

  const tiedET = input.resultHomeET === input.resultAwayET;
  if (!tiedET) return null;

  const penSet = input.resultHomePen != null && input.resultAwayPen != null;
  if (!penSet) {
    return 'partido eliminatorio empatado tras la prórroga requiere resultados de penales';
  }
  if (input.resultHomePen === input.resultAwayPen) {
    return 'los penales no pueden quedar empatados';
  }
  return null;
}

function computeWinner(match: Match, input: MatchResultInput): string | null {
  const { homeTeamId, awayTeamId } = match;
  if (!homeTeamId || !awayTeamId) return null;

  if (input.resultHomePen != null && input.resultAwayPen != null) {
    if (input.resultHomePen > input.resultAwayPen) return homeTeamId;
    if (input.resultAwayPen > input.resultHomePen) return awayTeamId;
    return null;
  }
  if (input.resultHomeET != null && input.resultAwayET != null) {
    if (input.resultHomeET > input.resultAwayET) return homeTeamId;
    if (input.resultAwayET > input.resultHomeET) return awayTeamId;
    return null;
  }
  if (input.resultHome90 > input.resultAway90) return homeTeamId;
  if (input.resultAway90 > input.resultHome90) return awayTeamId;
  return null;
}
