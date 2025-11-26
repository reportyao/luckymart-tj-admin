import React, { useState, useEffect, useCallback } from 'react';
// import { useNavigate } from 'react-router-dom';
import { useSupabase } from '@/contexts/SupabaseContext';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Tables, Enums } from '@/types/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';

type Deposit = Tables<'deposit_requests'>;
type DepositStatus = Enums<'DepositStatus'>;

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
  const { admin } = useAdminAuth();
  // const navigate = useNavigate();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDeposits = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('deposit_requests')
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

  const handleReview = async (depositRequest: Deposit, action: 'APPROVED' | 'REJECTED') => {
    console.log('handleReview called:', depositRequest.id, action);
    // if (!window.confirm(`确定要${action === 'APPROVED' ? '批准' : '拒绝'}这笔充值吗？`)) {
    //   return;
    // }

    if (!admin) {
      toast.error('未登录管理员账户');
      return;
    }

    try {
      // 1. 更新充值请求状态
      const { error: updateError } = await supabase
        .from('deposit_requests')
        .update({
          status: action,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', depositRequest.id);

      if (updateError) {
        throw updateError;
      }

      // 2. 如果批准，更新用户钱包余额
      if (action === 'APPROVED') {
        // 获取用户钱包
        const { data: wallet, error: walletError } = await supabase
          .from('wallets')
          .select('*')
          .eq('user_id', depositRequest.user_id)
          .eq('type', 'BALANCE')
          .eq('currency', depositRequest.currency)
          .single();

        if (walletError || !wallet) {
          throw new Error('未找到用户钱包');
        }

        const newBalance = parseFloat(wallet.balance) + parseFloat(depositRequest.amount);
        const newTotalDeposits = parseFloat(wallet.total_deposits) + parseFloat(depositRequest.amount);

        // 更新钱包余额
        const { error: updateWalletError } = await supabase
          .from('wallets')
          .update({
            balance: newBalance,
            total_deposits: newTotalDeposits,
            updated_at: new Date().toISOString(),
          })
          .eq('id', wallet.id);

        if (updateWalletError) {
          throw new Error('更新钱包余额失败');
        }

        // 3. 创建交易记录
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            user_id: depositRequest.user_id,
            type: 'deposit',
            amount: depositRequest.amount,
            currency: depositRequest.currency,
            status: 'completed',
            related_id: depositRequest.id,
            related_type: 'deposit_request',
            balance_before: wallet.balance,
            balance_after: newBalance,
            notes: `充值审核通过 - 订单号: ${depositRequest.order_number}`,
          });

        if (transactionError) {
          console.error('创建交易记录失败:', transactionError);
        }

        // 4. 尝试发送通知
        try {
          await supabase.from('notifications').insert({
            user_id: depositRequest.user_id,
            type: 'PAYMENT_SUCCESS',
            title: '充值成功',
            content: `您的充值申请已审核通过,金额${depositRequest.amount} ${depositRequest.currency}已到账`,
            related_id: depositRequest.id,
            related_type: 'DEPOSIT_REQUEST',
          });
        } catch (e) {
          console.log('发送通知失败，跳过');
        }
      } else {
        // 拒绝时发送通知
        try {
          await supabase.from('notifications').insert({
            user_id: depositRequest.user_id,
            type: 'PAYMENT_FAILED',
            title: '充值失败',
            content: `您的充值申请已被拒绝`,
            related_id: depositRequest.id,
            related_type: 'DEPOSIT_REQUEST',
          });
        } catch (e) {
          console.log('发送通知失败，跳过');
        }
      }

      // 5. 记录审计日志
      try {
        await supabase.from('admin_audit_logs').insert({
          admin_id: admin.id,
          action: action === 'APPROVED' ? 'approve_deposit' : 'reject_deposit',
          details: {
            deposit_request_id: depositRequest.id,
            amount: depositRequest.amount,
            currency: depositRequest.currency,
            user_id: depositRequest.user_id,
          },
        });
      } catch (e) {
        console.log('记录审计日志失败，跳过');
      }

      toast.success(`充值已${action === 'APPROVED' ? '批准' : '拒绝'}!`);
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
                          <Button size="sm" onClick={() => handleReview(deposit, 'APPROVED')}>
                            批准
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleReview(deposit, 'REJECTED')}>
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
