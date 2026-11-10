import { PlaywrightManager } from "@/utils/playwright";
import { FFmpegTool } from "@/utils/ffmepg";
import { createLogger } from "@/utils/logger";
import { downloadFromUrl, fetchPageText } from "@/api/common/online";
import { configService } from "@/services/db/systemConfig";
import { Session } from "@/core/session";
import { VideoPlatform, VideoSpider, buildSpiderContent } from "../type";

// ============================================================================
// 抖音视频抓取策略
// ----------------------------------------------------------------------------
// 抓取顺序（由快到慢，任一成功即返回）：
//   1. 作品详情接口：免签接口，多数环境已返回空响应，能命中时最快；
//   2. 分享页内嵌数据：部分分享页仍带 SSR 数据，短链需先跟随重定向；
//   3. 无头浏览器拦截页面接口：当前最可靠，视频页会请求 aweme/detail。
// 图文作品（/note/ 地址或 images 非空）没有视频流，直接报错，不进入浏览器兜底。
// ============================================================================

const logger = createLogger("TiktokPlatform");

/** 移动端 UA：抖音分享页与接口对桌面 UA 的风控更严格 */
const MOBILE_USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

/** 作品详情接口：免签名，返回 item_list（接口失效时自动降级到分享页解析） */
const AWEME_ITEM_API = "https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/";

/** 短链形如 https://v.douyin.com/iRxxxxx/ */
const SHORT_URL_RE = /https?:\/\/v\.douyin\.com\/[A-Za-z0-9_-]+\/?/;
/** 长链形如 https://www.douyin.com/video/{id}、/note/{id} */
const VIDEO_URL_RE = /https?:\/\/(?:www\.)?douyin\.com\/(?:video|note)\/\d{15,20}/;
/** 分享页形如 https://www.iesdouyin.com/share/video/{id}/ */
const SHARE_PAGE_URL_RE = /https?:\/\/(?:www\.)?iesdouyin\.com\/share\/(?:video|note)\/\d{15,20}/;
/** 图文作品地址：/note/{id} 页面不会发出视频详情请求，且本身不含视频流 */
const NOTE_URL_RE = /\/(?:note|share\/note)\/\d{15,20}/;

/** 作品 id 提取规则：链接路径、首页弹窗参数、页面内嵌 JSON 三种来源 */
const AWEME_ID_RES = [
  /(?:video|note)\/(\d{15,20})/,
  /modal_id=(\d{15,20})/,
  /"aweme_id"\s*:\s*"(\d{15,20})"/,
];

/** 作品详情接口超时（毫秒）：接口通常秒回，超时即视为不可用 */
const ITEM_API_TIMEOUT = 10000;
/** 分享页抓取超时（毫秒） */
const SHARE_PAGE_TIMEOUT = 15000;
/** 视频文件下载超时（毫秒）：大文件需要更长时间 */
const VIDEO_DOWNLOAD_TIMEOUT = 120000;
/** 浏览器拦截接口的等待上限（毫秒）：视频页正常数秒内就会发出详情请求 */
const BROWSER_WAIT_TIMEOUT = 20000;
/** 落盘文件名最大长度：超长标题会触发文件系统限制 */
const FILE_NAME_MAX_LENGTH = 60;
/** 页面/接口 JSON 递归查找的最大深度：防止异常结构导致无限下钻 */
const MAX_PARSE_DEPTH = 12;
/** 作品对象收集上限：页面可能内嵌大量推荐作品，无需全量收集 */
const MAX_AWEME_CANDIDATES = 20;

/** 解析结果：标题用于回显与命名，videoUrls 为按优先级排序的候选播放地址 */
interface DouyinVideoInfo {
  title: string;
  videoUrls: string[];
}

/** 浏览器捕获结果：视频信息或图文作品标记（图文需尽早失败，不等超时） */
type BrowserCapture = DouyinVideoInfo | { imagePost: true };

/** 是否已确认详情接口不可用：命中空响应后不再重复请求 */
let itemApiDisabled = false;

/**
 * 从链接或页面文本中提取作品 id。
 * @param text 分享链接、重定向终址或页面 HTML
 * @returns 作品 id，未命中返回 null
 */
function findAwemeId(text: string): string | null {
  for (const reg of AWEME_ID_RES) {
    const match = text.match(reg);
    if (match) return match[1];
  }
  return null;
}

/**
 * 解析页面内嵌的 JSON 数据。
 * @remarks 新版分享页把数据挂在 window._ROUTER_DATA，旧版放在 #RENDER_DATA（URL 编码）
 * @param html 分享页 HTML
 */
