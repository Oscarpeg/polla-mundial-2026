import 'dotenv/config';
import { PrismaClient, MatchPhase, MatchStatus, Prisma } from '@prisma/client';
import thirdPlaceCombinations from './thirdPlaceCombinations.json';

const prisma = new PrismaClient();

type TeamSeed = { code: string; name: string; group: string };

const TEAMS: TeamSeed[] = [
  // Group A
  { code: 'MEX', name: 'Mexico', group: 'A' },
  { code: 'RSA', name: 'South Africa', group: 'A' },
  { code: 'KOR', name: 'South Korea', group: 'A' },
  { code: 'CZE', name: 'Czechia', group: 'A' },
  // Group B
  { code: 'CAN', name: 'Canada', group: 'B' },
  { code: 'BIH', name: 'Bosnia and Herzegovina', group: 'B' },
  { code: 'QAT', name: 'Qatar', group: 'B' },
  { code: 'SUI', name: 'Switzerland', group: 'B' },
  // Group C
  { code: 'BRA', name: 'Brazil', group: 'C' },
  { code: 'MAR', name: 'Morocco', group: 'C' },
  { code: 'HAI', name: 'Haiti', group: 'C' },
  { code: 'SCO', name: 'Scotland', group: 'C' },
  // Group D
  { code: 'USA', name: 'United States', group: 'D' },
  { code: 'PAR', name: 'Paraguay', group: 'D' },
  { code: 'AUS', name: 'Australia', group: 'D' },
  { code: 'TUR', name: 'Turkey', group: 'D' },
  // Group E
  { code: 'GER', name: 'Germany', group: 'E' },
  { code: 'CUW', name: 'Curacao', group: 'E' },
  { code: 'CIV', name: 'Ivory Coast', group: 'E' },
  { code: 'ECU', name: 'Ecuador', group: 'E' },
  // Group F
  { code: 'NED', name: 'Netherlands', group: 'F' },
  { code: 'JPN', name: 'Japan', group: 'F' },
  { code: 'SWE', name: 'Sweden', group: 'F' },
  { code: 'TUN', name: 'Tunisia', group: 'F' },
  // Group G
  { code: 'BEL', name: 'Belgium', group: 'G' },
  { code: 'EGY', name: 'Egypt', group: 'G' },
  { code: 'IRN', name: 'Iran', group: 'G' },
  { code: 'NZL', name: 'New Zealand', group: 'G' },
  // Group H
  { code: 'ESP', name: 'Spain', group: 'H' },
  { code: 'CPV', name: 'Cape Verde', group: 'H' },
  { code: 'KSA', name: 'Saudi Arabia', group: 'H' },
  { code: 'URU', name: 'Uruguay', group: 'H' },
  // Group I
  { code: 'FRA', name: 'France', group: 'I' },
  { code: 'SEN', name: 'Senegal', group: 'I' },
  { code: 'IRQ', name: 'Iraq', group: 'I' },
  { code: 'NOR', name: 'Norway', group: 'I' },
  // Group J
  { code: 'ARG', name: 'Argentina', group: 'J' },
  { code: 'ALG', name: 'Algeria', group: 'J' },
  { code: 'AUT', name: 'Austria', group: 'J' },
  { code: 'JOR', name: 'Jordan', group: 'J' },
  // Group K
  { code: 'POR', name: 'Portugal', group: 'K' },
  { code: 'COD', name: 'DR Congo', group: 'K' },
  { code: 'UZB', name: 'Uzbekistan', group: 'K' },
  { code: 'COL', name: 'Colombia', group: 'K' },
  // Group L
  { code: 'ENG', name: 'England', group: 'L' },
  { code: 'CRO', name: 'Croatia', group: 'L' },
  { code: 'GHA', name: 'Ghana', group: 'L' },
  { code: 'PAN', name: 'Panama', group: 'L' },
];

