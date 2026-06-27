import OneBot from "@/api/common/oneBot";
import { AgentTool, ToolManager } from "../type";



const oneBotToolArr: AgentTool[] = [
  {
    name: 'get_group_member_list',
    description: '获取群成员列表',
    parameters: {
      type: 'object',
      properties: {
        group_id: {
          type: 'string' as const,
          description: '群组号',
        }
      },
      required: ['group_id']
    },
    execute: OneBot?.['getGroupMemberList']
  }
]
const toolManager = ToolManager.getInstace()
oneBotToolArr.forEach(tool => toolManager.register(tool))










