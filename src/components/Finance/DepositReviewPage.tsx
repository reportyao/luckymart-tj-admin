import React, { useState, useEffect, useCallback } from 'react';
// import { useNavigate } from 'react-router-dom';
import { useSupabase } from '@/contexts/SupabaseContext';
import { Tables, Enums } from '@/types/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';

type Deposit = Tables<'deposits'>;
type DepositStatus = Enums<'deposit_status'>;

const getStatusColor = (status: DepositStatus) => {
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

export const DepositReviewPage: React.FC = () => {
  const { supabase } = useSupabase();
  // const navigate = useNavigate();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDeposits = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('deposits')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {throw error;}

      setDeposits(data || []);
    } catch (error: any) {
      toast.error(`加载充值列表失败: ${error.message}`);
      console.error('Error loading deposits:', error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchDeposits();
  }, [fetchDeposits]);

  const handleReview = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    if (!window.confirm(`确定要${status === 'APPROVED' ? '批准' : '拒绝'}这笔充值吗？`)) {return;}

    try {
      const { error } = await supabase
        .from('deposits')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {throw error;}

      toast.success(`充值已${status === 'APPROVED' ? '批准' : '拒绝'}!`);
      fetchDeposits(); // 刷新列表
    } catch (error: any) {
      toast.error(`审核失败: ${error.message}`);
      console.error('Error reviewing deposit:', error);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold">充值审核</CardTitle>
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
                  <TableHead>金额</TableHead>
                  <TableHead>支付方式</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deposits.map((deposit) => (
                  <TableRow key={deposit.id}>
                    <TableCell className="font-medium">{deposit.id.substring(0, 8)}...</TableCell>
                    <TableCell>{deposit.user_id.substring(0, 8)}...</TableCell>
                    <TableCell>{deposit.amount} {deposit.currency}</TableCell>
                    <TableCell>{deposit.payment_method}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(deposit.status)}`}>
                        {deposit.status}
                      </span>
                    </TableCell>
                    <TableCell>{formatDateTime(deposit.created_at)}</TableCell>
                    <TableCell className="flex space-x-2">
                      {deposit.status === 'PENDING' && (
                        <>
                          <Button size="sm" onClick={() => handleReview(deposit.id, 'APPROVED')}>
                            批准
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleReview(deposit.id, 'REJECTED')}>
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
