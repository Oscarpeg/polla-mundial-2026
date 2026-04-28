-- CreateEnum
CREATE TYPE "MatchPhase" AS ENUM ('GROUPS', 'R32', 'R16', 'QF', 'SF', 'THIRD', 'FINAL');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PENDING', 'LIVE', 'FINISHED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "group" TEXT,
    "flagUrl" TEXT,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "phase" "MatchPhase" NOT NULL,
    "matchday" INTEGER,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "lockedAt" TIMESTAMP(3),
    "venue" TEXT,
    "homeTeamId" TEXT,
    "awayTeamId" TEXT,
    "resultHome90" INTEGER,
    "resultAway90" INTEGER,
    "resultHomeET" INTEGER,
    "resultAwayET" INTEGER,
    "resultHomePen" INTEGER,
    "resultAwayPen" INTEGER,
    "winnerId" TEXT,
    "matchStatus" "MatchStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prediction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "pickHome90" INTEGER NOT NULL,
    "pickAway90" INTEGER NOT NULL,
    "pickHomeET" INTEGER,
    "pickAwayET" INTEGER,
    "pickHomePen" INTEGER,
    "pickAwayPen" INTEGER,
    "ptsWinner" INTEGER NOT NULL DEFAULT 0,
    "ptsExact" INTEGER NOT NULL DEFAULT 0,
    "ptsET" INTEGER NOT NULL DEFAULT 0,
    "ptsETExact" INTEGER NOT NULL DEFAULT 0,
    "ptsPen" INTEGER NOT NULL DEFAULT 0,
    "ptsPenExact" INTEGER NOT NULL DEFAULT 0,
    "ptsTotal" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalPrediction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "championId" TEXT,
    "runnerUpId" TEXT,
    "thirdId" TEXT,
    "fourthId" TEXT,
    "ptsChampion" INTEGER NOT NULL DEFAULT 0,
    "ptsRunnerUp" INTEGER NOT NULL DEFAULT 0,
    "ptsThird" INTEGER NOT NULL DEFAULT 0,
    "ptsFourth" INTEGER NOT NULL DEFAULT 0,
    "ptsTotal" INTEGER NOT NULL DEFAULT 0,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThirdPlaceCombination" (
    "id" SERIAL NOT NULL,
    "groupsKey" TEXT NOT NULL,
    "slots" JSONB NOT NULL,

    CONSTRAINT "ThirdPlaceCombination_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Team_code_key" ON "Team"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Prediction_userId_matchId_key" ON "Prediction"("userId", "matchId");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalPrediction_userId_key" ON "GlobalPrediction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ThirdPlaceCombination_groupsKey_key" ON "ThirdPlaceCombination"("groupsKey");

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalPrediction" ADD CONSTRAINT "GlobalPrediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalPrediction" ADD CONSTRAINT "GlobalPrediction_championId_fkey" FOREIGN KEY ("championId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalPrediction" ADD CONSTRAINT "GlobalPrediction_runnerUpId_fkey" FOREIGN KEY ("runnerUpId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalPrediction" ADD CONSTRAINT "GlobalPrediction_thirdId_fkey" FOREIGN KEY ("thirdId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalPrediction" ADD CONSTRAINT "GlobalPrediction_fourthId_fkey" FOREIGN KEY ("fourthId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
