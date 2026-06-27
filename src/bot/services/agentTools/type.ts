export interface PropertySchema {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null';
  description?: string;          // 极其重要！告诉模型这个参数是干嘛的
  enum?: any[];                  // 枚举值限制
  items?: PropertySchema;        // 当 type 为 array 时，描述子项类型
  properties?: Record<string, PropertySchema>; // 当 type 为 object 时，描述内部字段
  required?: string[];           // 对象内部的必填字段
}
export interface AgentTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, PropertySchema>;
    required?: string[];
  };
  execute: (args: any) => any | Promise<any>;
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




