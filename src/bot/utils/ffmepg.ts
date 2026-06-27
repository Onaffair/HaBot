import { spawn } from "child_process";
import * as path from "path";
import * as fs from "fs";
import * as os from 'os'


export interface FfmpegOptions {
  ffmpegPath?: string;
  log?: boolean;
  overwrite?: boolean;
}

export class FFmpegTool {
  private static instance: FFmpegTool | null = null;

  private ffmpegPath: string;
  private log: boolean;
  private overwrite: boolean;
  private outputDir: string;

  /**
   * ❗ 构造函数私有化（核心）
   */
  private constructor(options?: FfmpegOptions) {
    this.ffmpegPath = options?.ffmpegPath || "ffmpeg";
    this.log = options?.log ?? false;
    this.overwrite = options?.overwrite ?? true;

    this.outputDir = path.resolve(process.cwd(), process.env.outputDir);

    this.ensureDir(this.outputDir);
  }

  /**
   *  单例入口
   */
  public static getInstance(options?: FfmpegOptions): FFmpegTool {
    if (!this.instance) {
      this.instance = new FFmpegTool(options);
    }
    return this.instance;
  }

  /**
   * 合并音视频
   */
  async mergeAudioVideo(
    video: string | Buffer,
    audio: string | Buffer,
    fileName: string
  ): Promise<string> {
    const isVideoBuffer = Buffer.isBuffer(video);
    const isAudioBuffer = Buffer.isBuffer(audio);

    const videoPath = isVideoBuffer
      ? this.createTempFile(video, "video")
      : video;

    const audioPath = isAudioBuffer
      ? this.createTempFile(audio, "audio")
      : audio;

    const outputPath = path.join(
      this.outputDir,
      `${fileName}.mp4`
    );

    const args: string[] = [];

    if (this.overwrite) {
      args.push("-y");
    }

    args.push(
      "-i",
      videoPath,
      "-i",
      audioPath,
      "-c:v",
      "copy",
      "-c:a",
      "copy",
      outputPath
    );
    await this.run(args);
    // 清理临时文件
    if (isVideoBuffer) fs.unlinkSync(videoPath);
    if (isAudioBuffer) fs.unlinkSync(audioPath);

    return outputPath;
  }

  /**
   * 保存视频
   */
  async saveVideo(
    video: string | Buffer,
    fileName: string
  ): Promise<string> {
    const outputPath = path.join(
      this.outputDir,
      `${fileName}.mp4`
    );
    fs.writeFileSync(outputPath, video)
    return outputPath
  }

  /**
   * 通用执行
   */
  run(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const ff = spawn(this.ffmpegPath, args);
      if (this.log) {
        console.log("[ffmpeg]", args.join(" "));
      }
      ff.stderr.on("data", (data) => {
        if (this.log) console.log("[ffmpeg]", data.toString());
      });

      ff.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exit code ${code}`));
      });
    });
  }

  /**
   * 确保目录存在
   */
  private ensureDir(dir: string) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  private createTempFile(buffer: Buffer, tag: string): string {
    const fileName = `${tag}_${crypto.randomUUID()}.m4s`;
    const filePath = path.join(os.tmpdir(), fileName);

    fs.writeFileSync(filePath, buffer);

    return filePath;
  }
}