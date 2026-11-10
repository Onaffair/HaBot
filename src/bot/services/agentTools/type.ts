import type { Session } from '@/core/session'
import type { MessageItem } from '@/interface/onebot'

export interface PropertySchema {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null';
  description?: string;          // 极其重要！告诉模型这个参数是干嘛的
  enum?: any[];                  // 枚举值限制
  items?: PropertySchema;        // 当 type 为 array 时，描述子项类型
  properties?: Record<string, PropertySchema>; // 当 type 为 object 时，描述内部字段
  required?: string[];           // 对象内部的必填字段
}
/**
 * 工具执行上下文：由调用方（对话循环）在 execute 时注入。
 * 让工具能感知当前会话并共享本轮构建产物，而不必依赖全局可变状态
 * （全局状态在多个会话并发触发时互相污染）。
 */
export interface AgentToolContext {
  /** 当前消息会话（取 group_id / user_id / message_id 等） */
  session: Session
  /** 本轮待发送消息草稿：消息构建工具追加，终止工具触发后由调用方统一发送 */
  draft: MessageItem[]
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, PropertySchema>;
    required?: string[];
  };
  /** 终结性工具：true 时调用方执行完该工具立即退出对话循环（如「结束并发送」） */
  terminal?: boolean;
  execute: (args: any, context?: AgentToolContext) => any | Promise<any>;
}
export class ToolManager {
  private static instacne: ToolManager;
  private map: Map<string, AgentTool>;
  private constructor() {
    this.map = new Map()
  }
  static getInstace() {
    if (!this.instacne) {
      this.instacne = new ToolManager()
    }
    return this.instacne
  }
  register(tool: AgentTool) {
    this.map.set(tool.name, tool)
  }
  get toolList() {
    return Array.from(this.map.values()).map(tool => ({
      type: 'function',
      function: {
        description: tool.description,
        name: tool.name,
        parameters: tool.parameters,
      },
    }));
  }
  getTool(name: string) {
    return this.map.get(name)
  }
}




