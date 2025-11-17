import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '@/contexts/SupabaseContext';
import { Tables } from '@/types/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';\nimport { EmptyState } from '../EmptyState';

type UserProfile = Tables<'users'>;

export const UserListPage: React.FC = () => {
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);\n  const [page, setPage] = useState(1);\n  const [totalPages, setTotalPages] = useState(1);\n  const LIMIT = 10; // 每页显示 10 条
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      // 假设 users 表存储了用户的主要信息
      const { data, error, count } = await supabase
        .from('users')
        .select('*, count()', { count: 'exact' })
        .order('created_at', { ascending: false })\n        .range((page - 1) * LIMIT, page * LIMIT - 1);

      if (error) throw error;

      setUsers(data || []);\n      if (count !== null) {\n        setTotalPages(Math.ceil(count / LIMIT));\n        // 如果当前页码大于总页码，重定向到最后一页\n        if (page > Math.ceil(count / LIMIT) && count > 0) {\n          setPage(Math.ceil(count / LIMIT));\n        }\n      }
    } catch (error: any) {
      toast.error(`加载用户列表失败: ${error.message}`);
      console.error('Error loading users:', error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold">用户管理</CardTitle>
        {/* <Button onClick={() => navigate('/users/new')}>
          创建新用户 (通常不需要)
        </Button> */}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-10">加载中...</div>
        ) : users.length === 0 ? (\n          <EmptyState title="暂无用户" message="当前没有用户数据，或搜索结果为空。" />\n        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Telegram ID</TableHead>
                  <TableHead>用户名</TableHead>
                  <TableHead>显示名称</TableHead>
                  <TableHead>余额/夺宝币</TableHead>
                  <TableHead>VIP/返利(%)</TableHead>
                  <TableHead>注册时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.telegram_id}</TableCell>
                    <TableCell>{user.telegram_username || 'N/A'}</TableCell>
                    <TableCell>{user.display_name || 'N/A'}</TableCell>
                    <TableCell>{user.balance.toFixed(2)} / {user.lucky_coins.toFixed(2)}</TableCell>
                    <TableCell>{user.vip_level} / {user.commission_rate || 0}%</TableCell>
                    <TableCell>{formatDateTime(user.created_at)}</TableCell>
                    <TableCell className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/users/${user.id}`)}>
                        详情
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>\n            </Table>\n            <div className="flex justify-between items-center mt-4">\n              <Button \n                onClick={() => setPage(p => Math.max(1, p - 1))}\n                disabled={page === 1}\n                variant="outline"\n              >\n                上一页\n              </Button>\n              <span className="text-sm text-gray-600">\n                第 {page} 页 / 共 {totalPages} 页\n              </span>\n              <Button \n                onClick={() => setPage(p => Math.min(totalPages, p + 1))}\n                disabled={page === totalPages}\n                variant="outline"\n              >\n                下一页\n              </Button>\n            </div>\n          </div>\n        )}
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