function parsePageData(html: string): unknown | null {
  const routerIndex = html.indexOf("_ROUTER_DATA");
  if (routerIndex >= 0) {
    const braceIndex = html.indexOf("{", routerIndex);
    const json = braceIndex >= 0 ? sliceJsonObject(html, braceIndex) : null;
    const data = safeJsonParse(json);
    if (data) return data;
  }
  const renderMatch = html.match(/id="RENDER_DATA"[^>]*>([\s\S]*?)<\/script>/);
  if (!renderMatch) return null;
  return safeJsonParse(safeDecodeURIComponent(renderMatch[1]));
}

/**
 * 按括号配对截取一个完整 JSON 对象。
 * @remarks 正则无法可靠处理嵌套对象，这里逐字符扫描并跳过字符串内的括号与转义
 * @param text 原始文本
 * @param start 左花括号的下标
 */
function sliceJsonObject(text: string, start: number): string | null {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth++;
    else if (char === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/** JSON 解析失败返回 null，交由下一层兜底 */
function safeJsonParse(text: string | null): unknown | null {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** URL 解码失败时保留原文 */
function safeDecodeURIComponent(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

/**
 * 收集数据中所有作品对象（同时含 video 与作品标识的节点）。
 * @remarks 各版本接口/页面的数据结构不同，按结构特征收集比固定路径更稳；
 *   页面可能同时内嵌推荐作品，由调用方按 id 挑选目标
 * @param node 待遍历节点
 * @param depth 当前深度
 * @param found 已收集的作品对象
 */
function collectAwemeItems(node: any, depth = 0, found: any[] = []): any[] {
  if (!node || typeof node !== "object" || depth > MAX_PARSE_DEPTH) return found;
  if (found.length >= MAX_AWEME_CANDIDATES) return found;

  if (Array.isArray(node)) {
    for (const item of node) {
      collectAwemeItems(item, depth + 1, found);
    }
    return found;
  }

  if (node.video && (node.aweme_id || node.video.play_addr || node.video.download_addr)) {
    found.push(node);
  }
  for (const value of Object.values(node)) {
    collectAwemeItems(value, depth + 1, found);
  }
  return found;
}

/** playwm 为带水印的播放地址，替换为 play 即得到无水印地址 */
function normalizePlayUrl(url: string): string {
  return url.replace("/playwm/", "/play/").replace(/^http:\/\//, "https://");
}

/**
 * 是否为音频资源。
 * @remarks 图文作品的 video.play_addr 实际是背景音乐，不能当作视频下载
 */
function isAudioUrl(url: string): boolean {
  return /\.mp3(\?|$)/i.test(url) || url.includes("/ies-music");
}

/** 图文作品：图片队列非空（其 video.play_addr 为背景音乐） */
function isImagePost(item: any): boolean {
  return Array.isArray(item?.images) && item.images.length > 0;
}

/**
 * 从作品对象中提取标题与无水印播放地址。
 * @remarks 地址按清晰度与优先级收集：play_addr（无水印）→ bit_rate 各档位 → download_addr（带水印兜底）
 * @param item 接口/页面中的作品对象
 * @returns 无法得到任何播放地址时返回 null
 */
function parseAwemeItem(item: any): DouyinVideoInfo | null {
  // 图文作品的播放地址是背景音乐，没有可下载的视频流
  if (!item || !item.video || isImagePost(item)) return null;

  const videoUrls: string[] = [];
  const pushUrls = (list?: unknown) => {
    if (!Array.isArray(list)) return;
    for (const url of list) {
      if (typeof url !== "string" || !url.startsWith("http") || isAudioUrl(url)) continue;
      const normalized = normalizePlayUrl(url);
      if (!videoUrls.includes(normalized)) videoUrls.push(normalized);
    }
  };

  pushUrls(item.video.play_addr?.url_list);
  for (const rate of item.video.bit_rate ?? []) {
    pushUrls(rate?.play_addr?.url_list);
  }
  pushUrls(item.video.download_addr?.url_list);
  // 兜底：url_list 为空时用视频 uri 直接拼接播放接口
  if (typeof item.video.uri === "string" && item.video.uri) {
    pushUrls([`https://www.douyin.com/aweme/v1/play/?video_id=${item.video.uri}&ratio=1080p&line=0`]);
  }
  if (!videoUrls.length) return null;

  const title = String(item.desc ?? item.item_title ?? "").trim();
  return {
    title: title || `douyin_${item.aweme_id ?? Date.now()}`,
    videoUrls,
  };
}

/** 统一提取异常信息，避免 catch 到字符串时报错 */
function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

class TiktokPlatform implements VideoPlatform {
  name = "tiktok";

  match(session: Session) {
    const content = buildSpiderContent(session);
    return [
      "https://www.douyin.com/video/",
      "https://v.douyin.com/",
      "https://www.iesdouyin.com/share/",
    ].some((t) => content.includes(t));
  }

  async handle(session: Session): Promise<{ title: string; path: string }> {
    const shareUrl = this.extractUrl(buildSpiderContent(session));
    if (!shareUrl) {
      throw new Error("no tiktok videoUrl");
    }

    const { title, videoUrls } = await this.resolveVideoInfo(shareUrl);
    const videoBuffer = await this.downloadFirstAvailable(videoUrls);
    const path = await FFmpegTool.getInstance().saveVideo(videoBuffer, this.toFileName(title));
    logger.info(`Douyin video saved: ${path}`);

    return { title, path };
  }

  /** 请求抖音接口/页面/视频地址时统一携带的请求头 */
  private get requestHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "user-agent": MOBILE_USER_AGENT,
      "accept-language": "zh-CN,zh;q=0.9",
      referer: "https://www.douyin.com/",
    };
    // 风控较严时可从系统配置补充 Cookie（留空则匿名请求）
    const cookie = configService.get("DOUYIN_COOKIE");
    if (cookie) headers.cookie = cookie;
    return headers;
  }

  /**
   * 解析作品信息，按接口 → 分享页 → 浏览器的顺序逐层降级。
   * @param shareUrl 分享短链、作品长链或分享页地址
   * @remarks /note/ 图文作品没有视频流，接口也拿不到视频，直接抛出原因
   */
  private async resolveVideoInfo(shareUrl: string): Promise<DouyinVideoInfo> {
    const awemeId = findAwemeId(shareUrl);
    if (awemeId) {
      const fromApi = await this.fetchByItemApi(awemeId);
      if (fromApi) {
        logger.info(`Douyin video resolved by item api: ${awemeId}`);
        return fromApi;
      }
    }

    if (NOTE_URL_RE.test(shareUrl)) {
      throw new Error(`douyin post is image note (no video): ${shareUrl}`);
    }

    const fromPage = this.needsSharePage(shareUrl)
      ? await this.fetchBySharePage(shareUrl, awemeId)
      : null;
    if (fromPage) {
      logger.info(`Douyin video resolved by share page: ${shareUrl}`);
      return fromPage;
    }

    logger.warn(`Douyin api unavailable, fallback to browser: ${shareUrl}`);
    return this.fetchByBrowser(shareUrl);
  }

  /**
   * 是否需要先抓分享页。
   * @remarks PC 作品页（www.douyin.com/video/{id}）是 SPA，HTML 里没有作品数据，
   *   直接走浏览器更快；短链必须先重定向，分享页才可能带 SSR 数据
   */
  private needsSharePage(url: string): boolean {
    return SHORT_URL_RE.test(url) || SHARE_PAGE_URL_RE.test(url);
  }

  /**
   * 作品详情接口：免签名、只取首个作品。
   * @remarks 该接口在多数环境已返回空响应，命中一次后就不再重试，避免无用等待
   */
  private async fetchByItemApi(awemeId: string): Promise<DouyinVideoInfo | null> {
    if (itemApiDisabled) return null;

    try {
      const json = await downloadFromUrl(AWEME_ITEM_API, {
        params: { item_ids: awemeId },
        headers: this.requestHeaders,
        timeout: ITEM_API_TIMEOUT,
      });
      const info = parseAwemeItem(json?.item_list?.[0]);
      if (!info) {
        itemApiDisabled = true;
        logger.info("Douyin item api returned no video, disabled for this process");
      }
      return info;
    } catch (err) {
      logger.warn(`Douyin item api failed: ${awemeId} ${errorMessage(err)}`);
      return null;
    }
  }

  /**
   * 从页面作品列表中提取目标作品信息。
   * @param items 页面内嵌数据中收集到的作品对象
   * @param expectedId 期望的作品 id，命中则优先使用，避免误取页面内的推荐作品
   */
  private parsePageVideoInfo(items: any[], expectedId: string | null): DouyinVideoInfo | null {
    if (!items.length) return null;

    const matched = expectedId
      ? items.find((item) => String(item.aweme_id) === expectedId)
      : null;
    for (const item of matched ? [matched, ...items] : items) {
      const info = parseAwemeItem(item);
      if (info) return info;
    }
    return null;
  }

  /**
   * 分享页解析：短链会跟随重定向，页面内嵌数据即完整作品信息。
   * @param url 分享链接
   * @param knownId 已从入参拿到的作品 id（页面解析不出 id 时复用）
   * @remarks 页面请求失败只降级不抛错；图文作品属于确定性失败，向上抛出
   */
  private async fetchBySharePage(
    url: string,
    knownId: string | null
  ): Promise<DouyinVideoInfo | null> {
    let page: { finalUrl: string; text: string };
    try {
      page = await fetchPageText(url, {
        headers: this.requestHeaders,
        timeout: SHARE_PAGE_TIMEOUT,
      });
    } catch (err) {
      logger.warn(`Douyin share page failed: ${errorMessage(err)}`);
      return null;
    }

    const awemeId = findAwemeId(page.finalUrl) ?? findAwemeId(page.text) ?? knownId;
    const items = collectAwemeItems(parsePageData(page.text));

    const parsed = this.parsePageVideoInfo(items, awemeId);
    if (parsed) return parsed;

    // 短链重定向到 note 页 / 页面数据为图文作品：没有视频流，直接给出原因
    if (NOTE_URL_RE.test(page.finalUrl) || items.some(isImagePost)) {
      throw new Error(`douyin post is image note (no video): ${page.finalUrl}`);
    }

    // PC 页面可能只返回骨架 HTML，此时用拿到的 id 再请求一次接口
    if (awemeId) return this.fetchByItemApi(awemeId);
    return null;
  }

  /**
   * 兜底方案：无头浏览器打开分享页，拦截页面自身发起的详情接口响应。
   * @remarks 视频页会请求 aweme/detail；命中图文作品时立即失败，不等超时
   */
  private async fetchByBrowser(shareUrl: string): Promise<DouyinVideoInfo> {
    const pm = PlaywrightManager.getInstance();
    const page = await pm.createPage();

    try {
      // 先开始导航（触发页面 API 请求），不等待其完成
      pm.goto(page, shareUrl, { waitUntil: "domcontentloaded" }).catch(() => {
        /* 导航失败不阻塞——API 响应可能已被捕获 */
      });

      // 必须 await：直接在 try 中 return Promise 会先执行 finally，页面被提前关闭
      const capture = await pm.waitForFirstResponse<BrowserCapture>(
        page,
        [
          {
            urlPredicate: (url) => url.includes("/aweme/v1/web/series/aweme/"),
            extractor: (json) => this.parseCapturedItem(json?.aweme_list?.[0]),
          },
          {
            urlPredicate: (url) => url.includes("/aweme/v1/web/aweme/detail/"),
            extractor: (json) => this.parseCapturedItem(json?.aweme_detail),
          },
        ],
        BROWSER_WAIT_TIMEOUT
      );

      if ("imagePost" in capture) {
        throw new Error(`douyin post is image note (no video): ${shareUrl}`);
      }
      return capture;
    } finally {
      // 只关闭当前页面：上下文由 PlaywrightManager 复用，关闭上下文会连带销毁浏览器
      await page.close().catch(() => {});
    }
  }

  /**
   * 解析浏览器拦截到的作品：图文作品返回标记，供调用方提前失败。
   * @param item 详情接口响应中的作品对象
   */
  private parseCapturedItem(item: any): BrowserCapture | null {
    const info = parseAwemeItem(item);
    if (info) return info;
    return isImagePost(item) ? { imagePost: true } : null;
  }

  /** 依次尝试候选地址下载，任一成功即返回 */
  private async downloadFirstAvailable(videoUrls: string[]): Promise<Buffer> {
    let lastError: unknown = null;

    for (const url of videoUrls) {
      try {
        const buffer = (await downloadFromUrl(url, {
          responseType: "arraybuffer",
          headers: this.requestHeaders,
          timeout: VIDEO_DOWNLOAD_TIMEOUT,
        })) as Buffer;
        if (buffer?.byteLength > 0) return buffer;
        lastError = new Error("empty video response");
      } catch (err) {
        lastError = err;
        logger.warn(`Douyin video download failed, try next url: ${errorMessage(err)}`);
      }
    }
    throw lastError instanceof Error ? lastError : new Error("douyin video download failed");
  }

  /** 从文本中提取视频完整 URL */
  private extractUrl(text: string): string | null {
    for (const reg of [SHORT_URL_RE, VIDEO_URL_RE, SHARE_PAGE_URL_RE]) {
      const match = text.match(reg);
      if (match) return match[0];
    }
    return null;
  }

  /** 生成可落盘的文件名：剔除非法字符、压缩空白并截断超长标题 */
  private toFileName(title: string): string {
    const name = title
      .replace(/[\\/:*?"<>|\r\n\t]/g, " ")
      .replace(/\s+/g, " ")
      .replace(/[. ]+$/, "")
      .trim()
      .slice(0, FILE_NAME_MAX_LENGTH);
    return name || `douyin_${Date.now()}`;
  }
}

VideoSpider.getInstance().register(new TiktokPlatform());
