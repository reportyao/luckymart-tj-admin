'''
import { supabase } from './supabaseClient';
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
'''
