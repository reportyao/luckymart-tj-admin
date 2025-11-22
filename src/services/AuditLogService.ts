import { supabase } from '@/lib/supabase'; // 假设存在 supabase 客户端
import { TablesInsert } from '@/types/supabase';

// 使用 TablesInsert 获取 audit_logs 表的插入类型
type AuditLogInsert = TablesInsert<'audit_logs'>;

interface AuditLogParams {
  adminId: string;
  action: string;
  resource: string;
  resourceId: string;
  changes: any;
  ipAddress: string;
  userAgent: string;
}

export async function createAuditLog({
  adminId,
  action,
  resource,
  resourceId,
  changes,
  ipAddress,
  // userAgent,
}: AuditLogParams) {
  const log: AuditLogInsert = {
    user_id: adminId,
    action: action,
    target_table: resource,
    target_id: resourceId,
    details: changes,
    ip_address: ipAddress,
    // created_at 会自动生成
  };

  const { error } = await supabase
    .from('audit_logs')
    .insert(log);

  if (error) {
    console.error('Failed to create audit log:', error);
    // 审计日志失败不应该阻塞主业务流程，但需要记录
  }
}

// 示例：在删除用户时记录日志
/*
import { createAuditLog } from '@/services/AuditLogService';

async function deleteUser(userId: string, adminId: string, request: Request) {
  // ... 删除用户逻辑 ...

  await createAuditLog({
    adminId,
    action: 'DELETE',
    resource: 'user',
    resourceId: userId,
    changes: { before: user.data, after: null },
    ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
  });
}
*/
