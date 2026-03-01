/**
 * PromoterSettlementPage.tsx
 * 地推缴款管理页面 - 管理后台
 *
 * 功能模块：
 * 1. 每日缴款状态概览 - 查看每个地推人员当日是否完成缴款
 * 2. 缴款确认操作 - 标记现金/转账，上传转账凭证
 * 3. 差异标记 - 充值总额与缴款金额不一致时高亮
 *
 * 数据库字段对照（promoter_settlements 表）：
 * - promoter_id: UUID (NOT promoter_user_id)
 * - settlement_date: DATE
 * - total_deposit_amount: NUMERIC (NOT deposit_total_amount)
 * - total_deposit_count: INTEGER (NOT deposit_count)
 * - settlement_amount: NUMERIC
 * - settlement_method: TEXT ('cash' | 'transfer')
 * - proof_image_url: TEXT (NOT settlement_proof_images / proof_images)
 * - settlement_status: TEXT ('pending' | 'settled' | 'discrepancy')
 * - confirmed_by: TEXT
 * - confirmed_at: TIMESTAMPTZ
 * - note: TEXT
 *
 * 设计原则：
 * - 与现有 admin 页面风格保持一致
 * - 使用现有 UI 组件
 * - 字段名严格与数据库一致，避免前后端不匹配
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { toast } from 'react-hot-toast';
import {
  RefreshCw,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
  Banknote,
  CreditCard,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '../lib/utils';
import ImageUpload from '../components/ImageUpload';

// ============================================================
// 类型定义 - 字段名严格与数据库表 promoter_settlements 一致
// ============================================================

/** 缴款记录（对应 promoter_settlements 表） */
interface PromoterSettlement {
  id: string;
  promoter_id: string;                // 数据库字段名：promoter_id
  settlement_date: string;
  total_deposit_amount: number;       // 数据库字段名：total_deposit_amount
  total_deposit_count: number;        // 数据库字段名：total_deposit_count
  settlement_amount: number | null;
  settlement_method: string | null;   // 'cash' | 'transfer'
  proof_image_url: string | null;     // 数据库字段名：proof_image_url（单个 URL，非数组）
  settlement_status: string;          // 'pending' | 'settled' | 'discrepancy'
  confirmed_by: string | null;
  confirmed_at: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  // 前端 Join 后的显示字段
  promoter_name?: string;
  promoter_telegram_id?: string;
}

/** 缴款表单状态 */
interface SettlementForm {
  amount: string;
  method: 'cash' | 'transfer';
  proof_image_url: string;   // 单个 URL，与数据库字段一致
  note: string;
}

// ============================================================
// 状态标签映射
// ============================================================

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: '待缴款',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    icon: <Clock className="w-3 h-3" />,
  },
  settled: {
    label: '已缴款',
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: <CheckCircle className="w-3 h-3" />,
  },
  discrepancy: {
    label: '金额差异',
    color: 'bg-red-100 text-red-700 border-red-200',
    icon: <AlertTriangle className="w-3 h-3" />,
  },
};

// ============================================================
// 主组件
// ============================================================

