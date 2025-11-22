
import { supabase } from '@/lib/supabase';
import { PostgrestResponse } from '@supabase/supabase-js';

export interface User {
  id: string;
  email: string | undefined;
  level: number;
  commission_rate: number;
  // Add other user properties as needed
}

export const getUsers = async (): Promise<User[]> => {
  const { data, error }: PostgrestResponse<User> = await supabase.from('profiles').select('*');
  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }
  return data || [];
};

export const updateUserLevel = async (userId: string, level: number): Promise<void> => {
  const { error } = await supabase.from('profiles').update({ level }).eq('id', userId);
  if (error) {
    console.error('Error updating user level:', error);
  }
};

export const updateUserCommissionRate = async (userId: string, commissionRate: number): Promise<void> => {
  const { error } = await supabase.from('profiles').update({ commission_rate: commissionRate }).eq('id', userId);
  if (error) {
	  console.error('Error updating user commission rate:', error);
	  }
	};
	
	/**
	 * 获取用户的邀请统计信息
	 * @param userId 用户ID
	 * @returns 邀请统计对象
	 */
	export const getUserReferralStats = async (userId: string): Promise<{ level1Count: number, level2Count: number }> => {
	  // 假设一级邀请人通过 referrer_id 字段关联
	  const { count: level1Count, error: error1 } = await supabase
	    .from('profiles')
	    .select('*', { count: 'exact', head: true })
	    .eq('referrer_id', userId);
	
	  if (error1) {
	    console.error('Error fetching level 1 referrals:', error1);
	    throw error1;
	  }
	
	  // 假设二级邀请人通过一级邀请人的 referrer_id 关联
	  // 这是一个简化的实现，实际可能需要更复杂的 JOIN 或 RPC
	  // 这里我们假设有一个 RPC 来获取二级邀请人数量
	  const { data: level2Data, error: error2 } = await supabase.rpc('get_level_2_referral_count', { p_referrer_id: userId });
	
	  if (error2) {
	    console.error('Error fetching level 2 referrals:', error2);
	    // 暂时返回 0，避免阻塞
	    return { level1Count: level1Count || 0, level2Count: 0 };
	  }
	
	  return {
	    level1Count: level1Count || 0,
	    level2Count: level2Data as number || 0,
	  };
	};
	
	/**
	 * 获取用户的累计佣金
	 * @param userId 用户ID
	 * @returns 累计佣金金额
	 */
	export const getUserTotalCommission = async (userId: string): Promise<number> => {
	  // 假设存在一个名为 'commissions' 的表，存储佣金记录
	  const { data, error } = await supabase
	    .from('commissions')
	    .select('amount')
	    .eq('user_id', userId);
	
	  if (error) {
	    console.error('Error fetching total commission:', error);
	    throw error;
	  }
	
	  const totalCommission = data.reduce((sum, commission) => sum + commission.amount, 0);
	  return totalCommission;
	};

