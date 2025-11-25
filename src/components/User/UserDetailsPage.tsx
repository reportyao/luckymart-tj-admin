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

type UserProfile = Tables<'users'> & {
  invited_by_user?: Tables<'users'>;
};

export const UserDetailsPage: React.FC = () => {
  const { supabase } = useSupabase();
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    if (!id) {return;}
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*, invited_by_user:invited_by(*)')
        .eq('id', id)
        .single();

      if (error) {throw error;}

      setUser(data as UserProfile);
    } catch (error) {
      toast.error(`加载用户详情失败: ${error.message}`);
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  }, [id, supabase]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  if (isLoading) {
    return <div className="text-center py-10">加载中...</div>;
  }

  if (!user) {
    return <div className="text-center py-10 text-red-500">用户未找到</div>;
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>用户详情: {user.telegram_username || user.display_name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>用户 ID</Label>
            <Input value={user.id} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Telegram ID</Label>
            <Input value={user.telegram_id} readOnly />
          </div>
          <div className="space-y-2">
            <Label>用户名</Label>
            <Input value={user.telegram_username || 'N/A'} readOnly />
          </div>
          <div className="space-y-2">
            <Label>显示名称</Label>
            <Input value={user.display_name || 'N/A'} readOnly />
          </div>
          <div className="space-y-2">
            <Label>余额 (TJS)</Label>
            <Input value={user.balance.toFixed(2)} readOnly />
          </div>
          <div className="space-y-2">
            <Label>夺宝币</Label>
            <Input value={user.lucky_coins.toFixed(2)} readOnly />
          </div>
          <div className="space-y-2">
            <Label>VIP 等级</Label>
            <Input value={user.vip_level} readOnly />
          </div>
          <div className="space-y-2">
            <Label>邀请人</Label>
            <Input value={user.invited_by_user?.telegram_username || '无'} readOnly />
          </div>
          <div className="space-y-2">
            <Label>邀请码</Label>
            <Input value={user.invite_code || 'N/A'} readOnly />
          </div>
          <div className="space-y-2">
            <Label>注册时间</Label>
            <Input value={formatDateTime(user.created_at)} readOnly />
          </div>
          <div className="space-y-2">
            <Label>最后登录时间</Label>
            <Input value={user.last_login_at ? formatDateTime(user.last_login_at) : 'N/A'} readOnly />
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
                value={user.commission_rate || 0}
	                onChange={() => {
	                  // 仅用于展示，实际修改需要一个单独的表单提交
	                }}
              />
            </div>
            <Button onClick={() => toast.error('功能未实现')}>
              保存比例
            </Button>
          </div>
        </div>
        
        <div className="pt-4 border-t">
          <h3 className="text-xl font-semibold mb-4">邀请层级 (Referral Structure)</h3>
          <div className="grid grid-cols-3 gap-4">
            <StatCard title="一级邀请人数" value="N/A" />
            <StatCard title="二级邀请人数" value="N/A" />
            <StatCard title="累计佣金" value="N/A" />
          </div>
          <Button variant="outline" className="mt-4" onClick={() => toast.error('功能未实现')}>
            查看邀请列表
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
