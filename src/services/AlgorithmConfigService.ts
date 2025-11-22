import { supabase } from '@/lib/supabase';
import { Tables } from '@/types/supabase';

type AlgorithmConfig = Tables<'algorithm_config'>;

export const AlgorithmConfigService = {
  // 获取当前配置 (假设只有一条记录，ID 为 1)
  async getConfig(): Promise<AlgorithmConfig | null> {
    const { data, error } = await supabase
      .from('algorithm_config')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116: 没有找到记录
      console.error('Error fetching algorithm config:', error);
      throw error;
    }
    return data;
  },

  // 保存或更新配置 (简化处理，直接更新 ID 为 1 的记录)
  async saveConfig(seed: string): Promise<AlgorithmConfig> {
    const existingConfig = await this.getConfig();

    if (existingConfig) {
      const { data, error } = await supabase
        .from('algorithm_config')
        .update({ seed, updated_at: new Date().toISOString() })
        .eq('id', existingConfig.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating algorithm config:', error);
        throw error;
      }
      return data;
    } else {
      // 如果不存在，则创建一条新记录 (假设 ID 自动生成)
      const { data, error } = await supabase
        .from('algorithm_config')
        .insert({ seed, algorithm_name: 'SHA256_TIMESTAMP_MOD' })
        .select()
        .single();

      if (error) {
        console.error('Error creating algorithm config:', error);
        throw error;
      }
      return data;
    }
  },

  // 测试算法 (调用 Supabase RPC)
  async testAlgorithm(seed: string): Promise<{ result: string }> {
    // 假设存在一个名为 'test_lottery_algorithm' 的 Supabase RPC
    const { data, error } = await supabase.rpc('test_lottery_algorithm', { p_seed: seed });

    if (error) {
      console.error('Error testing algorithm:', error);
      throw error;
    }
    return { result: data as string };
  },
};
