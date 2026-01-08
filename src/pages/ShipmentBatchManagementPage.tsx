import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '@/contexts/SupabaseContext';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Plus, 
  Truck, 
  CheckCircle, 
  XCircle, 
  Eye,
  RefreshCw,
  Search,
  Calendar,
  MapPin
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDateTime } from '@/lib/utils';

interface ShipmentBatch {
  id: string;
  batch_no: string;
  china_tracking_no: string | null;
  tajikistan_tracking_no: string | null;
  status: 'IN_TRANSIT_CHINA' | 'IN_TRANSIT_TAJIKISTAN' | 'ARRIVED' | 'CANCELLED';
  shipped_at: string;
  estimated_arrival_date: string | null;
  arrived_at: string | null;
  total_orders: number;
  normal_orders: number;
  missing_orders: number;
  damaged_orders: number;
  admin_note: string | null;
  created_at: string;
  creator?: {
    username: string;
    email: string;
  };
  items?: BatchOrderItem[];
}

interface BatchOrderItem {
  id: string;
  order_type: string;
  order_id: string;
  product_name: string;
  product_name_i18n: Record<string, string>;
  product_sku: string | null;
  product_image: string | null;
  user_name: string | null;
  arrival_status: string;
  pickup_code: string | null;
  added_at: string;
}

