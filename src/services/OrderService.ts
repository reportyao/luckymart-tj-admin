import { supabase } from '@/lib/supabase';
import { Tables } from '@/types/supabase';

type Order = Tables<'orders'>;

export const OrderService = {
  /**
   * 获取单个订单详情
   * @param orderId 订单ID
   * @returns 订单详情，包含关联的用户和夺宝信息
   */
  async getOrderDetails(orderId: string): Promise<Order | null> {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        user:user_id (username, first_name, telegram_id),
        lottery:lottery_id (title, period, image_url)
      `)
      .eq('id', orderId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching order details:', error);
      throw error;
    }
    return data;
  },

  /**
   * 更新订单状态和物流信息
   * @param orderId 订单ID
   * @param status 订单状态
   * @param trackingNumber 物流单号 (可选)
   */
  async updateOrderStatus(orderId: string, status: Tables<'orders'>['status'], trackingNumber?: string): Promise<void> {
    const updateData: any = { status, updated_at: new Date().toISOString() };
    if (trackingNumber !== undefined) {
      updateData.tracking_number = trackingNumber;
    }

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);

    if (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  },
};
