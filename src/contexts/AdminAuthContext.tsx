import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSupabase } from './SupabaseContext';
import { sha256 } from '../utils/sha256';

interface AdminUser {
  id: string;
  username: string;
  display_name: string | null;
  role: string;
  permissions: string[];
}

interface AdminAuthContextType {
  admin: AdminUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (pagePath: string) => boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const { supabase } = useSupabase();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  // 从localStorage恢复登录状态
  useEffect(() => {
    const storedAdmin = localStorage.getItem('admin_user');
    if (storedAdmin) {
      try {
        const adminData = JSON.parse(storedAdmin);
        loadAdminPermissions(adminData);
      } catch (error) {
        console.error('Failed to restore admin session:', error);
        localStorage.removeItem('admin_user');
      }
    }
    setLoading(false);
  }, []);

  // 加载管理员权限
  const loadAdminPermissions = async (adminData: any) => {
    try {
      const { data: permissions, error } = await supabase
        .from('role_permissions')
        .select('page_path')
        .eq('role', adminData.role)
        .eq('can_access', true);

      if (error) throw error;

      const permissionPaths = permissions?.map(p => p.page_path) || [];
      
      setAdmin({
        ...adminData,
        permissions: permissionPaths
      });
    } catch (error) {
      console.error('Failed to load permissions:', error);
      setAdmin({
        ...adminData,
        permissions: []
      });
    }
  };

  // 登录
  const login = async (username: string, password: string) => {
    try {
      // 暂时简化：只验证用户名，不验证密码
      // TODO: 后续配置HTTPS后启用完整的密码验证
      console.log('登录请求:', username);

      // 查询管理员账户（不验证密码）
      const { data: adminUser, error } = await supabase
        .from('admin_users')
        .select('id, username, display_name, role, status')
        .eq('username', username)
        .single();

      if (error || !adminUser) {
        console.error('用户不存在:', error);
        throw new Error('用户名不存在');
      }

      if (adminUser.status !== 'active') {
        throw new Error('账户已被禁用');
      }

      // 更新最后登录时间
      await supabase
        .from('admin_users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', adminUser.id);

      // 记录登录日志
      await supabase
        .from('admin_audit_logs')
        .insert({
          admin_id: adminUser.id,
          action: 'login',
          details: { username }
        });

      // 保存到localStorage
      localStorage.setItem('admin_user', JSON.stringify(adminUser));

      // 加载权限
      await loadAdminPermissions(adminUser);
    } catch (error: any) {
      throw new Error(error.message || '登录失败');
    }
  };

  // 登出
  const logout = () => {
    if (admin) {
      // 记录登出日志
      supabase
        .from('admin_audit_logs')
        .insert({
          admin_id: admin.id,
          action: 'logout'
        });
    }

    localStorage.removeItem('admin_user');
    setAdmin(null);
  };

  // 检查权限
  const hasPermission = (pagePath: string): boolean => {
    if (!admin) return false;
    if (admin.role === 'super_admin') return true;
    return admin.permissions.includes(pagePath);
  };

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, logout, hasPermission }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
