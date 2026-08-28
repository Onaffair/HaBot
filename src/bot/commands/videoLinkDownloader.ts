
import { VideoSpider } from "@/services/spider";
import { Command, CommandFactory } from "@/core/command";
import { createLogger } from "@/utils/logger";
import { makeTextMsg, makeVideoMsg } from "@/utils/message";

const logger = createLogger('videoDownloader')

const videoSpider = VideoSpider.getInstance()

const videoDownloaderCmd: Command = {
  name: '视频分享下载',
  description: '下载转发过来的视频链接',
  match: (session) => {
    return videoSpider.hasAnyMatch(session)
  },
  handle: async (session) => {
    const { title, path } = await videoSpider.handle(session)
    logger.info(`${title} has download in ${path}`)
    return { type: 'message', items: [makeVideoMsg(path), makeTextMsg(title)] }
  },
}
CommandFactory.getInstance().registry(videoDownloaderCmd)