const GROUPS: Record<string, [string, string, string, string]> = {
  A: ['MEX', 'RSA', 'KOR', 'CZE'],
  B: ['CAN', 'BIH', 'QAT', 'SUI'],
  C: ['BRA', 'MAR', 'HAI', 'SCO'],
  D: ['USA', 'PAR', 'AUS', 'TUR'],
  E: ['GER', 'CUW', 'CIV', 'ECU'],
  F: ['NED', 'JPN', 'SWE', 'TUN'],
  G: ['BEL', 'EGY', 'IRN', 'NZL'],
  H: ['ESP', 'CPV', 'KSA', 'URU'],
  I: ['FRA', 'SEN', 'IRQ', 'NOR'],
  J: ['ARG', 'ALG', 'AUT', 'JOR'],
  K: ['POR', 'COD', 'UZB', 'COL'],
  L: ['ENG', 'CRO', 'GHA', 'PAN'],
};

type MatchSlot = { date: string; venue: string };

// 6 slots per group in round-robin order:
//   [0] MD1: T1 vs T2
//   [1] MD1: T3 vs T4
//   [2] MD2: T1 vs T3
//   [3] MD2: T2 vs T4
//   [4] MD3: T1 vs T4   (simultaneous with [5])
//   [5] MD3: T2 vs T3   (simultaneous with [4])
const SCHEDULE: Record<string, [MatchSlot, MatchSlot, MatchSlot, MatchSlot, MatchSlot, MatchSlot]> = {
  A: [
    { date: '2026-06-11T22:00:00Z', venue: 'Estadio Azteca, Mexico City' },
    { date: '2026-06-12T19:00:00Z', venue: 'MetLife Stadium, East Rutherford' },
    { date: '2026-06-18T22:00:00Z', venue: 'Estadio Akron, Guadalajara' },
    { date: '2026-06-18T17:00:00Z', venue: 'Gillette Stadium, Foxborough' },
    { date: '2026-06-24T22:00:00Z', venue: 'Estadio BBVA, Monterrey' },
    { date: '2026-06-24T22:00:00Z', venue: 'SoFi Stadium, Inglewood' },
  ],
  B: [
    { date: '2026-06-12T22:00:00Z', venue: 'BMO Field, Toronto' },
    { date: '2026-06-12T16:00:00Z', venue: 'BC Place, Vancouver' },
    { date: '2026-06-18T20:00:00Z', venue: 'BC Place, Vancouver' },
    { date: '2026-06-18T23:00:00Z', venue: 'BMO Field, Toronto' },
    { date: '2026-06-24T18:00:00Z', venue: 'BMO Field, Toronto' },
    { date: '2026-06-24T18:00:00Z', venue: 'Lincoln Financial Field, Philadelphia' },
  ],
  C: [
    { date: '2026-06-12T23:00:00Z', venue: 'AT&T Stadium, Arlington' },
    { date: '2026-06-13T16:00:00Z', venue: 'Mercedes-Benz Stadium, Atlanta' },
    { date: '2026-06-19T19:00:00Z', venue: 'NRG Stadium, Houston' },
    { date: '2026-06-19T22:00:00Z', venue: 'Hard Rock Stadium, Miami Gardens' },
    { date: '2026-06-25T20:00:00Z', venue: 'SoFi Stadium, Inglewood' },
    { date: '2026-06-25T20:00:00Z', venue: 'Levi\'s Stadium, Santa Clara' },
  ],
  D: [
    { date: '2026-06-13T19:00:00Z', venue: 'SoFi Stadium, Inglewood' },
    { date: '2026-06-13T22:00:00Z', venue: 'Arrowhead Stadium, Kansas City' },
    { date: '2026-06-19T16:00:00Z', venue: 'Lincoln Financial Field, Philadelphia' },
    { date: '2026-06-19T00:00:00Z', venue: 'Lumen Field, Seattle' },
    { date: '2026-06-25T23:00:00Z', venue: 'MetLife Stadium, East Rutherford' },
    { date: '2026-06-25T23:00:00Z', venue: 'Gillette Stadium, Foxborough' },
  ],
  E: [
    { date: '2026-06-13T00:00:00Z', venue: 'Hard Rock Stadium, Miami Gardens' },
    { date: '2026-06-14T16:00:00Z', venue: 'Estadio Azteca, Mexico City' },
    { date: '2026-06-20T19:00:00Z', venue: 'AT&T Stadium, Arlington' },
    { date: '2026-06-20T22:00:00Z', venue: 'Mercedes-Benz Stadium, Atlanta' },
    { date: '2026-06-26T20:00:00Z', venue: 'Lumen Field, Seattle' },
    { date: '2026-06-26T20:00:00Z', venue: 'Levi\'s Stadium, Santa Clara' },
  ],
  F: [
    { date: '2026-06-14T19:00:00Z', venue: 'MetLife Stadium, East Rutherford' },
    { date: '2026-06-14T22:00:00Z', venue: 'Gillette Stadium, Foxborough' },
    { date: '2026-06-20T00:00:00Z', venue: 'Arrowhead Stadium, Kansas City' },
    { date: '2026-06-20T16:00:00Z', venue: 'BC Place, Vancouver' },
    { date: '2026-06-25T00:00:00Z', venue: 'AT&T Stadium, Arlington' },
    { date: '2026-06-25T00:00:00Z', venue: 'Estadio BBVA, Monterrey' },
  ],
  G: [
    { date: '2026-06-14T23:00:00Z', venue: 'NRG Stadium, Houston' },
    { date: '2026-06-15T16:00:00Z', venue: 'SoFi Stadium, Inglewood' },
    { date: '2026-06-21T19:00:00Z', venue: 'Hard Rock Stadium, Miami Gardens' },
    { date: '2026-06-21T22:00:00Z', venue: 'Mercedes-Benz Stadium, Atlanta' },
    { date: '2026-06-26T23:00:00Z', venue: 'Estadio Azteca, Mexico City' },
    { date: '2026-06-26T23:00:00Z', venue: 'BMO Field, Toronto' },
  ],
  H: [
    { date: '2026-06-15T19:00:00Z', venue: 'AT&T Stadium, Arlington' },
    { date: '2026-06-15T22:00:00Z', venue: 'MetLife Stadium, East Rutherford' },
    { date: '2026-06-21T00:00:00Z', venue: 'Estadio Akron, Guadalajara' },
    { date: '2026-06-21T16:00:00Z', venue: 'Levi\'s Stadium, Santa Clara' },
    { date: '2026-06-26T00:00:00Z', venue: 'NRG Stadium, Houston' },
    { date: '2026-06-26T00:00:00Z', venue: 'Lincoln Financial Field, Philadelphia' },
  ],
  I: [
    { date: '2026-06-15T23:00:00Z', venue: 'Lumen Field, Seattle' },
    { date: '2026-06-16T16:00:00Z', venue: 'Gillette Stadium, Foxborough' },
    { date: '2026-06-22T19:00:00Z', venue: 'BMO Field, Toronto' },
    { date: '2026-06-22T22:00:00Z', venue: 'Arrowhead Stadium, Kansas City' },
    { date: '2026-06-27T20:00:00Z', venue: 'MetLife Stadium, East Rutherford' },
    { date: '2026-06-27T20:00:00Z', venue: 'AT&T Stadium, Arlington' },
  ],
  J: [
    { date: '2026-06-16T19:00:00Z', venue: 'Levi\'s Stadium, Santa Clara' },
    { date: '2026-06-16T22:00:00Z', venue: 'NRG Stadium, Houston' },
    { date: '2026-06-22T00:00:00Z', venue: 'Hard Rock Stadium, Miami Gardens' },
    { date: '2026-06-22T16:00:00Z', venue: 'SoFi Stadium, Inglewood' },
    { date: '2026-06-27T00:00:00Z', venue: 'Mercedes-Benz Stadium, Atlanta' },
    { date: '2026-06-27T00:00:00Z', venue: 'BC Place, Vancouver' },
  ],
  K: [
    { date: '2026-06-16T23:00:00Z', venue: 'BC Place, Vancouver' },
    { date: '2026-06-17T16:00:00Z', venue: 'Estadio BBVA, Monterrey' },
    { date: '2026-06-23T19:00:00Z', venue: 'Gillette Stadium, Foxborough' },
    { date: '2026-06-23T22:00:00Z', venue: 'Lincoln Financial Field, Philadelphia' },
    { date: '2026-06-27T23:00:00Z', venue: 'Lumen Field, Seattle' },
    { date: '2026-06-27T23:00:00Z', venue: 'Levi\'s Stadium, Santa Clara' },
  ],
  L: [
    { date: '2026-06-17T19:00:00Z', venue: 'Arrowhead Stadium, Kansas City' },
    { date: '2026-06-17T22:00:00Z', venue: 'Mercedes-Benz Stadium, Atlanta' },
    { date: '2026-06-23T00:00:00Z', venue: 'AT&T Stadium, Arlington' },
    { date: '2026-06-23T16:00:00Z', venue: 'NRG Stadium, Houston' },
    { date: '2026-06-28T00:00:00Z', venue: 'Hard Rock Stadium, Miami Gardens' },
    { date: '2026-06-28T00:00:00Z', venue: 'BMO Field, Toronto' },
  ],
};

