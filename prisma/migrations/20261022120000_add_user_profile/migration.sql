-- CreateTable
CREATE TABLE "user_profiles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "qq" TEXT NOT NULL,
    "nickname" TEXT NOT NULL DEFAULT '',
    "profile" TEXT NOT NULL DEFAULT '',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_qq_key" ON "user_profiles"("qq");
