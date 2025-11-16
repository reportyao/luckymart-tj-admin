import React, { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import { Tables, Enums } from '../../types/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { formatDateTime } from '../../lib/utils';
import toast from 'react-hot-toast';

type Order = Tables<'orders'>;
type OrderStatus = Enums<'OrderStatus'>;

const getStatusColor = (status: OrderStatus) => {
  switch (status) {
    case 'PAID':
      return 'bg-yellow-100 text-yellow-800';
    case 'SHIPPED':
      return 'bg-blue-100 text-blue-800';
    case 'DELIVERED':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const ShippingManagementPage: React.FC = () => {
  const { supabase } = useSupabase();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      // 仅查询需要处理发货的订单（例如：已支付但未发货）
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['PAID', 'SHIPPED'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrders(data || []);
    } catch (error: any) {
      toast.error(`加载发货列表失败: ${error.message}`);
      console.error('Error loading shipping orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleShip = async (orderId: string) => {
    const trackingNumber = prompt('请输入快递单号:');
    if (!trackingNumber) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'SHIPPED', 
          tracking_number: trackingNumber,
          updated_at: new Date().toISOString() 
        })
        .eq('id', orderId);

      if (error) throw error;

      toast.success('订单已标记为已发货!');
      fetchOrders(); // 刷新列表
    } catch (error: any) {
      toast.error(`发货失败: ${error.message}`);
      console.error('Error shipping order:', error);
    }
  };

  const handleDeliver = async (orderId: string) => {
    if (!window.confirm('确定要将此订单标记为已送达吗？')) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'DELIVERED',
          updated_at: new Date().toISOString() 
        })
        .eq('id', orderId);

      if (error) throw error;

      toast.success('订单已标记为已送达!');
      fetchOrders(); // 刷新列表
    } catch (error: any) {
      toast.error(`标记失败: ${error.message}`);
      console.error('Error delivering order:', error);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold">发货管理</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-10">加载中...</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>订单 ID</TableHead>
                  <TableHead>用户 ID</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>追踪号</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.id.substring(0, 8)}...</TableCell>
                    <TableCell>{order.user_id.substring(0, 8)}...</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </TableCell>
                    <TableCell>{order.tracking_number || 'N/A'}</TableCell>
                    <TableCell>{formatDateTime(order.created_at)}</TableCell>
                    <TableCell className="flex space-x-2">
                      {order.status === 'PAID' && (
                        <Button size="sm" onClick={() => handleShip(order.id)}>
                          发货
                        </Button>
                      )}
                      {order.status === 'SHIPPED' && (
                        <Button size="sm" variant="outline" onClick={() => handleDeliver(order.id)}>
                          标记为已送达
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
