import { Match, PrismaClient } from '@prisma/client';

export class BracketError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const VALID_GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const;
type GroupLetter = (typeof VALID_GROUPS)[number];

export type StandingsInput = {
  group: string;
  firstId: string;
  secondId: string;
  thirdId: string;
};

export type ResolveBracketInput = {
  standings: StandingsInput[];
  thirdsQualified: string[];
};

type Position = 'first' | 'second' | 'third';

type SideSource =
  | { source: 'fixed'; group: GroupLetter; position: Position }
  | { source: 'third-slot'; slotKey: string };

type R32Layout = {
  matchId: string;
  home: SideSource;
  away: SideSource;
};

// Official FIFA 2026 R32 layout. The slot1..slot8 → R32 mapping was derived
// empirically from the 495-row ThirdPlaceCombination JSON and matches the user's
// official fixture. Match 6 away = 2nd J (only runner-up not used elsewhere) and
// Match 11 away = Winner A (only group winner not used elsewhere).
const R32_LAYOUT: R32Layout[] = [
  { matchId: 'R32-1',  home: { source: 'fixed', group: 'E', position: 'first'  }, away: { source: 'third-slot', slotKey: 'slot4' } },
  { matchId: 'R32-2',  home: { source: 'fixed', group: 'I', position: 'first'  }, away: { source: 'third-slot', slotKey: 'slot6' } },
  { matchId: 'R32-3',  home: { source: 'fixed', group: 'A', position: 'second' }, away: { source: 'fixed', group: 'B', position: 'second' } },
  { matchId: 'R32-4',  home: { source: 'fixed', group: 'F', position: 'first'  }, away: { source: 'fixed', group: 'C', position: 'second' } },
  { matchId: 'R32-5',  home: { source: 'fixed', group: 'K', position: 'second' }, away: { source: 'fixed', group: 'L', position: 'second' } },
  { matchId: 'R32-6',  home: { source: 'fixed', group: 'H', position: 'first'  }, away: { source: 'fixed', group: 'J', position: 'second' } },
  { matchId: 'R32-7',  home: { source: 'fixed', group: 'D', position: 'first'  }, away: { source: 'third-slot', slotKey: 'slot3' } },
  { matchId: 'R32-8',  home: { source: 'fixed', group: 'G', position: 'first'  }, away: { source: 'third-slot', slotKey: 'slot5' } },
  { matchId: 'R32-9',  home: { source: 'fixed', group: 'C', position: 'first'  }, away: { source: 'fixed', group: 'F', position: 'second' } },
  { matchId: 'R32-10', home: { source: 'fixed', group: 'E', position: 'second' }, away: { source: 'fixed', group: 'I', position: 'second' } },
  { matchId: 'R32-11', home: { source: 'third-slot', slotKey: 'slot1' },          away: { source: 'fixed', group: 'A', position: 'first'  } },
  { matchId: 'R32-12', home: { source: 'fixed', group: 'L', position: 'first'  }, away: { source: 'third-slot', slotKey: 'slot8' } },
  { matchId: 'R32-13', home: { source: 'fixed', group: 'J', position: 'first'  }, away: { source: 'fixed', group: 'H', position: 'second' } },
  { matchId: 'R32-14', home: { source: 'fixed', group: 'D', position: 'second' }, away: { source: 'fixed', group: 'G', position: 'second' } },
  { matchId: 'R32-15', home: { source: 'fixed', group: 'B', position: 'first'  }, away: { source: 'third-slot', slotKey: 'slot2' } },
  { matchId: 'R32-16', home: { source: 'fixed', group: 'K', position: 'first'  }, away: { source: 'third-slot', slotKey: 'slot7' } },
];

const matchInclude = { homeTeam: true, awayTeam: true } as const;

export class BracketService {
  constructor(private prisma: PrismaClient) {}

