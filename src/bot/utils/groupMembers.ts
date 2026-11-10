import { BeanFactory } from '@/core/bean';
import OneBot from '@/api/common/oneBot';
import type { GroupConfig } from '@/beans/group';
import type { OB11GroupMember } from '@/interface/onebot';
import { createLogger } from '@utils/logger';

// ============================================================================
// 加过的群与群成员（画布消息节点挑选 @ 对象用）
// ----------------------------------------------------------------------------
// 供前端级联选择器分两级取数：
//  - 一级：bot 加入过的群（OneBot get_group_list，含群名/备注与人数），一次拉全；
//  - 二级：展开某群时才拉它的成员，命中 group bean 的内存成员缓存（定时任务
//    「群成员同步」与上次展开预热）即直接返回，未命中时经 get_group_member_list
//    实时拉取并回写 bean，让规则引擎与后续请求共用同一份成员缓存。
// 群列表拉不到直接抛出（交给路由层回 500，前端提示后重试），避免把「Bot 未连接」
// 当成「没有群」静默处理；单群成员拉取失败则退回旧缓存并记 warn，不拖垮整次请求。
// ============================================================================

const logger = createLogger('GroupMembers');
const factory = BeanFactory.getInstance();

/** 成员节点：只保留挑选 @ 对象所需字段，QQ 号统一转字符串 */
export interface GroupMemberNode {
  userId: string;
  nickname: string;
  card?: string;
}

/** bot 加入过的群（级联一级节点，成员按需再拉） */
export interface JoinedGroupNode {
  groupId: string;
  groupName: string;
  /** 群人数（取不到时为 0，仅用于前端展示） */
  memberCount: number;
}

function toMemberNode(m: OB11GroupMember): GroupMemberNode {
  return { userId: String(m.user_id), nickname: m.nickname ?? '', card: m.card };
}

class GroupMemberService {
  /** bot 加入过的群列表（拉取失败即抛，由调用方感知） */
  async listJoinedGroups(): Promise<JoinedGroupNode[]> {
    const list = (await OneBot.getGroupList()) as
      | { group_id: string | number; group_name?: string; group_remark?: string; member_count?: number }[]
      | undefined;
    return (list || []).map((g) => ({
      groupId: String(g.group_id),
      groupName: g.group_remark || g.group_name || `群 ${g.group_id}`,
      memberCount: Number(g.member_count ?? 0),
    }));
  }

  /**
   * 指定群的成员列表（级联二级）。
   * @param refresh 为 true 时绕过内存缓存并向 OneBot 要求 no_cache 重新拉取
   */
  async listMembers(groupId: string, refresh = false): Promise<GroupMemberNode[]> {
    const cached = this.cachedMembers(groupId);
    if (cached.length && !refresh) return cached;
    try {
      const list =
        (await OneBot.getGroupMemberList({ group_id: groupId, no_cache: refresh ? 'true' : undefined })) || [];
      this.writeBack(groupId, list);
      return list.map(toMemberNode);
    } catch (err: any) {
      logger.warn(`拉取群 ${groupId} 成员失败: ${err?.message || err}`);
      return cached;
    }
  }

  /** bean 中该群的成员缓存（bean 未注册或群不在监听列表时为空数组） */
  private cachedMembers(groupId: string): GroupMemberNode[] {
    const entry = factory.getBeanValue<GroupConfig>('group')?.listen?.find((l) => l.group_id === groupId);
    return (entry?.members || []).map(toMemberNode);
  }

  /** 实时拉取结果回写 bean，让规则引擎与后续请求共用同一份成员缓存 */
  private writeBack(groupId: string, members: OB11GroupMember[]): void {
    const entry = factory.getBeanValue<GroupConfig>('group')?.listen?.find((l) => l.group_id === groupId);
    if (entry) entry.members = [...members];
  }
}

export const groupMemberService = new GroupMemberService();
export default GroupMemberService;
