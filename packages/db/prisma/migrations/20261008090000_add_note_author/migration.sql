-- AlterTable
ALTER TABLE "note" ADD COLUMN     "authorId" TEXT;

-- CreateIndex
CREATE INDEX "note_authorId_idx" ON "note"("authorId");

-- AddForeignKey
ALTER TABLE "note" ADD CONSTRAINT "note_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
