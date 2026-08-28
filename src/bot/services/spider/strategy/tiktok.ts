import { VideoPlatform, VideoSpider, buildSpiderContent } from "../type";
import { Session } from "@/core/session";
import { createLogger } from "@/utils/logger";
import { FFmpegTool } from "@/utils/ffmepg";
import { downloadFromUrl } from "@/api/common/online";
import { PlaywrightManager } from "@/utils/playwright";

const logger = createLogger("TiktokPlatform");
class TiktokPlatform implements VideoPlatform {
  name = "tiktok";
  match(session: Session) {
    return [
      "https://www.douyin.com/video/",
      "https://v.douyin.com/",
    ].some((t) => buildSpiderContent(session).includes(t));
  }

  async handle(session: Session): Promise<{ title: string; path: string }> {
    const shareUrl = this.extractUrl(buildSpiderContent(session));
    if (!shareUrl) {
      throw new Error("no titok videoUrl");
    }
    const { title, videoUrl } = await this.getApiResponse(shareUrl);
    const videoBuffer = (await downloadFromUrl(videoUrl, {
      responseType: "arraybuffer",
    })) as Buffer;
    const path = await FFmpegTool.getInstance().saveVideo(videoBuffer, title);

    return {
      title,
      path,
    };
  }
  /** 从文本中提取视频完整 URL */
  private extractUrl(text: string): string | null {
    const patterns = [
      /https?:\/\/v\.douyin\.com\/[A-Za-z0-9]+\/?/,
      /https?:\/\/www\.douyin\.com\/video\/(\d+)/,
    ];
    for (const reg of patterns) {
      const match = text.match(reg);
      if (match) return match[0];
    }
    return null;
  }

  private async getApiResponse(
    videoUrl
  ): Promise<{ title: string; videoUrl: string }> {
    const pm = PlaywrightManager.getInstance();
    const page = await pm.createPage();

    try {
      // 先开始导航（触发页面 API 请求），不等待其完成
      pm.goto(page, videoUrl, { waitUntil: "domcontentloaded" }).catch(() => {
        /* 导航失败不阻塞——API 响应可能已被捕获 */
      });

      // 等待两个抖音 API 中先返回的一个
      const apiResponse = await pm.waitForFirstResponse<{
        title: string;
        videoUrl: string;
      }>(page, [
        {
          urlPredicate: (url) =>
            url.includes("/aweme/v1/web/series/aweme/"),
          extractor: (json) => {
            const videoUrl = (
              json?.aweme_list?.[0]?.video?.download_addr
                ?.url_list as string[]
            )?.pop();
            const title = json?.aweme_list?.pop()?.item_title as string;
            return videoUrl && title ? { title, videoUrl } : null;
          },
        },
        {
          urlPredicate: (url) =>
            url.includes("/aweme/v1/web/aweme/detail/"),
          extractor: (json) => {
            const videoUrl = (
              json?.aweme_detail?.video?.download_addr
                ?.url_list as string[]
            )?.pop();
            const title = json?.aweme_detail?.item_title as string;
            return videoUrl && title ? { title, videoUrl } : null;
          },
        },
      ]);
      return apiResponse;
    } finally {
      // 关闭页面上下文，浏览器实例保持复用
      await page.context().close();
    }
  }
}
VideoSpider.getInstance().register(new TiktokPlatform());