const PAIRINGS: Array<[number, number, 1 | 2 | 3]> = [
  [0, 1, 1],
  [2, 3, 1],
  [0, 2, 2],
  [1, 3, 2],
  [0, 3, 3],
  [1, 2, 3],
];

async function cleanupObsoleteTeams() {
  const currentCodes = TEAMS.map((t) => t.code);
  const obsolete = await prisma.team.findMany({
    where: { code: { notIn: currentCodes } },
    select: { id: true, code: true },
  });
  if (obsolete.length === 0) {
    console.log('No obsolete teams to remove');
    return;
  }
  const obsoleteIds = obsolete.map((t) => t.id);

  await prisma.match.updateMany({
    where: { homeTeamId: { in: obsoleteIds } },
    data: { homeTeamId: null },
  });
  await prisma.match.updateMany({
    where: { awayTeamId: { in: obsoleteIds } },
    data: { awayTeamId: null },
  });
  await prisma.globalPrediction.updateMany({
    where: { championId: { in: obsoleteIds } },
    data: { championId: null },
  });
  await prisma.globalPrediction.updateMany({
    where: { runnerUpId: { in: obsoleteIds } },
    data: { runnerUpId: null },
  });
  await prisma.globalPrediction.updateMany({
    where: { thirdId: { in: obsoleteIds } },
    data: { thirdId: null },
  });
  await prisma.globalPrediction.updateMany({
    where: { fourthId: { in: obsoleteIds } },
    data: { fourthId: null },
  });

  await prisma.team.deleteMany({ where: { id: { in: obsoleteIds } } });
  console.log(`Removed ${obsolete.length} obsolete teams: ${obsolete.map((t) => t.code).join(', ')}`);
}

