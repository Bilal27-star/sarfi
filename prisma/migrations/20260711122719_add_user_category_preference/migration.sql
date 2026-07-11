-- CreateTable
CREATE TABLE "UserCategoryPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UserCategoryPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserCategoryPreference_userId_idx" ON "UserCategoryPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserCategoryPreference_userId_categoryId_key" ON "UserCategoryPreference"("userId", "categoryId");

-- AddForeignKey
ALTER TABLE "UserCategoryPreference" ADD CONSTRAINT "UserCategoryPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCategoryPreference" ADD CONSTRAINT "UserCategoryPreference_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
