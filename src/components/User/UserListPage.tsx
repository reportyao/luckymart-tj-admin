import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '@/contexts/SupabaseContext';
import { Tables } from '@/types/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';
import { EmptyState } from '../EmptyState';

type UserProfile = Tables<'profiles'>;

export const UserListPage: React.FC = () => {
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 10; // 每页显示 10 条
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      // 假设 users 表存储了用户的主要信息
      const { data, error, count } = await supabase
        .from('profiles')
        .select('*, count()', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * LIMIT, page * LIMIT - 1);

      if (error) {throw error;}

      setUsers(data || []);
      if (count !== null) {
        setTotalPages(Math.ceil(count / LIMIT));
        // 如果当前页码大于总页码，重定向到最后一页
        if (page > Math.ceil(count / LIMIT) && count > 0) {
          setPage(Math.ceil(count / LIMIT));
        }
      }
    } catch (error) {
      toast.error(`加载用户列表失败: ${(error as Error).message}`);
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
        ) : users.length === 0 ? (
          <EmptyState title="暂无用户" message="当前没有用户数据，或搜索结果为空。" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
	                  <TableHead>ID</TableHead>
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
	                    <TableCell className="font-medium">{user.id}</TableCell>
	                    <TableCell>{user.username || 'N/A'}</TableCell>
	                    <TableCell>{user.first_name || 'N/A'}</TableCell>
	                    <TableCell>N/A</TableCell>
	                    <TableCell>{user.level} / {user.commission_rate || 0}%</TableCell>
	                    <TableCell>{formatDateTime(user.created_at)}</TableCell>
                    <TableCell className="flex space-x-2">
	                      <Button variant="outline" size="sm" onClick={() => navigate(`/users/${user.id}`)}>
                        详情
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-between items-center mt-4">
              <Button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                variant="outline"
              >
                上一页
              </Button>
              <span className="text-sm text-gray-600">
                第 {page} 页 / 共 {totalPages} 页
              </span>
              <Button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                variant="outline"
              >
                下一页
              </Button>
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
};
