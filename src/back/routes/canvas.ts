import { Express } from 'express';
import { canvasService } from '../../bot/services/db';
import { runtime } from '../../bot/core/runtime';
import { resful, HttpError, NO_CONTENT, pageQuery, pathId } from '../utils/resfulAPI';

// ============================================================================
// 流程画布 RESTful 路由
// ----------------------------------------------------------------------------
// handler 不接触 res，仅返回资源数据或抛异常，由 resful 统一映射状态码：
// - GET    /api/canvases          200 { list, total, pageNum, pageSize }（对接 useTable）
// - GET    /api/canvases/:id      200 完整画布 / 404
// - POST   /api/canvases          201 新建的画布
// - PUT    /api/canvases/:id      200 更新后的画布
// - PATCH  /api/canvases/:id/toggle 200 切换启用状态
// - DELETE /api/canvases/:id      204 无响应体
// ============================================================================

/** nodes/edges 合法性校验：若传入必须为数组 */
function validateGraph(nodes?: any, edges?: any) {
  if (nodes !== undefined && !Array.isArray(nodes)) throw new HttpError(400, 'nodes 必须是数组');
  if (edges !== undefined && !Array.isArray(edges)) throw new HttpError(400, 'edges 必须是数组');
}

export function createCanvasRoutes(app: Express) {
  const prefix = '/api/canvases';

  // 分页列表：摘要信息（剔除体积较大的 nodes/edges/viewport，附节点/连线计数）
  app.get(
    prefix,
    resful(async (req) => {
      const { pageNum, pageSize, skip, take, keyword } = pageQuery(req);
      const { list, total } = await canvasService.findPaged({ skip, take, keyword });
      return {
        list: list.map(({ nodes, edges, viewport, ...meta }) => ({
          ...meta,
          nodeCount: nodes.length,
          edgeCount: edges.length,
        })),
        total,
        pageNum,
        pageSize,
      };
    }),
  );

  // 单个完整画布（含 nodes/edges/viewport）
  app.get(
    `${prefix}/:id`,
    resful((req) => canvasService.findById(pathId(req)), { notFoundMessage: '画布不存在' }),
  );

  // 创建画布
  app.post(
    prefix,
    resful(async (req) => {
      const { name, description, enabled, nodes, edges, viewport } = req.body;
      if (!name || typeof name !== 'string') throw new HttpError(400, '画布名称不能为空');
      validateGraph(nodes, edges);
      const record = await canvasService.create({
        name,
        description,
        enabled,
        nodes: nodes || [],
        edges: edges || [],
        viewport,
      });
      if (record) void runtime.upsertCanvas(record.id, record.enabled !== false);
      return record;
    }, { status: 201 }),
  );

  // 更新画布（保存时前端整体提交 nodes/edges；名称等元信息可单独更新）
  app.put(
    `${prefix}/:id`,
    resful(async (req) => {
      const id = pathId(req);
      const { name, description, enabled, nodes, edges, viewport } = req.body;
      validateGraph(nodes, edges);
      const record = await canvasService.update(id, { name, description, enabled, nodes, edges, viewport });
      if (record) void runtime.upsertCanvas(record.id, record.enabled !== false);
      return record;
    }, { notFoundMessage: '画布不存在' }),
  );

  // 切换启用/禁用（body: { enabled }）
  app.patch(
    `${prefix}/:id/toggle`,
    resful(async (req) => {
      const record = await canvasService.update(pathId(req), { enabled: !!req.body.enabled });
      if (record) void runtime.upsertCanvas(record.id, record.enabled !== false);
      return record;
    }, { notFoundMessage: '画布不存在' }),
  );

  // 删除画布：成功返回 204 无响应体
  app.delete(
    `${prefix}/:id`,
    resful(async (req) => {
      const id = pathId(req);
      if (!(await canvasService.findById(id))) return null; // → 404
      await canvasService.delete(id);
      void runtime.upsertCanvas(id, false); // 从引擎画布缓存中剔除
      return NO_CONTENT; // → 204
    }, { notFoundMessage: '画布不存在' }),
  );
}