async function seedTeams() {
  for (const t of TEAMS) {
    await prisma.team.upsert({
      where: { code: t.code },
      update: { name: t.name, group: t.group, flagUrl: '' },
      create: { code: t.code, name: t.name, group: t.group, flagUrl: '' },
    });
  }
  console.log(`Seeded ${TEAMS.length} teams`);
}

async function seedGroupMatches() {
  const teamsByCode = new Map<string, string>();
  const allTeams = await prisma.team.findMany();
  for (const t of allTeams) teamsByCode.set(t.code, t.id);

  let count = 0;
  for (const [groupLetter, codes] of Object.entries(GROUPS)) {
    const slots = SCHEDULE[groupLetter];
    for (let slotIdx = 0; slotIdx < PAIRINGS.length; slotIdx++) {
      const [homeIdx, awayIdx, matchday] = PAIRINGS[slotIdx];
      const id = `GRP-${groupLetter}-MD${matchday}-${slotIdx % 2 === 0 ? 1 : 2}`;
      const homeCode = codes[homeIdx];
      const awayCode = codes[awayIdx];
      const homeTeamId = teamsByCode.get(homeCode)!;
      const awayTeamId = teamsByCode.get(awayCode)!;
      const slot = slots[slotIdx];

      await prisma.match.upsert({
        where: { id },
        update: {
          phase: MatchPhase.GROUPS,
          matchday,
          scheduledAt: new Date(slot.date),
          venue: slot.venue,
          homeTeamId,
          awayTeamId,
          matchStatus: MatchStatus.PENDING,
        },
        create: {
          id,
          phase: MatchPhase.GROUPS,
          matchday,
          scheduledAt: new Date(slot.date),
          venue: slot.venue,
          homeTeamId,
          awayTeamId,
          matchStatus: MatchStatus.PENDING,
        },
      });
      count++;
    }
  }
  console.log(`Seeded ${count} group-stage matches`);
}