const statusConfig = {
  IN_TRANSIT_CHINA: { label: '运输中（中国段）', color: 'bg-blue-100 text-blue-800', icon: Truck },
  IN_TRANSIT_TAJIKISTAN: { label: '运输中（塔国段）', color: 'bg-yellow-100 text-yellow-800', icon: Truck },
  ARRIVED: { label: '已到达', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  CANCELLED: { label: '已取消', color: 'bg-red-100 text-red-800', icon: XCircle },
};

export default function ShipmentBatchManagementPage() {
  const { supabase } = useSupabase();
  const { adminUser } = useAdminAuth();
  const navigate = useNavigate();

  const [batches, setBatches] = useState<ShipmentBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 创建批次弹窗
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    china_tracking_no: '',
    tajikistan_tracking_no: '',
    estimated_arrival_date: '',
    admin_note: '',
  });
  const [creating, setCreating] = useState(false);

  // 批次详情弹窗
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<ShipmentBatch | null>(null);
  const [batchItems, setBatchItems] = useState<BatchOrderItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // 更新状态弹窗
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [statusNote, setStatusNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchBatches = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      params.append('page', page.toString());
      params.append('page_size', '20');

      const { data, error } = await supabase.functions.invoke('get-batch-list', {
        body: null,
        method: 'GET',
      });

      // 由于Edge Function使用GET参数，这里直接查询数据库
      let query = supabase
        .from('shipment_batches')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (searchTerm) {
        query = query.ilike('batch_no', `%${searchTerm}%`);
      }

      const { data: batchData, error: queryError, count } = await query
        .range((page - 1) * 20, page * 20 - 1);

      if (queryError) throw queryError;

      setBatches(batchData || []);
      setTotalPages(Math.ceil((count || 0) / 20));
    } catch (error) {
      console.error('Failed to fetch batches:', error);
      toast.error('获取批次列表失败');
    } finally {
      setLoading(false);
    }
  }, [supabase, statusFilter, searchTerm, page]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const handleCreateBatch = async () => {
    if (!adminUser?.id) {
      toast.error('请先登录');
      return;
    }

    try {
      setCreating(true);

      const { data, error } = await supabase.functions.invoke('create-shipment-batch', {
        body: {
          china_tracking_no: createFormData.china_tracking_no || null,
          tajikistan_tracking_no: createFormData.tajikistan_tracking_no || null,
          estimated_arrival_date: createFormData.estimated_arrival_date || null,
          admin_note: createFormData.admin_note || null,
          admin_id: adminUser.id,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast.success(data.message || '批次创建成功');
      setShowCreateModal(false);
      setCreateFormData({
        china_tracking_no: '',
        tajikistan_tracking_no: '',
        estimated_arrival_date: '',
        admin_note: '',
      });
      fetchBatches();
    } catch (error: any) {
      console.error('Failed to create batch:', error);
      toast.error(error.message || '创建批次失败');
    } finally {
      setCreating(false);
    }
  };

  const handleViewDetail = async (batch: ShipmentBatch) => {
    setSelectedBatch(batch);
    setShowDetailModal(true);
    setLoadingItems(true);

    try {
      const { data, error } = await supabase
        .from('batch_order_items')
        .select('*')
        .eq('batch_id', batch.id)
        .order('added_at', { ascending: false });

      if (error) throw error;
      setBatchItems(data || []);
    } catch (error) {
      console.error('Failed to fetch batch items:', error);
      toast.error('获取批次订单明细失败');
    } finally {
      setLoadingItems(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedBatch || !newStatus || !adminUser?.id) return;

    try {
      setUpdatingStatus(true);

      const { data, error } = await supabase.functions.invoke('update-batch-status', {
        body: {
          batch_id: selectedBatch.id,
          new_status: newStatus,
          admin_note: statusNote || undefined,
          admin_id: adminUser.id,
          send_notification: true,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast.success(data.message || '状态更新成功');
      setShowStatusModal(false);
      setNewStatus('');
      setStatusNote('');
      fetchBatches();
      
      // 如果详情弹窗打开，刷新详情
      if (showDetailModal && selectedBatch) {
        handleViewDetail({ ...selectedBatch, status: newStatus as any });
      }
    } catch (error: any) {
      console.error('Failed to update status:', error);
      toast.error(error.message || '更新状态失败');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getNextStatusOptions = (currentStatus: string) => {
    switch (currentStatus) {
      case 'IN_TRANSIT_CHINA':
        return [
          { value: 'IN_TRANSIT_TAJIKISTAN', label: '运输中（塔国段）' },
          { value: 'CANCELLED', label: '取消批次' },
        ];
      case 'IN_TRANSIT_TAJIKISTAN':
        return [
          { value: 'ARRIVED', label: '已到达（需确认到货）' },
          { value: 'CANCELLED', label: '取消批次' },
        ];
      default:
        return [];
    }
  };

  const renderStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return <Badge variant="outline">{status}</Badge>;
    
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* 页面标题和操作按钮 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">批次管理</h1>
          <p className="text-gray-500 mt-1">管理从中国到塔吉克斯坦的发货批次</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/order-shipment')}>
            <Package className="w-4 h-4 mr-2" />
            订单发货
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            创建批次
          </Button>
        </div>
      </div>

      {/* 筛选和搜索 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="搜索批次号..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="筛选状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="IN_TRANSIT_CHINA">运输中（中国段）</SelectItem>
                <SelectItem value="IN_TRANSIT_TAJIKISTAN">运输中（塔国段）</SelectItem>
                <SelectItem value="ARRIVED">已到达</SelectItem>
                <SelectItem value="CANCELLED">已取消</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchBatches}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 批次列表 */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-10">加载中...</div>
          ) : batches.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              暂无批次数据
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>批次号</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>物流单号</TableHead>
                  <TableHead>订单数</TableHead>
                  <TableHead>发货时间</TableHead>
                  <TableHead>预计到达</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-medium">{batch.batch_no}</TableCell>
                    <TableCell>{renderStatusBadge(batch.status)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {batch.china_tracking_no && (
                          <div>🇨🇳 {batch.china_tracking_no}</div>
                        )}
                        {batch.tajikistan_tracking_no && (
                          <div>🇹🇯 {batch.tajikistan_tracking_no}</div>
                        )}
                        {!batch.china_tracking_no && !batch.tajikistan_tracking_no && (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-medium">{batch.total_orders}</span>
                        {batch.status === 'ARRIVED' && (
                          <div className="text-xs text-gray-500">
                            ✅{batch.normal_orders} ❌{batch.missing_orders} ⚠️{batch.damaged_orders}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatDateTime(batch.shipped_at)}</TableCell>
                    <TableCell>
                      {batch.estimated_arrival_date || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetail(batch)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {batch.status !== 'ARRIVED' && batch.status !== 'CANCELLED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedBatch(batch);
                              setShowStatusModal(true);
                            }}
                          >
                            更新状态
                          </Button>
                        )}
                        {batch.status === 'IN_TRANSIT_TAJIKISTAN' && (
                          <Button
                            size="sm"
                            onClick={() => navigate(`/batch-arrival-confirm/${batch.id}`)}
                          >
                            确认到货
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                上一页
              </Button>
              <span className="py-2 px-4">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                下一页
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 创建批次弹窗 */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建新批次</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>中国段物流单号</Label>
              <Input
                value={createFormData.china_tracking_no}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, china_tracking_no: e.target.value }))}
                placeholder="可选"
              />
            </div>
            <div>
              <Label>塔吉克斯坦段物流单号</Label>
              <Input
                value={createFormData.tajikistan_tracking_no}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, tajikistan_tracking_no: e.target.value }))}
                placeholder="可选"
              />
            </div>
            <div>
              <Label>预计到达日期</Label>
              <Input
                type="date"
                value={createFormData.estimated_arrival_date}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, estimated_arrival_date: e.target.value }))}
              />
            </div>
            <div>
              <Label>备注</Label>
              <Input
                value={createFormData.admin_note}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, admin_note: e.target.value }))}
                placeholder="可选"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              取消
            </Button>
            <Button onClick={handleCreateBatch} disabled={creating}>
              {creating ? '创建中...' : '创建批次'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批次详情弹窗 */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>批次详情 - {selectedBatch?.batch_no}</DialogTitle>
          </DialogHeader>
          {selectedBatch && (
            <div className="space-y-4">
              {/* 批次信息 */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-gray-500">状态：</span>
                  {renderStatusBadge(selectedBatch.status)}
                </div>
                <div>
                  <span className="text-gray-500">发货时间：</span>
                  {formatDateTime(selectedBatch.shipped_at)}
                </div>
                <div>
                  <span className="text-gray-500">中国段物流：</span>
                  {selectedBatch.china_tracking_no || '-'}
                </div>
                <div>
                  <span className="text-gray-500">塔国段物流：</span>
                  {selectedBatch.tajikistan_tracking_no || '-'}
                </div>
                <div>
                  <span className="text-gray-500">预计到达：</span>
                  {selectedBatch.estimated_arrival_date || '-'}
                </div>
                <div>
                  <span className="text-gray-500">实际到达：</span>
                  {selectedBatch.arrived_at ? formatDateTime(selectedBatch.arrived_at) : '-'}
                </div>
              </div>

              {/* 订单明细 */}
              <div>
                <h3 className="font-medium mb-2">订单明细 ({batchItems.length})</h3>
                {loadingItems ? (
                  <div className="text-center py-4">加载中...</div>
                ) : batchItems.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">暂无订单</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>商品</TableHead>
                        <TableHead>订单类型</TableHead>
                        <TableHead>用户</TableHead>
                        <TableHead>到货状态</TableHead>
                        <TableHead>提货码</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batchItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {item.product_image && (
                                <img
                                  src={item.product_image}
                                  alt=""
                                  className="w-10 h-10 rounded object-cover"
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
                          <TableCell>
                            {item.arrival_status === 'PENDING' && <Badge variant="outline">待确认</Badge>}
                            {item.arrival_status === 'NORMAL' && <Badge className="bg-green-100 text-green-800">正常</Badge>}
                            {item.arrival_status === 'MISSING' && <Badge className="bg-red-100 text-red-800">缺货</Badge>}
                            {item.arrival_status === 'DAMAGED' && <Badge className="bg-yellow-100 text-yellow-800">损坏</Badge>}
                          </TableCell>
                          <TableCell>
                            {item.pickup_code ? (
                              <span className="font-mono font-bold">{item.pickup_code}</span>
                            ) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 更新状态弹窗 */}
      <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>更新批次状态</DialogTitle>
          </DialogHeader>
          {selectedBatch && (
            <div className="space-y-4">
              <div>
                <Label>当前状态</Label>
                <div className="mt-1">{renderStatusBadge(selectedBatch.status)}</div>
              </div>
              <div>
                <Label>新状态</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择新状态" />
                  </SelectTrigger>
                  <SelectContent>
                    {getNextStatusOptions(selectedBatch.status).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>备注</Label>
                <Input
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="可选"
                />
              </div>
              {newStatus === 'ARRIVED' && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800">
                    ⚠️ 如需确认到货并核对订单，请使用"确认到货"功能
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusModal(false)}>
              取消
            </Button>
            <Button onClick={handleUpdateStatus} disabled={!newStatus || updatingStatus}>
              {updatingStatus ? '更新中...' : '确认更新'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
