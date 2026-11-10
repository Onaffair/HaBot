-- 画布流转日志：规则引擎每次流转写一行，供前端「画布」列表的日志弹窗分页回溯。
-- 仅新增本表；库里遗留的 chat_memories / memory_summaries 属早先对话记忆模块下线后的残留，
-- 与本次变更无关，此处不做处理（避免顺带删除数据）。

-- CreateTable
CREATE TABLE "canvas_flow_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "canvas_id" INTEGER NOT NULL,
    "group_id" TEXT NOT NULL DEFAULT '',
    "message" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'success',
    "error" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "canvas_flow_logs_canvas_id_created_at_idx" ON "canvas_flow_logs"("canvas_id", "created_at");