export default function PromoterSettlementPage() {
  const { supabase } = useSupabase();
  const { admin } = useAdminAuth();

  // 数据状态
  const [settlements, setSettlements] = useState<PromoterSettlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // 缴款操作状态
  const [settlingItem, setSettlingItem] = useState<PromoterSettlement | null>(null);
  const [settlementForm, setSettlementForm] = useState<SettlementForm>({
    amount: '',
    method: 'cash',
    proof_image_url: '',
    note: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // 凭证查看
  const [viewingProofUrl, setViewingProofUrl] = useState<string | null>(null);

  // 统计
  const [stats, setStats] = useState({
    totalRecords: 0,
    pendingCount: 0,
    settledCount: 0,
    discrepancyCount: 0,
    totalDepositAmount: 0,
    totalSettledAmount: 0,
  });

  // ============================================================
  // 数据获取
  // ============================================================

  /** 获取缴款记录 - 使用正确的数据库字段名 */
  const fetchSettlements = useCallback(async () => {
    setLoading(true);
    try {
      // 查询 promoter_settlements 表
      // 字段名：promoter_id, total_deposit_amount, total_deposit_count, settlement_amount,
      //         settlement_method, proof_image_url, settlement_status, confirmed_by, confirmed_at, note
      const { data, error } = await supabase
        .from('promoter_settlements')
        .select('*')
        .eq('settlement_date', selectedDate)
        .order('total_deposit_amount', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setSettlements([]);
        setStats({
          totalRecords: 0,
          pendingCount: 0,
          settledCount: 0,
          discrepancyCount: 0,
          totalDepositAmount: 0,
          totalSettledAmount: 0,
        });
        setLoading(false);
        return;
      }

      // 获取地推人员用户名
      const promoterIds = [...new Set(data.map(s => s.promoter_id))];
      const { data: users } = await supabase
        .from('users')
        .select('id, first_name, last_name, telegram_id')
        .in('id', promoterIds);

      const userMap = new Map((users || []).map(u => [u.id, u]));

      const enriched: PromoterSettlement[] = data.map(s => {
        const user = userMap.get(s.promoter_id);
        return {
          ...s,
          promoter_name: user
            ? [user.first_name, user.last_name].filter(Boolean).join(' ') || `TG:${user.telegram_id}`
            : s.promoter_id.slice(0, 8),
          promoter_telegram_id: user?.telegram_id,
        };
      });

      setSettlements(enriched);

      // 计算统计
      let pendingCount = 0, settledCount = 0, discrepancyCount = 0;
      let totalDepositAmount = 0, totalSettledAmount = 0;
      enriched.forEach(s => {
        // 使用正确的字段名 total_deposit_amount
        totalDepositAmount += s.total_deposit_amount || 0;
        totalSettledAmount += s.settlement_amount || 0;
        if (s.settlement_status === 'pending') pendingCount++;
        else if (s.settlement_status === 'settled') settledCount++;
        else if (s.settlement_status === 'discrepancy') discrepancyCount++;
      });

      setStats({
        totalRecords: enriched.length,
        pendingCount,
        settledCount,
        discrepancyCount,
        totalDepositAmount,
        totalSettledAmount,
      });
    } catch (err: any) {
      toast.error('获取缴款记录失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [supabase, selectedDate]);

  useEffect(() => {
    fetchSettlements();
  }, [fetchSettlements]);

  // ============================================================
  // 缴款确认操作
  // ============================================================

  /** 打开缴款对话框 */
  const handleOpenSettlement = (item: PromoterSettlement) => {
    setSettlingItem(item);
    setSettlementForm({
      // 默认金额为充值总额（使用正确字段名 total_deposit_amount）
      amount: (item.total_deposit_amount || 0).toString(),
      method: 'cash',
      proof_image_url: '',
      note: '',
    });
  };

  /** 确认缴款 - 使用正确的数据库字段名 */
  const handleConfirmSettlement = async () => {
    if (!settlingItem || !admin) return;

    const amount = parseFloat(settlementForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('请输入有效的缴款金额');
      return;
    }

    // 转账方式必须上传凭证
    if (settlementForm.method === 'transfer' && !settlementForm.proof_image_url) {
      toast.error('转账方式请上传转账凭证');
      return;
    }

    setSubmitting(true);
    try {
      // 判断缴款金额与充值总额是否一致
      // 使用正确字段名 total_deposit_amount
      const isDiscrepancy = Math.abs(amount - (settlingItem.total_deposit_amount || 0)) > 0.01;

      // 更新 promoter_settlements 表
      // 字段名：settlement_amount, settlement_method, proof_image_url, settlement_status,
      //         confirmed_by, confirmed_at, note
      const { error } = await supabase
        .from('promoter_settlements')
        .update({
          settlement_amount: amount,
          settlement_method: settlementForm.method,
          proof_image_url: settlementForm.proof_image_url || null,  // 单个 URL
          settlement_status: isDiscrepancy ? 'discrepancy' : 'settled',
          confirmed_by: admin.username || admin.id,
          confirmed_at: new Date().toISOString(),
          note: settlementForm.note || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settlingItem.id);

      if (error) throw error;

      toast.success(isDiscrepancy ? '已标记为金额差异' : '缴款确认成功');
      setSettlingItem(null);
      fetchSettlements();
    } catch (err: any) {
      toast.error('操作失败: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  /** 日期导航 */
  const navigateDate = (direction: -1 | 1) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + direction);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  // ============================================================
  // 渲染
  // ============================================================

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            🧾 缴款管理
          </h1>
          <p className="text-sm text-gray-500 mt-1">确认地推人员每日缴款状态，标记现金/转账方式</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchSettlements}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* 日期选择器 */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <Button variant="outline" size="sm" onClick={() => navigateDate(-1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium"
              />
              <Button variant="outline" size="sm" onClick={() => navigateDate(1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              >
                今天
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-sm text-yellow-600 mb-1">
              <Clock className="w-4 h-4" />
              待缴款
            </div>
            <p className="text-xl font-bold">{stats.pendingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-sm text-green-600 mb-1">
              <CheckCircle className="w-4 h-4" />
              已缴款
            </div>
            <p className="text-xl font-bold">{stats.settledCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-sm text-red-600 mb-1">
              <AlertTriangle className="w-4 h-4" />
              金额差异
            </div>
            <p className="text-xl font-bold">{stats.discrepancyCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-sm text-gray-500 mb-1">充值/缴款总额</div>
            <p className="text-lg font-bold">
              <span className="text-green-600">{formatCurrency(stats.totalDepositAmount)}</span>
              <span className="text-gray-400 mx-1">/</span>
              <span className="text-blue-600">{formatCurrency(stats.totalSettledAmount)}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 缴款记录表格 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {selectedDate} 缴款状态 ({settlements.length} 人)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">加载中...</span>
            </div>
          ) : settlements.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              该日期暂无缴款记录（当地推人员进行充值操作时会自动创建）
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>地推人员</TableHead>
                  <TableHead className="text-right">充值笔数</TableHead>
                  <TableHead className="text-right">充值总额</TableHead>
                  <TableHead className="text-right">缴款金额</TableHead>
                  <TableHead>缴款方式</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>确认人</TableHead>
                  <TableHead className="w-[100px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settlements.map(s => {
                  const config = statusConfig[s.settlement_status] || statusConfig.pending;
                  // 检查是否有差异（使用正确字段名 total_deposit_amount）
                  const hasDiff = s.settlement_amount !== null &&
                    Math.abs(s.settlement_amount - s.total_deposit_amount) > 0.01;

                  return (
                    <TableRow key={s.id} className={hasDiff ? 'bg-red-50' : ''}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{s.promoter_name}</p>
                          {s.promoter_telegram_id && (
                            <p className="text-xs text-gray-400">TG: {s.promoter_telegram_id}</p>
                          )}
                        </div>
                      </TableCell>
                      {/* 使用正确字段名 total_deposit_count */}
                      <TableCell className="text-right">{s.total_deposit_count}</TableCell>
                      {/* 使用正确字段名 total_deposit_amount */}
                      <TableCell className="text-right font-medium text-green-600">
                        {formatCurrency(s.total_deposit_amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {s.settlement_amount !== null ? (
                          <span className={hasDiff ? 'font-medium text-red-600' : 'font-medium text-blue-600'}>
                            {formatCurrency(s.settlement_amount)}
                            {hasDiff && (
                              <span className="text-xs ml-1">
                                ({s.settlement_amount > s.total_deposit_amount ? '+' : ''}
                                {(s.settlement_amount - s.total_deposit_amount).toFixed(2)})
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {s.settlement_method === 'cash' && (
                          <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded">
                            <Banknote className="w-3 h-3" /> 现金
                          </span>
                        )}
                        {s.settlement_method === 'transfer' && (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                            <CreditCard className="w-3 h-3" /> 转账
                            {/* 使用正确字段名 proof_image_url */}
                            {s.proof_image_url && (
                              <button
                                onClick={() => setViewingProofUrl(s.proof_image_url)}
                                className="ml-1 text-blue-500 hover:text-blue-700"
                                title="查看凭证"
                              >
                                <Eye className="w-3 h-3" />
                              </button>
                            )}
                          </span>
                        )}
                        {!s.settlement_method && <span className="text-gray-400">-</span>}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${config.color} border`}>
                          <span className="flex items-center gap-1">
                            {config.icon}
                            {config.label}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {s.confirmed_by ? (
                          <div>
                            <p>{s.confirmed_by}</p>
                            {s.confirmed_at && (
                              <p className="text-gray-400">{new Date(s.confirmed_at).toLocaleTimeString()}</p>
                            )}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {s.settlement_status === 'pending' ? (
                          <Button
                            size="sm"
                            onClick={() => handleOpenSettlement(s)}
                          >
                            确认缴款
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenSettlement(s)}
                          >
                            修改
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ==================== 缴款确认对话框 ==================== */}
      <Dialog open={!!settlingItem} onOpenChange={(open) => !open && setSettlingItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {settlingItem?.settlement_status === 'pending' ? '确认缴款' : '修改缴款'}
              {' - '}{settlingItem?.promoter_name}
            </DialogTitle>
          </DialogHeader>
          {settlingItem && (
            <div className="space-y-4">
              {/* 充值信息摘要 - 使用正确字段名 */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">充值笔数</span>
                  <span className="font-medium">{settlingItem.total_deposit_count} 笔</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-500">充值总额</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(settlingItem.total_deposit_amount)}
                  </span>
                </div>
              </div>

              {/* 缴款金额 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">实际缴款金额 (TJS)</label>
                <input
                  type="number"
                  step="0.01"
                  value={settlementForm.amount}
                  onChange={(e) => setSettlementForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="输入实际缴款金额"
                />
                {/* 差异提示 */}
                {settlementForm.amount && Math.abs(parseFloat(settlementForm.amount) - settlingItem.total_deposit_amount) > 0.01 && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    与充值总额差异: {(parseFloat(settlementForm.amount) - settlingItem.total_deposit_amount).toFixed(2)} TJS
                  </p>
                )}
              </div>

              {/* 缴款方式 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">缴款方式</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSettlementForm(prev => ({ ...prev, method: 'cash' }))}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 transition-colors ${
                      settlementForm.method === 'cash'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span className="text-sm font-medium">现金</span>
                  </button>
                  <button
                    onClick={() => setSettlementForm(prev => ({ ...prev, method: 'transfer' }))}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 transition-colors ${
                      settlementForm.method === 'transfer'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span className="text-sm font-medium">转账</span>
                  </button>
                </div>
              </div>

              {/* 转账凭证上传 - 使用正确字段名 proof_image_url（单个 URL） */}
              {settlementForm.method === 'transfer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">转账凭证</label>
                  <ImageUpload
                    value={settlementForm.proof_image_url ? [settlementForm.proof_image_url] : []}
                    onChange={(urls) => setSettlementForm(prev => ({
                      ...prev,
                      proof_image_url: urls[0] || '',
                    }))}
                    maxImages={1}
                    bucket="settlement-proofs"
                  />
                </div>
              )}

              {/* 备注 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注（可选）</label>
                <textarea
                  value={settlementForm.note}
                  onChange={(e) => setSettlementForm(prev => ({ ...prev, note: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="如有差异请说明原因..."
                />
              </div>

              {/* 操作按钮 */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setSettlingItem(null)}>取消</Button>
                <Button onClick={handleConfirmSettlement} disabled={submitting}>
                  {submitting ? '提交中...' : '确认缴款'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ==================== 凭证查看对话框 ==================== */}
      <Dialog open={!!viewingProofUrl} onOpenChange={(open) => !open && setViewingProofUrl(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>缴款凭证</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {viewingProofUrl && (
              <img
                src={viewingProofUrl}
                alt="缴款凭证"
                className="w-full rounded-lg border"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
