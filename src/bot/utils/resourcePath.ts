import fs from 'fs';
import path from 'path';
import { configService } from '@/services/db/systemConfig';
import { createLogger } from '@/utils/logger';

// ============================================================================
// 资源路径解析（纯文件系统）
// ----------------------------------------------------------------------------
// 目录管理模块（managed_resources / resource bean folder 树）移除后，资源不再有
// 「段名 → 目录」的映射层：所有引用点（硬编码命令、画布消息节点）一律直接使用
// 文件系统路径。约定与历史保持一致：
//   - 末段带扩展名 → 具体文件，精确命中；不存在时在同一父目录内按子串降级匹配
//   - 其余 → 视为目录，递归（限深）收集媒体文件后随机挑一个
//   - 相对路径以 RESOURCE_PATH 为基准解析，绝对路径原样使用
// 本模块被 utils/message 的 makeResource 与 flow 的消息节点执行器共用，
// 保证「同一份路径写法在命令与画布里行为一致」。
// ============================================================================

const logger = createLogger('ResourcePath');

/** 画布/消息支持的媒体资源类型 */
export type ResourceKind = 'image' | 'video' | 'record';

/** 语音类扩展名：record 消息段 */
const VOICE_EXT_RE = /\.(mp3|wav|ogg|amr|silk)$/i;
/** 视频类扩展名：video 消息段 */
const VIDEO_EXT_RE = /\.(mp4|mov|avi|webm|flv|m4v|mkv)$/i;

/** 各类媒体允许的扩展名（含点，小写），目录随机选取时按此过滤 */
export const MEDIA_EXT_BY_TYPE: Record<ResourceKind, string[]> = {
  image: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'],
  video: ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.m4v'],
  record: ['.mp3', '.wav', '.ogg', '.amr', '.m4a', '.flac', '.silk'],
};

/** 全部合法媒体扩展名（调用方未指定类型时的过滤集） */
const ALL_MEDIA_EXTS: string[] = Object.values(MEDIA_EXT_BY_TYPE).flat();

/** 递归扫描目录的最大深度，防御畸形/过深目录 */
const MAX_SCAN_DEPTH = 5;

/** 资源根目录（RESOURCE_PATH 配置，相对 cwd 解析） */
export function resourceBaseDir(): string {
  return path.resolve(process.cwd(), configService.get('RESOURCE_PATH', 'src/resources'));
}

/** 末段带扩展名视为具体文件 */
export function looksLikeFile(p: string): boolean {
  return /\.[\w]+$/.test(path.basename(p));
}

/** 依据文件扩展名推断消息段类型；未识别后缀按 image 兜底以适配绝大多数资源目录 */
export function guessResourceKind(file: string): ResourceKind {
  if (VOICE_EXT_RE.test(file)) return 'record';
  if (VIDEO_EXT_RE.test(file)) return 'video';
  return 'image';
}

/** 把变长路径段拼成绝对路径：首段为绝对路径时直接解析，否则相对 RESOURCE_PATH */
export function toResourceAbsPath(segments: string[]): string {
  const cleaned = segments.filter((s) => s && s.trim()).map((s) => s.trim());
  const joined = cleaned.join(path.sep);
  if (cleaned.length && path.isAbsolute(cleaned[0])) return path.resolve(joined);
  return path.resolve(resourceBaseDir(), joined);
}

/** 递归收集目录下命中扩展名的文件绝对路径（限制深度，读目录失败静默跳过） */
export function scanMedia(dir: string, exts: string[], depth = 0): string[] {
  if (depth > MAX_SCAN_DEPTH) return [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const result: string[] = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) result.push(...scanMedia(full, exts, depth + 1));
    else if (e.isFile() && exts.some((ext) => e.name.toLowerCase().endsWith(ext))) result.push(full);
  }
  return result;
}

/**
 * 解析资源路径为可发送的文件绝对路径。
 * @param segments 变长路径段（目录层级 + 可选文件名），相对值以 RESOURCE_PATH 为基准
 * @param kind     指定时仅在该类媒体的扩展名白名单内选取；缺省接受全部媒体类型
 * @returns 命中的文件绝对路径；解析不到返回 undefined（并写告警）
 */
export function resolveResourceFile(segments: string[], kind?: ResourceKind): string | undefined {
  const exts = kind ? MEDIA_EXT_BY_TYPE[kind] : ALL_MEDIA_EXTS;
  const abs = toResourceAbsPath(segments);

  // 具体文件：存在即用
  if (looksLikeFile(abs)) {
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return abs;
    // 降级：末段当作父目录内的文件名过滤子串（兼容旧 name 子串匹配语义）
    const parent = path.dirname(abs);
    const needle = path.basename(abs).toLowerCase();
    const fuzzy = scanMedia(parent, exts).filter((p) => p.toLowerCase().includes(needle));
    if (fuzzy.length > 0) return fuzzy[Math.floor(Math.random() * fuzzy.length)];
    logger.warn(`Resource file not found: ${abs}`);
    return undefined;
  }

  // 目录：递归收集后随机
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
    logger.warn(`Resource directory not found: ${abs}`);
    return undefined;
  }
  const candidates = scanMedia(abs, exts);
  if (candidates.length === 0) {
    logger.warn(`No media file under directory: ${abs}`);
    return undefined;
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}
