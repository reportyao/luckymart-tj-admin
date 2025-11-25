import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/contexts/SupabaseContext';
import toast from 'react-hot-toast';

interface User {
  id: string;
  telegram_id: string;
  telegram_username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  level: number;
  commission_rate: number;
}

const UserManagementPage: React.FC = () => {
  const { supabase } = useSupabase();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, telegram_id, telegram_username, first_name, last_name, level, commission_rate')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast.error(`加载用户失败: ${error.message}`);
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLevelChange = async (userId: string, newLevel: number) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ level: newLevel })
        .eq('id', userId);

      if (error) throw error;
      toast.success('等级更新成功');
      fetchUsers();
    } catch (error: any) {
      toast.error(`更新失败: ${error.message}`);
    }
  };

  const handleCommissionRateChange = async (userId: string, newCommissionRate: number) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ commission_rate: newCommissionRate })
        .eq('id', userId);

      if (error) throw error;
      toast.success('返利率更新成功');
      fetchUsers();
    } catch (error: any) {
      toast.error(`更新失败: ${error.message}`);
    }
  };

  if (loading) {
    return <div className="p-6">加载中...</div>;
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6">用户管理</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Telegram ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                用户名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                姓名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                等级
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                返利率 (%)
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.telegram_id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.telegram_username || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.first_name || user.last_name ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    className="w-20 px-2 py-1 border border-gray-300 rounded"
                    defaultValue={user.level}
                    onBlur={(e) => handleLevelChange(user.id, parseInt(e.target.value, 10))}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    step="0.01"
                    className="w-24 px-2 py-1 border border-gray-300 rounded"
                    defaultValue={user.commission_rate}
                    onBlur={(e) => handleCommissionRateChange(user.id, parseFloat(e.target.value))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            暂无用户数据
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagementPage;
