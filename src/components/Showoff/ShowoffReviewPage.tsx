import React, { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import { Tables, Enums } from '../../types/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { formatDateTime } from '../../lib/utils';
import toast from 'react-hot-toast';

type Showoff = Tables<'showoffs'>;
type ShowoffStatus = Enums<'ShowoffStatus'>;

const getStatusColor = (status: ShowoffStatus) => {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'APPROVED':
      return 'bg-green-100 text-green-800';
    case 'REJECTED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const ShowoffReviewPage: React.FC = () => {
  const { supabase } = useSupabase();
  const [showoffs, setShowoffs] = useState<Showoff[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchShowoffs = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('showoffs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setShowoffs(data || []);
    } catch (error: any) {
      toast.error(`加载晒单列表失败: ${error.message}`);
      console.error('Error loading showoffs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchShowoffs();
  }, [fetchShowoffs]);

  const handleReview = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    if (!window.confirm(`确定要${status === 'APPROVED' ? '批准' : '拒绝'}这篇晒单吗？`)) return;

    try {
      const { error } = await supabase
        .from('showoffs')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast.success(`晒单已${status === 'APPROVED' ? '批准' : '拒绝'}!`);
      fetchShowoffs(); // 刷新列表
    } catch (error: any) {
      toast.error(`审核失败: ${error.message}`);
      console.error('Error reviewing showoff:', error);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold">晒单审核</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-10">加载中...</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>用户 ID</TableHead>
                  <TableHead>标题</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {showoffs.map((showoff) => (
                  <TableRow key={showoff.id}>
                    <TableCell className="font-medium">{showoff.id.substring(0, 8)}...</TableCell>
                    <TableCell>{showoff.user_id.substring(0, 8)}...</TableCell>
                    <TableCell>{showoff.title}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(showoff.status)}`}>
                        {showoff.status}
                      </span>
                    </TableCell>
                    <TableCell>{formatDateTime(showoff.created_at)}</TableCell>
                    <TableCell className="flex space-x-2">
                      {showoff.status === 'PENDING' && (
                        <>
                          <Button size="sm" onClick={() => handleReview(showoff.id, 'APPROVED')}>
                            批准
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleReview(showoff.id, 'REJECTED')}>
                            拒绝
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
