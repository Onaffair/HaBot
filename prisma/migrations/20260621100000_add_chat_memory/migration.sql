-- 对话记忆表
CREATE TABLE IF NOT EXISTS "chat_memories" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "group_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
    "content" TEXT NOT NULL,
    "raw" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "idx_chat_memories_group_created" ON "chat_memories"("group_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_chat_memories_group_user" ON "chat_memories"("group_id", "user_id");

-- 对话摘要表
CREATE TABLE IF NOT EXISTS "memory_summaries" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "group_id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "since_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "idx_memory_summaries_group" ON "memory_summaries"("group_id");
