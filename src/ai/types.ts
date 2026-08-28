import { AxiosRequestConfig } from "axios";

export interface BaseMessageContent {
  type: 'text' | 'image' | 'audio' | 'video';
  text?: string;
  url?: string;
}

export interface BaseMessage {
  role: 'system' | 'user' | 'assistant',
  content: BaseMessageContent[]
}

/** 每次请求的可选参数 obj：覆盖平台配置默认值，未传的项沿用各平台实现类成员变量默认值 */
export interface AIRequestOptions {
  model?: string;
  response_format?: {
    type: 'text' | 'json_object' | 'json_schema'
  };
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
  tools?: object;
  tool_choice?: string;
  /** 其他平台特定参数，透传到请求 body */
  [key: string]: any;
}

/** adapter 返回值：请求 headers 与 body */
export interface AdapterResult {
  headers: Record<string, string>;
  body: Record<string, any>;
}

export interface AIPlatform {
  name: string,
  url: string,
  secret: string,
  model: string,
  /** 平台内置默认 axios 请求配置（如 responseType、代理），可被每次调用的 axiosConfig 覆盖 */
  axiosConfig?: AxiosRequestConfig;
  /** BaseMessage[] 或字符串转换为平台请求体，返回 headers 与 body */
  adapter: (body: BaseMessage[] | string, options?: AIRequestOptions) => AdapterResult,
  /** 解析平台原始响应 */
  parser: (response: any) => any,
}
