import { Request, Response } from 'express';

// ============================================================================
// RESTful 路由封装
// ----------------------------------------------------------------------------
// 路由 handler 只负责「返回资源数据」或「抛出异常」，不直接操纵 res：
// - 返回资源对象/数组        → 200（或 options.status，如创建返回 201）
// - 返回 null / undefined    → 404 { message }
// - 返回 NO_CONTENT 哨兵     → 204 无响应体（删除成功）
// - 抛 HttpError(status)     → 对应状态码 { message }
// - 抛 Prisma 已知错误       → P2025=404 / P2002=409
// - 其他异常                 → 500 { message }
// 分页列表返回顶层 { list, total, pageNum, pageSize }，与前端 useTable 直接对接。
// ============================================================================

/** 可映射 HTTP 状态码的业务异常 */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

/** handler 成功但无响应体时的哨兵返回值（如 DELETE → 204） */
export const NO_CONTENT = Symbol('no-content');

export interface ResfulOptions {
  /** 成功返回资源时的状态码，默认 200；创建类接口传 201 */
  status?: number;
  /** handler 返回 null/undefined 时的提示语，默认「资源不存在」 */
  notFoundMessage?: string;
}

/** RESTful handler：入参为请求，返回资源数据（或其 Promise） */
export type ResfulHandler = (req: Request) => Promise<any> | any;

/** 包装 handler 为标准 RESTful 端点 */
export function resful(handler: ResfulHandler, options: ResfulOptions = {}) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await handler(req);
      if (result === NO_CONTENT) {
        res.status(204).end();
        return;
      }
      if (result === undefined || result === null) {
        res.status(404).json({ message: options.notFoundMessage || '资源不存在' });
        return;
      }
      res.status(options.status ?? 200).json(result);
    } catch (err: any) {
      if (err instanceof HttpError) {
        res.status(err.status).json({ message: err.message });
      } else if (err?.code === 'P2025') {
        res.status(404).json({ message: '资源不存在' });
      } else if (err?.code === 'P2002') {
        res.status(409).json({ message: '资源已存在' });
      } else {
        res.status(500).json({ message: err?.message || '服务器内部错误' });
      }
    }
  };
}

// --------------------------------------------------------------------------
// 分页查询参数解析（与前端 useTable 的 pageNum / pageSize 约定一致）
// --------------------------------------------------------------------------
export interface PageQuery {
  pageNum: number;
  pageSize: number;
  skip: number;
  take: number;
  keyword: string;
}

/** 从 query 提取分页与搜索参数，pageSize 限定 1~100 */
export function pageQuery(req: Request): PageQuery {
  const pageNum = Math.max(1, parseInt(req.query.pageNum as string, 10) || 1);
  const rawSize = parseInt(req.query.pageSize as string, 10) || 10;
  const pageSize = Math.min(100, Math.max(1, rawSize));
  const keyword = ((req.query.keyword as string) || '').trim();
  return { pageNum, pageSize, skip: (pageNum - 1) * pageSize, take: pageSize, keyword };
}

/** 提取并校验路径中的数字 id */
export function pathId(req: Request, name = 'id'): number {
  const id = parseInt(req.params[name] as string, 10);
  if (Number.isNaN(id)) throw new HttpError(400, `非法的资源 ID: ${req.params[name]}`);
  return id;
}