type KnockoutMatch = {
  id: string;
  phase: MatchPhase;
  scheduledAt: string;
  venue: string;
};

const KNOCKOUT_MATCHES: KnockoutMatch[] = [
  // Round of 32 — June 28 to July 3, 2026
  { id: 'R32-1',  phase: MatchPhase.R32, scheduledAt: '2026-06-28T16:00:00Z', venue: 'Lincoln Financial Field, Philadelphia' },
  { id: 'R32-2',  phase: MatchPhase.R32, scheduledAt: '2026-06-28T20:00:00Z', venue: 'Gillette Stadium, Foxborough' },
  { id: 'R32-3',  phase: MatchPhase.R32, scheduledAt: '2026-06-28T23:00:00Z', venue: 'Estadio Azteca, Mexico City' },
  { id: 'R32-4',  phase: MatchPhase.R32, scheduledAt: '2026-06-29T19:00:00Z', venue: 'AT&T Stadium, Arlington' },
  { id: 'R32-5',  phase: MatchPhase.R32, scheduledAt: '2026-06-29T22:00:00Z', venue: 'Mercedes-Benz Stadium, Atlanta' },
  { id: 'R32-6',  phase: MatchPhase.R32, scheduledAt: '2026-06-30T00:00:00Z', venue: 'SoFi Stadium, Inglewood' },
  { id: 'R32-7',  phase: MatchPhase.R32, scheduledAt: '2026-06-30T19:00:00Z', venue: 'Hard Rock Stadium, Miami Gardens' },
  { id: 'R32-8',  phase: MatchPhase.R32, scheduledAt: '2026-06-30T22:00:00Z', venue: 'MetLife Stadium, East Rutherford' },
  { id: 'R32-9',  phase: MatchPhase.R32, scheduledAt: '2026-07-01T00:00:00Z', venue: 'BC Place, Vancouver' },
  { id: 'R32-10', phase: MatchPhase.R32, scheduledAt: '2026-07-01T20:00:00Z', venue: 'Arrowhead Stadium, Kansas City' },
  { id: 'R32-11', phase: MatchPhase.R32, scheduledAt: '2026-07-01T23:00:00Z', venue: 'NRG Stadium, Houston' },
  { id: 'R32-12', phase: MatchPhase.R32, scheduledAt: '2026-07-02T19:00:00Z', venue: 'Lumen Field, Seattle' },
  { id: 'R32-13', phase: MatchPhase.R32, scheduledAt: '2026-07-02T22:00:00Z', venue: 'Estadio BBVA, Monterrey' },
  { id: 'R32-14', phase: MatchPhase.R32, scheduledAt: '2026-07-03T00:00:00Z', venue: "Levi's Stadium, Santa Clara" },
  { id: 'R32-15', phase: MatchPhase.R32, scheduledAt: '2026-07-03T20:00:00Z', venue: 'BMO Field, Toronto' },
  { id: 'R32-16', phase: MatchPhase.R32, scheduledAt: '2026-07-03T23:00:00Z', venue: 'Estadio Akron, Guadalajara' },

  // Round of 16 — July 4 to 7, 2026
  { id: 'R16-1', phase: MatchPhase.R16, scheduledAt: '2026-07-04T20:00:00Z', venue: "Levi's Stadium, Santa Clara" },
  { id: 'R16-2', phase: MatchPhase.R16, scheduledAt: '2026-07-04T23:00:00Z', venue: 'Gillette Stadium, Foxborough' },
  { id: 'R16-3', phase: MatchPhase.R16, scheduledAt: '2026-07-05T20:00:00Z', venue: 'Estadio Azteca, Mexico City' },
  { id: 'R16-4', phase: MatchPhase.R16, scheduledAt: '2026-07-05T23:00:00Z', venue: 'AT&T Stadium, Arlington' },
  { id: 'R16-5', phase: MatchPhase.R16, scheduledAt: '2026-07-06T20:00:00Z', venue: 'NRG Stadium, Houston' },
  { id: 'R16-6', phase: MatchPhase.R16, scheduledAt: '2026-07-06T23:00:00Z', venue: 'BC Place, Vancouver' },
  { id: 'R16-7', phase: MatchPhase.R16, scheduledAt: '2026-07-07T20:00:00Z', venue: 'Lumen Field, Seattle' },
  { id: 'R16-8', phase: MatchPhase.R16, scheduledAt: '2026-07-07T23:00:00Z', venue: 'Hard Rock Stadium, Miami Gardens' },

  // Quarter-finals — July 9 to 11, 2026
  { id: 'QF-1', phase: MatchPhase.QF, scheduledAt: '2026-07-09T20:00:00Z', venue: 'Mercedes-Benz Stadium, Atlanta' },
  { id: 'QF-2', phase: MatchPhase.QF, scheduledAt: '2026-07-09T23:00:00Z', venue: 'MetLife Stadium, East Rutherford' },
  { id: 'QF-3', phase: MatchPhase.QF, scheduledAt: '2026-07-10T23:00:00Z', venue: 'SoFi Stadium, Inglewood' },
  { id: 'QF-4', phase: MatchPhase.QF, scheduledAt: '2026-07-11T23:00:00Z', venue: 'Lincoln Financial Field, Philadelphia' },

  // Semi-finals — July 14 & 15, 2026
  { id: 'SF-1', phase: MatchPhase.SF, scheduledAt: '2026-07-14T23:00:00Z', venue: 'AT&T Stadium, Arlington' },
  { id: 'SF-2', phase: MatchPhase.SF, scheduledAt: '2026-07-15T23:00:00Z', venue: 'Mercedes-Benz Stadium, Atlanta' },

  // Third-place play-off — July 18, 2026
  { id: '3RD', phase: MatchPhase.THIRD, scheduledAt: '2026-07-18T19:00:00Z', venue: 'Hard Rock Stadium, Miami Gardens' },

  // Final — July 19, 2026
  { id: 'FINAL', phase: MatchPhase.FINAL, scheduledAt: '2026-07-19T19:00:00Z', venue: 'MetLife Stadium, East Rutherford' },
];

