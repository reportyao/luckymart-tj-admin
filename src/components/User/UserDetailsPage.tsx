import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useSupabase } from '../../contexts/SupabaseContext';
import { Tables } from '../../types/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { formatDateTime } from '../../lib/utils';
import toast from 'react-hot-toast';

type UserProfile = Tables<'profiles'>;

export const UserDetailsPage: React.FC = () => {
  const { supabase } = useSupabase();
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setUser(data);
    } catch (error: any) {
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
        <CardTitle>用户详情: {user.telegram_username || user.first_name}</CardTitle>
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
            <Label>姓名</Label>
            <Input value={`${user.first_name} ${user.last_name || ''}`} readOnly />
          </div>
          <div className="space-y-2">
            <Label>状态</Label>
            <Input value={user.status} readOnly className={user.status === 'ACTIVE' ? 'text-green-600' : 'text-red-600'} />
          </div>
          <div className="space-y-2">
            <Label>KYC 等级</Label>
            <Input value={user.kyc_level} readOnly />
          </div>
          <div className="space-y-2">
            <Label>邀请码</Label>
            <Input value={user.referral_code} readOnly />
          </div>
          <div className="space-y-2">
            <Label>注册时间</Label>
            <Input value={formatDateTime(user.created_at)} readOnly />
          </div>
        </div>
        
        {/* 假设这里可以添加编辑用户状态和 KYC 等级的表单 */}
        <div className="pt-4 border-t">
          <h3 className="text-xl font-semibold mb-4">操作</h3>
          <div className="flex space-x-4">
            <Button variant="destructive" onClick={() => toast.error('功能未实现')}>
              禁用用户
            </Button>
            <Button variant="outline" onClick={() => toast.error('功能未实现')}>
              提升 KYC 等级
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
