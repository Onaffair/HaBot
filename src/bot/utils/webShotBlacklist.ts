/**
 * 网页截图域名黑名单
 *
 * 对于命中列表的域名，bot 将拒绝打开页面并截图。
 * 主要用于屏蔽需登录、含敏感内容、反爬严格或截图无意义的站点。
 *
 * 列表项的写法规则：
 *   - "example.com"      → 命中 example.com 及其任意子域名（a.example.com 等）
 *   - "*.example.com"    → 仅命中 example.com 的子域名，不含 example.com 本身
 *   - 自动忽略协议、端口、路径与大小写差异
 *
 * 用法：
 *   - isBlockedUrl(url)        → 使用内置黑名单判断是否命中
 *   - addBlacklistDomains(...) → 运行时向黑名单追加域名
 *   - isBlockedUrl(url, list)  → 使用自定义域名列表判断（便于扩展/测试）
 */

// 内置黑名单：按需增删
let DOMAIN_BLACKLIST: string[] = [
  // ===== 示例（取消注释即可启用） =====
  // 'example.com',
  // '*.sub.example.com',
  // 'https://assttyys.zzliux.cn',
];

export interface BlockResult {
  /** 是否命中黑名单 */
  blocked: boolean;
  /** 命中黑名单的原始域名条目；未命中则为空 */
  matched?: string;
}

/** 从列表里取出一个真实域名（不含通配），用于规范化 */
function normalize(entry: string): string {
  return entry.trim().toLowerCase().replace(/\.$/, '');
}

/**
 * 判断 hostname 是否命中某一条黑名单规则
 */
function hitRule(hostname: string, entry: string): boolean {
  const rule = normalize(entry);
  if (!rule) return false;

  if (rule.startsWith('*.')) {
    // "*.example.com" → 仅命中子域，不含根域本身
    const suffix = rule.slice(2); // "example.com"
    return hostname !== suffix && hostname.endsWith('.' + suffix);
  }
  // "example.com" → 命中根域及其任意子域
  return hostname === rule || hostname.endsWith('.' + rule);
}

/**
 * 判断 URL 是否命中域名黑名单
 * @param url 完整网址（http/https）
 * @param list 可选，自定义域名列表；缺省使用内置 DOMAIN_BLACKLIST
 * @returns { blocked: boolean, matched?: string }
 */
export function isBlockedUrl(url: string, list: string[] = DOMAIN_BLACKLIST): BlockResult {
  if (!url) return { blocked: false };

  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase().replace(/\.$/, '');
  } catch {
    return { blocked: false };
  }
  if (!hostname) return { blocked: false };

  for (const raw of list) {
    const entry = raw?.trim();
    if (!entry) continue;
    if (hitRule(hostname, entry)) {
      return { blocked: true, matched: raw };
    }
  }
  return { blocked: false };
}

/**
 * 运行时向黑名单追加域名（便于外部动态配置）
 */
export function addBlacklistDomains(...domains: string[]): void {
  for (const d of domains) {
    const name = normalize(d).replace(/^\*\./, '*.');
    if (name && !DOMAIN_BLACKLIST.includes(name)) {
      DOMAIN_BLACKLIST.push(name);
    }
  }
}

export default { DOMAIN_BLACKLIST, isBlockedUrl, addBlacklistDomains };
