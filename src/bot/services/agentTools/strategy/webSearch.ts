import { PlaywrightManager } from "@/utils/playwright";
import { AgentTool, ToolManager } from "../type";

class WebSearch implements AgentTool {
  name = 'webSearch'
  description = '在网络上搜索内容'
  parameters = {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string' as const,
        description: '搜索的参数',
      }
    },
    required: ['query']
  }

  async execute(args: { query: string }) {
    const { query } = args
    const limit = 5

    const pm = PlaywrightManager.getInstance()
    const page = await pm.createPage()

    try {
      const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}`
      await pm.goto(page, url, {
        waitUntil: "domcontentloaded"
      });
      await page.waitForLoadState("networkidle");
      await page.waitForFunction(() => {
        const items = document.querySelectorAll(".b_algo h2 a");
        return items.length >= 3;
      }, { timeout: 15000 });

      const results = await page.evaluate((limit: number) => {
        const items: any[] = []
        const nodes = document.querySelectorAll('.b_algo')
        nodes.forEach((el) => {
          const a = el.querySelector("h2 a");
          const p = el.querySelector(".b_caption p");
          if (!a) return;
          const title = a.textContent?.trim();
          const url = (a as HTMLAnchorElement).href;
          const snippet = p?.textContent?.trim() || "";
          if (title && url) {
            items.push({
              title,
              url,
              snippet
            });
          }
        })
        return items.slice(0, limit);
      }, limit)
      return {
        query,
        results,
        source: "bing-playwright"
      };
    } catch (e) {
      return {
        query,
        results: [],
        error: e?.message
      }
    } finally {
      await page.close()
    }
  }

}
// ToolManager.getInstace().register(new WebSearch())

