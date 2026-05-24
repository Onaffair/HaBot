/**
 * 应用配置容器。
 * 初始为空 / 默认值，由 bootstrap.ts 调用 loadConfig() 从数据库填充。
 * 运行时由 initializer / scheduler 通过 updateConfig() 动态更新。
 */

interface Config {
  ws?: {
    url?: string;
    token?: string;
  };
  http?: {
    baseURL?: string;
    timeout?: number;
    token?: string;
  };
  group?: {
    listen?: Array<{
      group_id: string;
      members: any[];
    }>;
  };
  me?: string;
  resource?: {
    path?: string;
    folder?: Array<{
      name: string;
      path: string;
      type: string;
      children?: string[];
    }>;
  };
  ai?: any[];
  oss?: {
    region?: string;
    accessKeyId?: string;
    accessKeySecret?: string;
    bucket?: string;
  };
  database?: {
    url?: string;
  };
  BG?: string[];
}



const config: Config = {
  http: {
    timeout: 30000,
  },
};

/** 从数据库加载配置后调用，一次性填充 config 对象 */
export function loadConfig(data: Record<string, any>) {
  Object.assign(config, data);
}

/** 运行时局部更新配置（initializer / scheduler 使用） */
export function updateConfig(data: Record<string, any>) {
  Object.assign(config, data);
}

export default config;
