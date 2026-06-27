import * as path from "path";
import * as fs from "fs";
import * as os from 'os';
import crypto from 'crypto';

export interface FileOutputOptions {
  baseDir?: string;
  log?: boolean;
}

export class FileTool {
  private static instance: FileTool | null = null;
  private baseDir: string;
  private log: boolean;

  private constructor(options?: FileOutputOptions) {
    // 与 FFmpegTool 一致：path.resolve(process.cwd(), process.env.outputDir)
    const cwdBase = options?.baseDir ?? process.env.outputDir ?? 'output';
    this.baseDir = path.resolve(process.cwd(), cwdBase);
    this.log = options?.log ?? false;
    this.ensureDir(this.baseDir);
  }

  public static getInstance(options?: FileOutputOptions): FileTool {
    if (!this.instance) {
      this.instance = new FileTool(options);
    }
    return this.instance;
  }

  // ==================== 路径 ====================

  /** 获取基础输出目录 */
  getBaseDir(): string {
    return this.baseDir;
  }

  /** 将传入片段拼接在 baseDir 下，返回完整路径 */
  resolve(...segments: string[]): string {
    return path.resolve(this.baseDir, ...segments);
  }

  // ==================== 目录 ====================

  /** 确保目录存在（不存在则递归创建） */
  ensureDir(dir: string) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // ==================== 状态 ====================

  /** 判断文件或目录是否存在 */
  exists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  /** 获取文件状态信息，不存在返回 null */
  stat(filePath: string): fs.Stats | null {
    try {
      return fs.statSync(filePath);
    } catch {
      return null;
    }
  }

  // ==================== 读写 ====================

  /** 读取文件为 Buffer */
  readFile(filePath: string): Buffer {
    return fs.readFileSync(filePath);
  }

  /** 读取文件为字符串 */
  readText(filePath: string, encoding: BufferEncoding = 'utf-8'): string {
    return fs.readFileSync(filePath, { encoding });
  }

  /** 写入文件（自动创建父级目录） */
  writeFile(filePath: string, data: string | Buffer) {
    this.ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, data);
    if (this.log) console.log(`[FileTool] write: ${filePath}`);
  }

  /** 将 buffer 输出到 baseDir 下（自动创建子目录） */
  outputFile(buffer: Buffer, fileName: string, subDir?: string): string {
    const dir = subDir ? path.join(this.baseDir, subDir) : this.baseDir;
    this.ensureDir(dir);
    const filePath = path.join(dir, fileName);
    fs.writeFileSync(filePath, buffer);
    if (this.log) console.log(`[FileTool] output: ${filePath}`);
    return filePath;
  }

  // ==================== 删除 ====================

  /** 删除文件，不存在的文件不抛错 */
  deleteFile(filePath: string): boolean {
    try {
      fs.unlinkSync(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // ==================== 复制 & 移动 ====================

  /** 复制文件（自动创建目标父级目录） */
  copyFile(src: string, dest: string) {
    this.ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
    if (this.log) console.log(`[FileTool] copy: ${src} -> ${dest}`);
  }

  /** 移动 / 重命名文件（自动创建目标父级目录） */
  moveFile(src: string, dest: string) {
    this.ensureDir(path.dirname(dest));
    fs.renameSync(src, dest);
    if (this.log) console.log(`[FileTool] move: ${src} -> ${dest}`);
  }

  // ==================== 临时文件 ====================

  /** 将 buffer 写入系统临时目录 */
  createTempFile(buffer: Buffer, tag: string, ext: string = '.tmp'): string {
    const fileName = `${tag}_${crypto.randomUUID()}${ext}`;
    const filePath = path.join(os.tmpdir(), fileName);
    fs.writeFileSync(filePath, buffer);
    if (this.log) console.log(`[FileTool] temp: ${filePath}`);
    return filePath;
  }

  // ==================== 列表 ====================

  /** 列出目录下所有文件名，可选正则过滤 */
  listFiles(dirPath: string, pattern?: RegExp): string[] {
    try {
      const files = fs.readdirSync(dirPath);
      return pattern ? files.filter(f => pattern.test(f)) : files;
    } catch {
      return [];
    }
  }
}
