-- 目录管理 / 触发规则模块下线：三张表的能力已由流程画布（canvases）承接。
-- 执行前必须先跑 scripts/migrateManagedToCanvas.ts 把存量资源段与规则转成画布，
-- 否则数据不可恢复（本次部署已完成迁移：10 张 [迁移] 画布）。
-- resource_settings.default_dir 的语义由 system_configs.RESOURCE_PATH 取代。

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "managed_resources";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "resource_settings";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "command_rules";
PRAGMA foreign_keys=on;
