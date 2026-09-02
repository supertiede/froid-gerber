/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Client" DROP CONSTRAINT "Client_creeParId_fkey";

-- DropForeignKey
ALTER TABLE "Intervention" DROP CONSTRAINT "Intervention_userId_fkey";

-- DropForeignKey
ALTER TABLE "Poste" DROP CONSTRAINT "Poste_userId_fkey";

-- DropTable
DROP TABLE "User";

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_creeParId_fkey" FOREIGN KEY ("creeParId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poste" ADD CONSTRAINT "Poste_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