  async resolve(input: ResolveBracketInput) {
    const thirdsQualified = normalizeThirdsQualified(input?.thirdsQualified);
    const standingsByGroup = await this.normalizeAndValidateStandings(input?.standings);

    const groupsKey = [...thirdsQualified].sort().join('');
    const combo = await this.prisma.thirdPlaceCombination.findUnique({
      where: { groupsKey },
    });
    if (!combo) {
      throw new BracketError(
        'COMBINATION_NOT_FOUND',
        'Combinación de grupos no encontrada',
      );
    }

    const slots = combo.slots as Record<string, string>;
    const thirdTeamBySlot = new Map<string, string>();
    for (const [slotKey, label] of Object.entries(slots)) {
      const groupLetter = label.replace(/^3/, '') as GroupLetter;
      const stnd = standingsByGroup.get(groupLetter);
      if (!stnd) {
        throw new BracketError(
          'INVALID_STANDINGS',
          `Falta standings del grupo ${groupLetter} (3er lugar)`,
        );
      }
      thirdTeamBySlot.set(slotKey, stnd.thirdId);
    }

    const updatedMatches = await this.prisma.$transaction(async (tx) => {
      const out: Match[] = [];
      for (const layout of R32_LAYOUT) {
        const homeTeamId = resolveSide(layout.home, standingsByGroup, thirdTeamBySlot);
        const awayTeamId = resolveSide(layout.away, standingsByGroup, thirdTeamBySlot);
        const updated = await tx.match.update({
          where: { id: layout.matchId },
          data: { homeTeamId, awayTeamId },
          include: matchInclude,
        });
        out.push(updated);
      }
      return out;
    });

    return updatedMatches;
  }

  private async normalizeAndValidateStandings(
    standings: StandingsInput[] | undefined,
  ): Promise<Map<GroupLetter, StandingsInput>> {
    if (!Array.isArray(standings) || standings.length !== 12) {
      throw new BracketError(
        'INVALID_STANDINGS',
        'Debes enviar standings de los 12 grupos',
      );
    }

    const byGroup = new Map<GroupLetter, StandingsInput>();
    for (const s of standings) {
      if (!s || typeof s !== 'object') {
        throw new BracketError('INVALID_STANDINGS', 'Standing inválido');
      }
      const g = String(s.group ?? '').toUpperCase();
      if (!isValidGroup(g)) {
        throw new BracketError(
          'INVALID_STANDINGS',
          `Grupo inválido en standings: ${s.group}`,
        );
      }
      if (byGroup.has(g)) {
        throw new BracketError(
          'INVALID_STANDINGS',
          `Grupo duplicado en standings: ${g}`,
        );
      }
      if (!s.firstId || !s.secondId || !s.thirdId) {
        throw new BracketError(
          'INVALID_STANDINGS',
          `Faltan team IDs en standings de ${g}`,
        );
      }
      const ids = [s.firstId, s.secondId, s.thirdId];
      if (new Set(ids).size !== 3) {
        throw new BracketError(
          'INVALID_STANDINGS',
          `Team IDs duplicados en standings de ${g}`,
        );
      }
      byGroup.set(g, {
        group: g,
        firstId: s.firstId,
        secondId: s.secondId,
        thirdId: s.thirdId,
      });
    }
    if (byGroup.size !== 12) {
      throw new BracketError(
        'INVALID_STANDINGS',
        'Standings incompletos: faltan grupos',
      );
    }

    const allIds = new Set<string>();
    for (const s of byGroup.values()) {
      allIds.add(s.firstId);
      allIds.add(s.secondId);
      allIds.add(s.thirdId);
    }
    const teams = await this.prisma.team.findMany({
      where: { id: { in: [...allIds] } },
      select: { id: true },
    });
    if (teams.length !== allIds.size) {
      throw new BracketError(
        'INVALID_STANDINGS',
        'Algunos team IDs en standings no existen',
      );
    }
    return byGroup;
  }
}

function normalizeThirdsQualified(input: string[] | undefined): string[] {
  if (!Array.isArray(input) || input.length !== 8) {
    throw new BracketError('INVALID_GROUPS', 'Debes enviar exactamente 8 grupos');
  }
  const upper = input.map((g) => String(g).toUpperCase());
  if (new Set(upper).size !== 8) {
    throw new BracketError('INVALID_GROUPS', 'Los grupos clasificados no pueden repetirse');
  }
  for (const g of upper) {
    if (!isValidGroup(g)) {
      throw new BracketError('INVALID_GROUPS', `Grupo inválido: ${g}`);
    }
  }
  return upper;
}

function isValidGroup(g: string): g is GroupLetter {
  return (VALID_GROUPS as readonly string[]).includes(g);
}

function resolveSide(
  side: SideSource,
  standings: Map<GroupLetter, StandingsInput>,
  thirdsBySlot: Map<string, string>,
): string {
  if (side.source === 'fixed') {
    const s = standings.get(side.group);
    if (!s) {
      throw new BracketError(
        'INVALID_STANDINGS',
        `Falta standings del grupo ${side.group}`,
      );
    }
    if (side.position === 'first') return s.firstId;
    if (side.position === 'second') return s.secondId;
    return s.thirdId;
  }
  const teamId = thirdsBySlot.get(side.slotKey);
  if (!teamId) {
    throw new BracketError('INVALID_GROUPS', `No se pudo resolver ${side.slotKey}`);
  }
  return teamId;
}
