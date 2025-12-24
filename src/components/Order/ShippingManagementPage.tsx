import React, { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '@/contexts/SupabaseContext';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Shipping {
  id: string;
  prize_id: string;
  user_id: string;
  status: string;
  tracking_number: string | null;
  shipping_company: string | null;
  shipping_method: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  recipient_address: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'PENDING':
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
  const { admin } = useAdminAuth();
  const [shippings, setShippings] = useState<Shipping[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchShippings = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('shipping')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {throw error;}

      setShippings(data || []);
    } catch (error: any) {
      toast.error(`加载发货列表失败: ${error.message}`);
      console.error('Error loading shippings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchShippings();
  }, [fetchShippings]);

  const handleShip = async (shippingId: string) => {
    const trackingNumber = prompt('请输入快递单号:');
    if (!trackingNumber) {return;}

    const shippingCompany = prompt('请输入快递公司:') || '';

    try {
      // 调用 Edge Function 处理发货
      if (!admin) {
        throw new Error('未登录');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-update-shipping`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-id': admin.id,
          },
          body: JSON.stringify({
            shippingId: shippingId,
            status: 'SHIPPED',
            trackingNumber: trackingNumber,
            shippingCompany: shippingCompany,
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '发货失败');
      }

      toast.success('订单已标记为已发货!');
      fetchShippings(); // 刷新列表
    } catch (error: any) {
      toast.error(`发货失败: ${error.message}`);
      console.error('Error shipping order:', error);
    }
  };

  const handleDeliver = async (shippingId: string) => {
    if (!window.confirm('确定要将此订单标记为已送达吗？')) {return;}

    try {
      // 调用 Edge Function 处理送达
      if (!admin) {
        throw new Error('未登录');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-update-shipping`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-id': admin.id,
          },
          body: JSON.stringify({
            shippingId: shippingId,
            status: 'DELIVERED',
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '标记失败');
      }

      toast.success('订单已标记为已送达!');
      fetchShippings(); // 刷新列表
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
                  <TableHead>发货 ID</TableHead>
                  <TableHead>奖品 ID</TableHead>
                  <TableHead>用户 ID</TableHead>
                  <TableHead>收件人</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>快递单号</TableHead>
                  <TableHead>快递公司</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shippings.map((shipping) => (
                  <TableRow key={shipping.id}>
                    <TableCell className="font-medium">{shipping.id.substring(0, 8)}...</TableCell>
                    <TableCell>{shipping.prize_id.substring(0, 8)}...</TableCell>
                    <TableCell>{shipping.user_id.substring(0, 8)}...</TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <div>{shipping.recipient_name || '-'}</div>
                        <div>{shipping.recipient_phone || '-'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(shipping.status)}`}>
                        {shipping.status}
                      </span>
                    </TableCell>
                    <TableCell>{shipping.tracking_number || 'N/A'}</TableCell>
                    <TableCell>{shipping.shipping_company || 'N/A'}</TableCell>
                    <TableCell>{formatDateTime(shipping.created_at)}</TableCell>
                    <TableCell className="flex space-x-2">
                      {shipping.status === 'PENDING' && (
                        <Button size="sm" onClick={() => handleShip(shipping.id)}>
                          发货
                        </Button>
                      )}
                      {shipping.status === 'SHIPPED' && (
                        <Button size="sm" variant="outline" onClick={() => handleDeliver(shipping.id)}>
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
