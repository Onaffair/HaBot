import { Page, BrowserContext } from "playwright";
import { mkdirSync } from "fs";
import { resolve } from "path";

/**
 * 解析浏览器 profile 持久化目录（src/config/playwright），
 * 兼容 ts-node 源码运行（src/bot/utils）与编译后运行（dist/bot/utils）两种场景。
 * profile 会在多次启动间复用，保留登录态、Cookie、localStorage 等数据。
 */
function resolveProfileDir(): string {
  const inDist = __dirname.replace(/\\/g, "/").includes("/dist/");
  return inDist
    ? resolve(__dirname, "..", "..", "..", "src", "config", "playwright")
    : resolve(__dirname, "..", "..", "config", "playwright");
}

export class PlaywrightManager {
  private static instance: PlaywrightManager | null = null;
  private context: BrowserContext | null = null;

  private constructor() { }

  /**
   * 获取 PlaywrightManager 单例
   */
  static getInstance(): PlaywrightManager {
    if (!PlaywrightManager.instance) {
      PlaywrightManager.instance = new PlaywrightManager();
    }
    return PlaywrightManager.instance;
  }

  /**
   * 获取持久化浏览器上下文（懒加载），首次调用时自动启动 Chromium（Playwright 内置浏览器）
   * @remarks 使用 launchPersistentContext 将 profile 持久化到 src/config/playwright，
   *   后续启动自动复用该 profile，保留登录态、Cookie 等会话数据。
   *   注意：同一 profile 同一时刻只能被一个浏览器实例使用。
   */
  async getContext(): Promise<BrowserContext> {
    if (!this.context) {
      const { chromium } = await import("playwright");
      const userDataDir = resolveProfileDir();
      mkdirSync(userDataDir, { recursive: true });
      this.context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
      });
      // 上下文被外部关闭时清空引用，便于下次懒加载重启
      this.context.on("close", () => {
        this.context = null;
      });
    }
    return this.context;
  }

  /**
   * 在持久化上下文中创建新页面
   * @remarks 所有页面共享同一 profile（Cookie/localStorage 互通），
   *   与此前每页独立上下文的隔离行为不同。
   */
  async createPage(): Promise<Page> {
    const context = await this.getContext();
    return context.newPage();
  }

  /**
   * 导航到指定 URL
   * @remarks 默认使用 domcontentloaded 而非 networkidle，
   *   因为 networkidle 在持续有网络活动的页面（如抖音）上可能永不结束。
   * @param page 页面实例
   * @param url 目标地址
   * @param options 可选配置，默认 { waitUntil: "domcontentloaded" }
   */
  async goto(
    page: Page,
    url: string,
    options?: Parameters<Page["goto"]>[1]
  ): Promise<void> {
    await page.goto(url, options ?? { waitUntil: "domcontentloaded" });
  }

  /**
   * 从顶部逐步滚动到底部，触发页面懒加载内容（瀑布流/图片流/无限列表等）。
   * 每次滚动一屏并稍作停留，直到页面高度不再增长且已到底部。
   * @param page 页面实例
   * @param scrollStep 每次滚动的高度（像素），默认取当前视口高度
   * @param settleDelay 每次滚动后等待内容加载的时间（毫秒），默认 500
   * @param maxScrolls 最大滚动次数上限，防止无限列表导致死循环，默认 100
   */
  async scrollToBottom(
    page: Page,
    options?: {
      scrollStep?: number;
      settleDelay?: number;
      maxScrolls?: number;
    }
  ): Promise<void> {
    const { settleDelay = 500, maxScrolls = 100 } = options ?? {};
    const scrollStep =
      options?.scrollStep ??
      (await page.evaluate(() => window.innerHeight || 800));

    let scrolls = 0;
    let lastHeight = -1;
    let lastScrollY = -1;

    while (scrolls < maxScrolls) {
      // 获取当前滚动位置与页面总高度
      const { scrollY, scrollHeight } = await page.evaluate(() => ({
        scrollY: window.scrollY,
        scrollHeight: document.documentElement.scrollHeight,
      }));

      // 已到底部且高度稳定（不再有新内容加载）
      if (scrollY + (await page.evaluate(() => window.innerHeight)) >= scrollHeight - 5) {
        // 若高度还在变化，多滚一次让懒加载落定
        if (scrollHeight === lastHeight) break;
        lastHeight = scrollHeight;
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        await page.waitForTimeout(settleDelay);
        scrolls++;
        continue;
      }

      // 向下滚动一屏，触发懒加载
      await page.evaluate((step) => {
        window.scrollBy(0, step);
      }, scrollStep);
      await page.waitForTimeout(settleDelay);

      // 高度不再增长且位置没变化（滚动失效/到极限），提前结束
      const newState = await page.evaluate(() => ({
        y: window.scrollY,
        h: document.documentElement.scrollHeight,
      }));
      if (newState.y === lastScrollY && newState.h === lastHeight) break;
      lastScrollY = newState.y;
      lastHeight = newState.h;
      scrolls++;
    }
    // 回到顶部，确保 fullPage 截图从页面顶部开始
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(settleDelay);
  }

  /**
   * 网页长截屏：使用无头浏览器打开网址，滚动到底部触发懒加载后，
   * 截取整个可滚动页面并返回 Buffer。
   * @remarks 默认先滚动到底（触发懒加载内容），再以 fullPage 截取完整长图。
   *   若设置 fullPage=false 且 scrollToBottom=false，则仅截取当前视口区域。
   * @param url 目标网址
   * @param options 截图配置项
   * @returns 截图 Buffer（默认 PNG 格式）
   */
  async screenshot(
    url: string,
    options?: {
      /** 视口宽度，默认 1280 */
      width?: number;
      /** 视口高度，默认 800 */
      height?: number;
      /** 是否截取整个可滚动页面（长图），默认 true */
      fullPage?: boolean;
      /** 截屏前是否先滚动到底部触发懒加载，默认随 fullPage 开启 */
      scrollToBottom?: boolean;
      /** 滚动后等待内容加载的时间（毫秒），默认 500 */
      settleDelay?: number;
      /** 图片格式，默认 png */
      type?: "png" | "jpeg";
      /** jpeg 图片质量 1-100，仅 type 为 jpeg 时生效 */
      quality?: number;
      /** 页面导航超时时间（毫秒），默认 30000 */
      timeout?: number;
      /** 页面加载完成后的额外等待时间（毫秒），默认 500 */
      delay?: number;
    }
  ): Promise<Buffer> {
    const {
      width = 1280,
      height = 800,
      fullPage = true,
      scrollToBottom = fullPage,
      settleDelay = 500,
      type = "png",
      quality,
      timeout = 30000,
      delay = 500
    } = options ?? {};

    const page = await this.createPage();
    try {
      await page.setViewportSize({ width, height });

      // 导航到目标页面（DOM 就绪即继续）
      await page.goto(url, { waitUntil: "domcontentloaded", timeout });

      // 尝试等待网络空闲，超时（如长连接页面）则忽略继续
      await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => { });

      // 滚动到底部触发懒加载，让整页内容完整渲染
      if (scrollToBottom) {
        await this.scrollToBottom(page, { settleDelay });
      }

      // 额外等待动态内容渲染
      if (delay > 0) {
        await page.waitForTimeout(delay);
      }

      const buffer = await page.screenshot({
        fullPage,
        type,
        ...(type === "jpeg" && quality !== undefined ? { quality } : {}),
        animations: "disabled"
      });
      return buffer;
    } finally {
      // 关闭页面及其所属上下文，避免资源泄漏
      // const context = page.context();
      // await page.close().catch(() => { });
      // await context.close().catch(() => { });
    }
  }

  /**
   * 等待匹配 URL 模式的 API 响应，并用 extractor 提取数据
   * @param page 页面实例
   * @param urlPredicate URL 匹配函数，返回 true 表示命中目标 API
   * @param extractor 数据提取函数，接收 JSON 响应，返回提取结果；返回 null/undefined 则跳过
   * @param timeout 超时时间（毫秒），默认 15000
   */
  async waitForApiResponse<T>(
    page: Page,
    urlPredicate: (url: string) => boolean,
    extractor: (json: any) => T | null,
    timeout: number = 15000
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("等待 API 响应超时"));
      }, timeout);
      const cleanup = () => clearTimeout(timer);

      page.on("response", async (response) => {
        if (urlPredicate(response.url())) {
          try {
            const json = await response.json();
            const result = extractor(json);
            if (result !== null && result !== undefined) {
              cleanup();
              resolve(result);
            }
          } catch {
            /* 非 JSON 响应跳过 */
          }
        }
      });

      page.on("crash", () => {
        cleanup();
        reject(new Error("页面崩溃"));
      });

      page.on("close", () => {
        cleanup();
        reject(new Error("页面已关闭"));
      });
    });
  }

  /**
   * 等待多个可能的 API 响应中最先匹配的一个
   * @param page 页面实例
   * @param handlers 处理器数组，每项包含 urlPredicate 和 extractor
   * @param timeout 超时时间（毫秒），默认 15000
   */
  async waitForFirstResponse<T>(
    page: Page,
    handlers: Array<{
      urlPredicate: (url: string) => boolean;
      extractor: (json: any) => T | null;
    }>,
    timeout: number = 30000
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("等待 API 响应超时"));
      }, timeout);

      const cleanup = () => clearTimeout(timer);

      page.on("response", async (response) => {
        const url = response.url();
        // console.log(`current url: ${url}`);

        for (const { urlPredicate, extractor } of handlers) {
          if (urlPredicate(url)) {
            try {
              const json = await response.json();
              const result = extractor(json);
              if (result !== null && result !== undefined) {
                cleanup();
                resolve(result);
                return;
              }
            } catch {
              /* 非 JSON 响应跳过 */
            }
          }
        }
      });

      page.on("crash", () => {
        cleanup();
        reject(new Error("页面崩溃"));
      });

      page.on("close", () => {
        cleanup();
        reject(new Error("页面已关闭"));
      });
    });
  }

  /**
   * 关闭浏览器上下文并释放资源（profile 数据保留在磁盘，下次启动继续复用）
   */
  async closeBrowser(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
  }
}
