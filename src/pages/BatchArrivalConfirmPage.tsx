import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSupabase } from '@/contexts/SupabaseContext';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MultiImageUpload } from '@/components/MultiImageUpload';
import { 
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package,
  Camera,
  Save
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDateTime } from '@/lib/utils';

interface ShipmentBatch {
  id: string;
  batch_no: string;
  china_tracking_no: string | null;
  tajikistan_tracking_no: string | null;
  status: string;
  shipped_at: string;
  estimated_arrival_date: string | null;
  total_orders: number;
  admin_note: string | null;
}

interface BatchOrderItem {
  id: string;
  order_type: string;
  order_id: string;
  product_name: string;
  product_name_i18n: Record<string, string>;
  product_sku: string | null;
  product_image: string | null;
  quantity: number;
  user_id: string;
  user_name: string | null;
  arrival_status: string;
  arrival_notes: string | null;
}

interface OrderArrivalStatus {
  order_item_id: string;
  arrival_status: 'NORMAL' | 'MISSING' | 'DAMAGED';
  arrival_notes?: string;
}

export default function BatchArrivalConfirmPage() {
  const { id: batchId } = useParams<{ id: string }>();
  const { supabase } = useSupabase();
  const { admin: adminUser } = useAdminAuth();
  const navigate = useNavigate();

  const [batch, setBatch] = useState<ShipmentBatch | null>(null);
  const [orderItems, setOrderItems] = useState<BatchOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  // 到货状态
  const [orderStatuses, setOrderStatuses] = useState<Record<string, OrderArrivalStatus>>({});
  const [arrivalPhotos, setArrivalPhotos] = useState<string[]>([]);
  const [arrivalNotes, setArrivalNotes] = useState('');
  const [sendNotification, setSendNotification] = useState(true);

  const fetchBatchData = useCallback(async () => {
    if (!batchId) {return;}

    try {
      setLoading(true);

      // 获取批次信息
      const { data: batchData, error: batchError } = await supabase
        .from('shipment_batches')
        .select('*')
        .eq('id', batchId)
        .single();

      if (batchError) {throw batchError;}
      
      if (batchData.status !== 'IN_TRANSIT_TAJIKISTAN') {
        toast.error('只能确认运输中（塔国段）的批次到货');
        navigate('/shipment-batches');
        return;
      }

      setBatch(batchData);

      // 获取批次订单明细
      const { data: itemsData, error: itemsError } = await supabase
        .from('batch_order_items')
        .select('*')
        .eq('batch_id', batchId)
        .order('added_at', { ascending: false });

      if (itemsError) {throw itemsError;}
      setOrderItems(itemsData || []);

      // 初始化所有订单状态为正常
      const initialStatuses: Record<string, OrderArrivalStatus> = {};
      (itemsData || []).forEach(item => {
        initialStatuses[item.id] = {
          order_item_id: item.id,
          arrival_status: 'NORMAL',
          arrival_notes: '',
        };
      });
      setOrderStatuses(initialStatuses);

    } catch (error) {
      console.error('Failed to fetch batch data:', error);
      toast.error('获取批次数据失败');
      navigate('/shipment-batches');
    } finally {
      setLoading(false);
    }
  }, [batchId, supabase, navigate]);

  useEffect(() => {
    fetchBatchData();
  }, [fetchBatchData]);

  const handleStatusChange = (itemId: string, status: 'NORMAL' | 'MISSING' | 'DAMAGED') => {
    setOrderStatuses(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        arrival_status: status,
      },
    }));
  };

  const handleNotesChange = (itemId: string, notes: string) => {
    setOrderStatuses(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        arrival_notes: notes,
      },
    }));
  };

  const handleSetAllNormal = () => {
    const newStatuses: Record<string, OrderArrivalStatus> = {};
    orderItems.forEach(item => {
      newStatuses[item.id] = {
        order_item_id: item.id,
        arrival_status: 'NORMAL',
        arrival_notes: orderStatuses[item.id]?.arrival_notes || '',
      };
    });
    setOrderStatuses(newStatuses);
  };

  const handleConfirmArrival = async () => {
    if (!batch || !adminUser?.id) {
      toast.error('请先登录');
      return;
    }

    // 检查是否所有订单都已设置状态
    const allStatusesSet = orderItems.every(item => orderStatuses[item.id]);
    if (!allStatusesSet) {
      toast.error('请为所有订单设置到货状态');
      return;
    }

    try {
      setConfirming(true);

      const { data, error } = await supabase.functions.invoke('confirm-batch-arrival', {
        body: {
          batch_id: batch.id,
          order_statuses: Object.values(orderStatuses),
          arrival_photos: arrivalPhotos,
          arrival_notes: arrivalNotes || undefined,
          admin_id: adminUser.id,
          send_notification: sendNotification,
        },
      });

      if (error) {throw error;}
      if (!data.success) {throw new Error(data.error);}

      toast.success(data.message || '批次到货确认成功');
      navigate('/shipment-batches');
    } catch (error: any) {
      console.error('Failed to confirm arrival:', error);
      toast.error(error.message || '确认到货失败');
    } finally {
      setConfirming(false);
    }
  };

  const getStatusCounts = () => {
    const counts = { normal: 0, missing: 0, damaged: 0 };
    Object.values(orderStatuses).forEach(status => {
      if (status.arrival_status === 'NORMAL') {counts.normal++;}
      else if (status.arrival_status === 'MISSING') {counts.missing++;}
      else if (status.arrival_status === 'DAMAGED') {counts.damaged++;}
    });
    return counts;
  };

  const statusCounts = getStatusCounts();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">批次不存在</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/shipment-batches')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <div>
            <h1 className="text-2xl font-bold">确认批次到货</h1>
            <p className="text-gray-500 mt-1">批次号: {batch.batch_no}</p>
          </div>
        </div>
        <Button onClick={handleConfirmArrival} disabled={confirming}>
          <Save className="w-4 h-4 mr-2" />
          {confirming ? '确认中...' : '确认到货'}
        </Button>
      </div>

      {/* 批次信息 */}
      <Card>
        <CardHeader>
          <CardTitle>批次信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <span className="text-gray-500">发货时间：</span>
              <span className="font-medium">{formatDateTime(batch.shipped_at)}</span>
            </div>
            <div>
              <span className="text-gray-500">预计到达：</span>
              <span className="font-medium">{batch.estimated_arrival_date || '-'}</span>
            </div>
            <div>
              <span className="text-gray-500">中国段物流：</span>
              <span className="font-medium">{batch.china_tracking_no || '-'}</span>
            </div>
            <div>
              <span className="text-gray-500">塔国段物流：</span>
              <span className="font-medium">{batch.tajikistan_tracking_no || '-'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 到货统计 */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-gray-500" />
              <div>
                <div className="text-2xl font-bold">{orderItems.length}</div>
                <div className="text-gray-500 text-sm">总订单数</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-green-600">{statusCounts.normal}</div>
                <div className="text-gray-500 text-sm">正常到货</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <div>
                <div className="text-2xl font-bold text-red-600">{statusCounts.missing}</div>
                <div className="text-gray-500 text-sm">缺货</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold text-yellow-600">{statusCounts.damaged}</div>
                <div className="text-gray-500 text-sm">损坏</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 到货照片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            到货照片
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MultiImageUpload
            value={arrivalPhotos}
            onChange={setArrivalPhotos}
            maxImages={10}
          />
        </CardContent>
      </Card>

      {/* 订单核对 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>订单核对</CardTitle>
            <Button variant="outline" size="sm" onClick={handleSetAllNormal}>
              全部设为正常
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>商品</TableHead>
                <TableHead>订单类型</TableHead>
                <TableHead>用户</TableHead>
                <TableHead>数量</TableHead>
                <TableHead>到货状态</TableHead>
                <TableHead>备注</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {item.product_image && (
                        <img
                          src={item.product_image}
                          alt=""
                          className="w-12 h-12 rounded object-cover"
                        />
                      )}
                      <div>
                        <div className="font-medium">{item.product_name}</div>
                        {item.product_sku && (
                          <div className="text-xs text-gray-500">SKU: {item.product_sku}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {item.order_type === 'FULL_PURCHASE' && '全款购买'}
                      {item.order_type === 'LOTTERY_PRIZE' && '一元购物'}
                      {item.order_type === 'GROUP_BUY' && '拼团'}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.user_name || '-'}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>
                    <Select
                      value={orderStatuses[item.id]?.arrival_status || 'NORMAL'}
                      onValueChange={(value) => handleStatusChange(item.id, value as any)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NORMAL">
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-green-500" />
                            正常
                          </span>
                        </SelectItem>
                        <SelectItem value="MISSING">
                          <span className="flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-red-500" />
                            缺货
                          </span>
                        </SelectItem>
                        <SelectItem value="DAMAGED">
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-yellow-500" />
                            损坏
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="备注"
                      value={orderStatuses[item.id]?.arrival_notes || ''}
                      onChange={(e) => handleNotesChange(item.id, e.target.value)}
                      className="w-40"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 整体备注 */}
      <Card>
        <CardHeader>
          <CardTitle>整体备注</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="输入到货备注..."
            value={arrivalNotes}
            onChange={(e) => setArrivalNotes(e.target.value)}
            rows={3}
          />
          <div className="mt-4 flex items-center gap-2">
            <input
              type="checkbox"
              id="sendNotification"
              checked={sendNotification}
              onChange={(e) => setSendNotification(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="sendNotification" className="cursor-pointer">
              发送到货通知给用户（包含提货码和自提点信息）
            </Label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