async function seedKnockoutMatches() {
  let count = 0;
  for (const m of KNOCKOUT_MATCHES) {
    await prisma.match.upsert({
      where: { id: m.id },
      update: {
        phase: m.phase,
        scheduledAt: new Date(m.scheduledAt),
        venue: m.venue,
      },
      create: {
        id: m.id,
        phase: m.phase,
        matchday: null,
        scheduledAt: new Date(m.scheduledAt),
        venue: m.venue,
        homeTeamId: null,
        awayTeamId: null,
        matchStatus: MatchStatus.PENDING,
      },
    });
    count++;
  }
  console.log(`Seeded ${count} knockout matches`);
}

async function seedThirdPlaceCombinations() {
  const entries = Object.entries(
    thirdPlaceCombinations as Record<string, Record<string, string>>,
  );
  let count = 0;
  for (const [groupsKey, slots] of entries) {
    await prisma.thirdPlaceCombination.upsert({
      where: { groupsKey },
      update: { slots: slots as Prisma.InputJsonValue },
      create: { groupsKey, slots: slots as Prisma.InputJsonValue },
    });
    count++;
  }
  console.log(`Seeded ${count} third-place combinations`);
}

async function main() {
  await cleanupObsoleteTeams();
  await seedTeams();
  await seedGroupMatches();
  await seedKnockoutMatches();
  await seedThirdPlaceCombinations();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
