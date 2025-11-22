import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useSupabase } from '@/contexts/SupabaseContext';
import { Tables } from '@/types/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';
import { updateUserCommissionRate, getUserReferralStats, getUserTotalCommission } from '@/services/UserService';

type UserProfile = Tables<'profiles'> & {
  invited_by_user?: Tables<'profiles'>;
};

export const UserDetailsPage: React.FC = () => {
  const { supabase } = useSupabase();
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [commissionRate, setCommissionRate] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [referralStats, setReferralStats] = useState<{ level1Count: number, level2Count: number } | null>(null);
  const [totalCommission, setTotalCommission] = useState<number | null>(null);

  const fetchUser = useCallback(async () => {
    if (!id) {return;}
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, invited_by_user:referrer_id(*)')
        .eq('id', id)
        .single();

      if (error) {throw error;}

      setUser(data as UserProfile);
      setCommissionRate(data.commission_rate || 0);

      // 获取邀请统计和累计佣金
      const stats = await getUserReferralStats(id);
      setReferralStats(stats);

      const commission = await getUserTotalCommission(id);
      setTotalCommission(commission);

    } catch (error) {
      toast.error(`加载用户详情失败: ${(error as Error).message}`);
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  }, [id, supabase]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleSaveCommissionRate = async () => {
    if (!id) {return;}
    setIsSaving(true);
    try {
      await updateUserCommissionRate(id, commissionRate);
      toast.success('佣金比例保存成功!');
      // 刷新用户数据以确保一致性
      await fetchUser();
    } catch (error) {
      toast.error(`保存失败: ${(error as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-10">加载中...</div>;
  }

  if (!user) {
    return <div className="text-center py-10 text-red-500">用户未找到</div>;
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>用户详情: {user.username || user.first_name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>用户 ID</Label>
            <Input value={user.id} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Telegram ID</Label>
            <Input value={user.telegram_id || 'N/A'} readOnly />
          </div>
          <div className="space-y-2">
            <Label>用户名</Label>
            <Input value={user.username || 'N/A'} readOnly />
          </div>
          <div className="space-y-2">
            <Label>First Name</Label>
            <Input value={user.first_name || 'N/A'} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Last Name</Label>
            <Input value={user.last_name || 'N/A'} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Level</Label>
            <Input value={user.level?.toString() || 'N/A'} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Referrer ID</Label>
            <Input value={user.referrer_id || '无'} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Referral Code</Label>
            <Input value={user.referral_code || 'N/A'} readOnly />
          </div>
          <div className="space-y-2">
            <Label>注册时间</Label>
            <Input value={formatDateTime(user.created_at)} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Telegram Username</Label>
            <Input value={user.telegram_username || 'N/A'} readOnly />
          </div>
        </div>
        
        {/* 假设这里可以添加编辑用户状态和 KYC 等级的表单 */}
        <div className="pt-4 border-t">
          <h3 className="text-xl font-semibold mb-4">返利设置 (Rebate)</h3>
          <div className="flex space-x-4 items-end">
            <div className="space-y-2 flex-1">
              <Label htmlFor="commission_rate">佣金比例 (%)</Label>
	              <Input
	                id="commission_rate"
	                type="number"
	                step="0.01"
	                value={commissionRate}
	                onChange={(e) => setCommissionRate(parseFloat(e.target.value))}
	              />
            </div>
	            <Button onClick={handleSaveCommissionRate} disabled={isSaving}>
	              {isSaving ? '保存中...' : '保存比例'}
	            </Button>
          </div>
        </div>
        
        <div className="pt-4 border-t">
          <h3 className="text-xl font-semibold mb-4">邀请层级 (Referral Structure)</h3>
          <div className="grid grid-cols-3 gap-4">
	            <div className="space-y-2">
	              <Label>一级邀请人数</Label>
	              <Input value={referralStats?.level1Count.toString() || '0'} readOnly />
	            </div>
	            <div className="space-y-2">
	              <Label>二级邀请人数</Label>
	              <Input value={referralStats?.level2Count.toString() || '0'} readOnly />
	            </div>
	            <div className="space-y-2">
	              <Label>累计佣金</Label>
	              <Input value={totalCommission !== null ? `${totalCommission.toFixed(2)} CNY` : 'N/A'} readOnly />
	            </div>
          </div>
	          <Button variant="outline" className="mt-4" onClick={() => toast.error('查看邀请列表功能待实现')}>
	            查看邀请列表
	          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
