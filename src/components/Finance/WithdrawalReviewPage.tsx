import React, { useState, useEffect, useCallback } from 'react';
// import { useNavigate } from 'react-router-dom';
import { useSupabase } from '@/contexts/SupabaseContext';
import { Tables, Enums } from '@/types/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';

type Withdrawal = Tables<'withdrawal_requests'>;
type WithdrawalStatus = Enums<'WithdrawalStatus'>;

const getStatusColor = (status: WithdrawalStatus) => {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'APPROVED':
      return 'bg-green-100 text-green-800';
    case 'REJECTED':
      return 'bg-red-100 text-red-800';
    case 'COMPLETED':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const WithdrawalReviewPage: React.FC = () => {
  const { supabase } = useSupabase();
  // const navigate = useNavigate();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWithdrawals = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {throw error;}

      setWithdrawals(data || []);
    } catch (error: any) {
      toast.error(`加载提现列表失败: ${error.message}`);
      console.error('Error loading withdrawals:', error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  const handleReview = async (id: string, status: 'APPROVED' | 'REJECTED' | 'COMPLETED') => {
    if (!window.confirm(`确定要将这笔提现标记为 ${status} 吗？`)) {return;}

    try {
      const { error } = await supabase
        .from('withdrawal_requests')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {throw error;}

      toast.success(`提现状态已更新为 ${status}!`);
      fetchWithdrawals(); // 刷新列表
    } catch (error: any) {
      toast.error(`审核失败: ${error.message}`);
      console.error('Error reviewing withdrawal:', error);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold">提现审核</CardTitle>
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
                  <TableHead>收款信息</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.map((withdrawal) => (
                  <TableRow key={withdrawal.id}>
                    <TableCell className="font-medium">{withdrawal.id.substring(0, 8)}...</TableCell>
                    <TableCell>{withdrawal.user_id.substring(0, 8)}...</TableCell>
                    <TableCell>{withdrawal.amount} {withdrawal.currency}</TableCell>
                    <TableCell>
                      {withdrawal.withdrawal_method === 'BANK_TRANSFER' && (
                        <div className="text-sm">
                          <div>{withdrawal.bank_name}</div>
                          <div>{withdrawal.bank_account_number}</div>
                          <div>{withdrawal.bank_account_name}</div>
                        </div>
                      )}
                      {withdrawal.withdrawal_method === 'MOBILE_WALLET' && (
                        <div className="text-sm">
                          <div>{withdrawal.mobile_wallet_name}</div>
                          <div>{withdrawal.mobile_wallet_number}</div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(withdrawal.status)}`}>
                        {withdrawal.status}
                      </span>
                    </TableCell>
                    <TableCell>{formatDateTime(withdrawal.created_at)}</TableCell>
                    <TableCell className="flex space-x-2">
                      {withdrawal.status === 'PENDING' && (
                        <>
                          <Button size="sm" onClick={() => handleReview(withdrawal.id, 'APPROVED')}>
                            批准
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleReview(withdrawal.id, 'REJECTED')}>
                            拒绝
                          </Button>
                        </>
                      )}
                      {withdrawal.status === 'APPROVED' && (
                        <Button size="sm" onClick={() => handleReview(withdrawal.id, 'COMPLETED')}>
                          标记为已完成
                        </Button>
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
