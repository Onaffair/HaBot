import { Browser, Page, BrowserContext } from "playwright";

export class PlaywrightManager {
  private static instance: PlaywrightManager | null = null;
  private browser: Browser | null = null;

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
   * 获取浏览器实例（懒加载），首次调用时自动启动 Chromium
   */
  async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      const { chromium } = await import("playwright");
      this.browser = await chromium.launch({ headless: true });
    }
    return this.browser;
  }

  /**
   * 创建新页面（带全新上下文），每次调用返回独立页面
   */
  async createPage(): Promise<Page> {
    const browser = await this.getBrowser();
    const context: BrowserContext = await browser.newContext();
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
   * 关闭浏览器并释放资源
   */
  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
