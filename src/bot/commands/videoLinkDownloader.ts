
import { VideoSpider } from "@/services/spider";
import { Command } from "@/core/command";
import { createLogger } from "@/utils/logger";
import { MessageBuilder } from "@/utils/message";

const logger = createLogger('videoDownloader')

const videoSpider = VideoSpider.getInstance()

export const videoDownloaderCmd: Command = {
  name: '视频分享下载',
  description: '下载转发过来的视频链接',
  match: (session) => {
    return videoSpider.hasAnyMatch(session)
  },
  handle: async (session) => {
    const { title, path } = await videoSpider.handle(session)
    logger.info(`${title} has download in ${path}`)
    return MessageBuilder.message().video(path).text(title).build()
  },
}





