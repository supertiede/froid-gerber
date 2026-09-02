-- CreateEnum
CREATE TYPE "PauseType" AS ENUM ('DEJEUNER', 'COURTE');

-- CreateEnum
CREATE TYPE "Origine" AS ENUM ('APP', 'MANUEL');

-- CreateEnum
CREATE TYPE "TypeIntervention" AS ENUM ('CLIENT', 'ATELIER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "doitChangerMotDePasse" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "nomNormalise" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creeParId" TEXT,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Poste" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "debutAt" TIMESTAMP(3) NOT NULL,
    "finAt" TIMESTAMP(3),
    "origineDebut" "Origine" NOT NULL DEFAULT 'APP',
    "origineFin" "Origine",
    "cleClient" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Poste_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pause" (
    "id" TEXT NOT NULL,
    "posteId" TEXT NOT NULL,
    "type" "PauseType" NOT NULL,
    "debutAt" TIMESTAMP(3) NOT NULL,
    "finAt" TIMESTAMP(3),
    "origineDebut" "Origine" NOT NULL DEFAULT 'APP',
    "origineFin" "Origine",
    "cleClient" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Intervention" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TypeIntervention" NOT NULL,
    "clientId" TEXT,
    "debutAt" TIMESTAMP(3) NOT NULL,
    "finAt" TIMESTAMP(3),
    "trajetMinutes" INTEGER NOT NULL DEFAULT 0,
    "compteRendu" TEXT,
    "origine" "Origine" NOT NULL DEFAULT 'APP',
    "cleClient" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Intervention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Modification" (
    "id" TEXT NOT NULL,
    "entite" TEXT NOT NULL,
    "entiteId" TEXT NOT NULL,
    "champ" TEXT NOT NULL,
    "ancienne" TEXT,
    "nouvelle" TEXT,
    "parUserId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motif" TEXT,

    CONSTRAINT "Modification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RapportHebdo" (
    "id" TEXT NOT NULL,
    "semaineIso" TEXT NOT NULL,
    "envoyeAt" TIMESTAMP(3),
    "destinataires" TEXT[],
    "statut" TEXT NOT NULL,
    "erreur" TEXT,
    "verrouillee" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RapportHebdo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Client_nomNormalise_key" ON "Client"("nomNormalise");

-- CreateIndex
CREATE INDEX "Client_actif_nom_idx" ON "Client"("actif", "nom");

-- CreateIndex
CREATE UNIQUE INDEX "Poste_cleClient_key" ON "Poste"("cleClient");

-- CreateIndex
CREATE INDEX "Poste_userId_debutAt_idx" ON "Poste"("userId", "debutAt");

-- CreateIndex
CREATE UNIQUE INDEX "Pause_cleClient_key" ON "Pause"("cleClient");

-- CreateIndex
CREATE INDEX "Pause_posteId_debutAt_idx" ON "Pause"("posteId", "debutAt");

-- CreateIndex
CREATE UNIQUE INDEX "Intervention_cleClient_key" ON "Intervention"("cleClient");

-- CreateIndex
CREATE INDEX "Intervention_userId_debutAt_idx" ON "Intervention"("userId", "debutAt");

-- CreateIndex
CREATE INDEX "Intervention_clientId_debutAt_idx" ON "Intervention"("clientId", "debutAt");

-- CreateIndex
CREATE INDEX "Modification_entite_entiteId_idx" ON "Modification"("entite", "entiteId");

-- CreateIndex
CREATE UNIQUE INDEX "RapportHebdo_semaineIso_key" ON "RapportHebdo"("semaineIso");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_creeParId_fkey" FOREIGN KEY ("creeParId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poste" ADD CONSTRAINT "Poste_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pause" ADD CONSTRAINT "Pause_posteId_fkey" FOREIGN KEY ("posteId") REFERENCES "Poste"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
