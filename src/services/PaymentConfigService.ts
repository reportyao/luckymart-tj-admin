import { supabase } from '../lib/supabase'
import { Database } from '../../database.types'

type PaymentConfig = Database['public']['Tables']['payment_config']['Row']
type PaymentConfigInsert = Database['public']['Tables']['payment_config']['Insert']
type PaymentConfigUpdate = Database['public']['Tables']['payment_config']['Update']

export class PaymentConfigService {
  private static readonly TABLE_NAME = 'payment_config'

  /**
   * 获取所有支付配置
   * @returns PaymentConfig[]
   */
  static async getAll(): Promise<PaymentConfig[]> {
    const { data, error } = await supabase
      .from(this.TABLE_NAME)
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching payment configs:', error)
      throw new Error('Failed to fetch payment configs')
    }
    return data as PaymentConfig[]
  }

  /**
   * 根据 ID 获取支付配置
   * @param id 配置 ID
   * @returns PaymentConfig | null
   */
  static async getById(id: string): Promise<PaymentConfig | null> {
    const { data, error } = await supabase
      .from(this.TABLE_NAME)
      .select('*')
      .eq('id', id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116: No rows found
      console.error(`Error fetching payment config with ID ${id}:`, error)
      throw new Error(`Failed to fetch payment config with ID ${id}`)
    }
    return data as PaymentConfig | null
  }

  /**
   * 创建新的支付配置
   * @param config 配置数据
   * @returns 新创建的配置
   */
  static async create(config: PaymentConfigInsert): Promise<PaymentConfig> {
    const { data, error } = await supabase
      .from(this.TABLE_NAME)
      .insert(config)
      .select()
      .single()

    if (error) {
      console.error('Error creating payment config:', error)
      throw new Error('Failed to create payment config')
    }
    return data as PaymentConfig
  }

  /**
   * 更新支付配置
   * @param id 配置 ID
   * @param updates 更新数据
   * @returns 更新后的配置
   */
  static async update(id: string, updates: PaymentConfigUpdate): Promise<PaymentConfig> {
    const { data, error } = await supabase
      .from(this.TABLE_NAME)
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error(`Error updating payment config with ID ${id}:`, error)
      throw new Error(`Failed to update payment config with ID ${id}`)
    }
    return data as PaymentConfig
  }

  /**
   * 删除支付配置
   * @param id 配置 ID
   */
  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.TABLE_NAME)
      .delete()
      .eq('id', id)

    if (error) {
      console.error(`Error deleting payment config with ID ${id}:`, error)
      throw new Error(`Failed to delete payment config with ID ${id}`)
    }
  }
}
