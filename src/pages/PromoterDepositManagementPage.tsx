/**
 * PromoterDepositManagementPage.tsx
 * 地推充值管理页面 - 管理后台
 *
 * 功能模块：
 * 1. 充值记录列表 - 查看所有地推人员的充值明细
 * 2. 对账功能 - 按日/周/月汇总，支持按地推人员筛选
 * 3. 快捷金额配置 - 管理前端充值的快捷金额选项
 *
 * 数据库字段对照（promoter_deposits 表）：
 * - promoter_id: UUID (NOT promoter_user_id)
 * - target_user_id: UUID
 * - amount: NUMERIC
 * - bonus_amount: NUMERIC (NOT first_deposit_bonus)
 * - transaction_id: UUID
 * - note: TEXT
 * - status: TEXT
 * - created_at: TIMESTAMPTZ
 *
 * 设计原则：
 * - 与现有 admin 页面风格保持一致
 * - 使用现有 UI 组件（Card, Table, Dialog, Button, Badge, Tabs）
 * - 使用 useSupabase / useAdminAuth 认证
 * - 所有金额使用 formatCurrency 格式化
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { toast } from 'react-hot-toast';
import {
  Search,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Eye,
  Plus,
  Trash2,
  Save,
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '../lib/utils';

// ============================================================
// 类型定义 - 字段名严格与数据库表 promoter_deposits 一致
// ============================================================

/** 地推充值记录（对应 promoter_deposits 表） */
interface PromoterDeposit {
  id: string;
  promoter_id: string;       // 数据库字段名：promoter_id
  target_user_id: string;
  amount: number;
  note: string | null;
  bonus_amount: number;      // 数据库字段名：bonus_amount
  transaction_id: string | null;
  status: string;
  created_at: string;
  // 前端 Join 后的显示字段（非数据库字段）
  promoter_name?: string;
  promoter_telegram_id?: string;
  target_user_name?: string;
  target_telegram_id?: string;
}

/** 地推人员汇总数据 */
interface PromoterSummary {
  promoter_id: string;       // 与数据库字段名一致
  promoter_name: string;
  total_count: number;
  total_amount: number;
  total_bonus: number;
  unique_users: number;
}

/** 快捷金额配置 */
interface QuickAmountConfig {
  amounts: number[];
}

// ============================================================
// 时间范围工具函数
// ============================================================

/** 获取日期范围（返回 ISO 字符串） */
function getDateRange(range: 'today' | 'week' | 'month' | 'custom', customStart?: string, customEnd?: string) {
  const now = new Date();
  let start: Date;
  let end: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (range) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'custom':
      start = customStart ? new Date(customStart) : new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = customEnd ? new Date(customEnd + 'T23:59:59.999') : end;
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  return { start: start.toISOString(), end: end.toISOString() };
}

// ============================================================
// 主组件
// ============================================================

export default function PromoterDepositManagementPage() {
  const { supabase } = useSupabase();
  const { admin } = useAdminAuth();

  // Tab 状态
  const [activeTab, setActiveTab] = useState('records');

  // 充值记录状态
  const [deposits, setDeposits] = useState<PromoterDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedPromoterId, setSelectedPromoterId] = useState<string>('');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  // 汇总统计状态
  const [summaries, setSummaries] = useState<PromoterSummary[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalCount: 0,
    totalAmount: 0,
    totalBonus: 0,
    uniquePromoters: 0,
    uniqueUsers: 0,
  });

  // 地推人员列表（用于筛选下拉）
  const [promoterList, setPromoterList] = useState<Array<{ user_id: string; user_name: string }>>([]);

  // 快捷金额配置状态
  const [quickAmounts, setQuickAmounts] = useState<number[]>([10, 20, 50, 100, 200, 500]);
  const [newQuickAmount, setNewQuickAmount] = useState('');
  const [savingQuickAmounts, setSavingQuickAmounts] = useState(false);

  // 详情对话框
  const [selectedDeposit, setSelectedDeposit] = useState<PromoterDeposit | null>(null);

  // ============================================================
  // 数据获取
  // ============================================================

  /** 获取地推人员列表（用于筛选下拉） */
  const fetchPromoterList = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('promoter_profiles')
        .select('user_id')
        .eq('promoter_status', 'active');

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = data.map(p => p.user_id);
        const { data: users, error: userError } = await supabase
          .from('users')
          .select('id, first_name, last_name, telegram_id')
          .in('id', userIds);

        if (userError) throw userError;

        const list = (users || []).map(u => ({
          user_id: u.id,
          user_name: [u.first_name, u.last_name].filter(Boolean).join(' ') || `TG:${u.telegram_id}` || u.id.slice(0, 8),
        }));
        setPromoterList(list);
      }
    } catch (err: any) {
      console.error('获取地推人员列表失败:', err);
    }
  }, [supabase]);

  /** 获取充值记录 - 注意使用正确的数据库字段名 */
  const fetchDeposits = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange(timeRange, customStartDate, customEndDate);

      // 查询 promoter_deposits 表
      // 字段名：promoter_id, target_user_id, amount, bonus_amount, note, status, created_at
      let query = supabase
        .from('promoter_deposits')
        .select('*', { count: 'exact' })
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      // 按地推人员筛选 - 注意字段名是 promoter_id
      if (selectedPromoterId) {
        query = query.eq('promoter_id', selectedPromoterId);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      // 获取关联的用户名（地推人员 + 目标用户）
      const allUserIds = new Set<string>();
      (data || []).forEach(d => {
        allUserIds.add(d.promoter_id);      // 数据库字段名
        allUserIds.add(d.target_user_id);
      });

      if (allUserIds.size > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, first_name, last_name, telegram_id')
          .in('id', Array.from(allUserIds));

        const userMap = new Map((users || []).map(u => [u.id, u]));

        const enriched: PromoterDeposit[] = (data || []).map(d => {
          const promoter = userMap.get(d.promoter_id);
          const target = userMap.get(d.target_user_id);
          return {
            ...d,
            // bonus_amount 直接从数据库读取，无需重命名
            promoter_name: promoter
              ? [promoter.first_name, promoter.last_name].filter(Boolean).join(' ') || `TG:${promoter.telegram_id}`
              : d.promoter_id.slice(0, 8),
            promoter_telegram_id: promoter?.telegram_id,
            target_user_name: target
              ? [target.first_name, target.last_name].filter(Boolean).join(' ') || `TG:${target.telegram_id}`
              : d.target_user_id.slice(0, 8),
            target_telegram_id: target?.telegram_id,
          };
        });

        setDeposits(enriched);
      } else {
        setDeposits([]);
      }

      setTotalCount(count || 0);
    } catch (err: any) {
      toast.error('获取充值记录失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [supabase, timeRange, customStartDate, customEndDate, selectedPromoterId, page]);

  /** 获取汇总统计 */
  const fetchSummaries = useCallback(async () => {
    try {
      const { start, end } = getDateRange(timeRange, customStartDate, customEndDate);

      // 字段名：promoter_id, target_user_id, amount, bonus_amount
      const { data, error } = await supabase
        .from('promoter_deposits')
        .select('promoter_id, target_user_id, amount, bonus_amount')
        .gte('created_at', start)
        .lte('created_at', end);

      if (error) throw error;

      if (!data || data.length === 0) {
        setSummaries([]);
        setTotalStats({ totalCount: 0, totalAmount: 0, totalBonus: 0, uniquePromoters: 0, uniqueUsers: 0 });
        return;
      }

      // 按地推人员分组汇总
      const groupMap = new Map<string, {
        count: number;
        amount: number;
        bonus: number;
        users: Set<string>;
      }>();

      const allPromoterIds = new Set<string>();
      const allTargetUsers = new Set<string>();
      let totalAmount = 0;
      let totalBonus = 0;

      data.forEach(d => {
        allPromoterIds.add(d.promoter_id);
        allTargetUsers.add(d.target_user_id);
        totalAmount += d.amount;
        totalBonus += d.bonus_amount || 0;

        const existing = groupMap.get(d.promoter_id) || {
          count: 0,
          amount: 0,
          bonus: 0,
          users: new Set<string>(),
        };
        existing.count++;
        existing.amount += d.amount;
        existing.bonus += d.bonus_amount || 0;
        existing.users.add(d.target_user_id);
        groupMap.set(d.promoter_id, existing);
      });

      // 获取地推人员用户名
      const { data: users } = await supabase
        .from('users')
        .select('id, first_name, last_name, telegram_id')
        .in('id', Array.from(allPromoterIds));

      const userMap = new Map((users || []).map(u => [u.id, u]));

      const summaryList: PromoterSummary[] = [];
      groupMap.forEach((value, key) => {
        const user = userMap.get(key);
        summaryList.push({
          promoter_id: key,
          promoter_name: user
            ? [user.first_name, user.last_name].filter(Boolean).join(' ') || `TG:${user.telegram_id}`
            : key.slice(0, 8),
          total_count: value.count,
          total_amount: value.amount,
          total_bonus: value.bonus,
          unique_users: value.users.size,
        });
      });

      // 按充值金额降序排列
      summaryList.sort((a, b) => b.total_amount - a.total_amount);

      setSummaries(summaryList);
      setTotalStats({
        totalCount: data.length,
        totalAmount,
        totalBonus,
        uniquePromoters: allPromoterIds.size,
        uniqueUsers: allTargetUsers.size,
      });
    } catch (err: any) {
      console.error('获取汇总统计失败:', err);
    }
  }, [supabase, timeRange, customStartDate, customEndDate]);

  /** 获取快捷金额配置 */
  const fetchQuickAmounts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'promoter_deposit_quick_amounts')
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      if (data?.value) {
        const config = data.value as QuickAmountConfig;
        if (config.amounts && Array.isArray(config.amounts)) {
          setQuickAmounts(config.amounts);
        }
      }
    } catch (err: any) {
      console.error('获取快捷金额配置失败:', err);
    }
  }, [supabase]);

  /** 保存快捷金额配置 */
  const handleSaveQuickAmounts = async () => {
    setSavingQuickAmounts(true);
    try {
      const sorted = [...quickAmounts].sort((a, b) => a - b);
      const { error } = await supabase
        .from('system_config')
        .upsert({
          key: 'promoter_deposit_quick_amounts',
          value: { amounts: sorted },
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' });

      if (error) throw error;
      setQuickAmounts(sorted);
      toast.success('快捷金额配置已保存');
    } catch (err: any) {
      toast.error('保存失败: ' + err.message);
    } finally {
      setSavingQuickAmounts(false);
    }
  };

  /** 添加快捷金额 */
  const handleAddQuickAmount = () => {
    const amount = parseFloat(newQuickAmount);
    if (isNaN(amount) || amount < 10 || amount > 500) {
      toast.error('金额必须在 10-500 之间');
      return;
    }
    if (quickAmounts.includes(amount)) {
      toast.error('该金额已存在');
      return;
    }
    setQuickAmounts(prev => [...prev, amount].sort((a, b) => a - b));
    setNewQuickAmount('');
  };

  /** 删除快捷金额 */
  const handleRemoveQuickAmount = (amount: number) => {
    setQuickAmounts(prev => prev.filter(a => a !== amount));
  };

  /** 导出 CSV - 使用正确的字段名 */
  const handleExportCSV = () => {
    if (deposits.length === 0) {
      toast.error('没有数据可导出');
      return;
    }

    const headers = ['时间', '地推人员', '地推TG_ID', '目标用户', '用户TG_ID', '充值金额', '首充奖励', '备注'];
    const rows = deposits.map(d => [
      formatDateTime(d.created_at),
      d.promoter_name || '',
      d.promoter_telegram_id || '',
      d.target_user_name || '',
      d.target_telegram_id || '',
      d.amount.toFixed(2),
      (d.bonus_amount || 0).toFixed(2),
      d.note || '',
    ]);

    // BOM + CSV 格式，确保 Excel 正确识别 UTF-8
    const csvContent = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `promoter_deposits_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('导出成功');
  };

  // ============================================================
  // 初始化
  // ============================================================

  useEffect(() => {
    fetchPromoterList();
    fetchQuickAmounts();
  }, [fetchPromoterList, fetchQuickAmounts]);

  useEffect(() => {
    fetchDeposits();
    fetchSummaries();
  }, [fetchDeposits, fetchSummaries]);

  // ============================================================
  // 渲染
  // ============================================================

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            💰 地推充值管理
          </h1>
          <p className="text-sm text-gray-500 mt-1">查看地推人员充值记录、对账统计、配置快捷金额</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { fetchDeposits(); fetchSummaries(); }}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* 汇总统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <DollarSign className="w-4 h-4" />
              充值总额
            </div>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(totalStats.totalAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <TrendingUp className="w-4 h-4" />
              充值笔数
            </div>
            <p className="text-xl font-bold text-gray-900">{totalStats.totalCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <DollarSign className="w-4 h-4 text-orange-500" />
              首充奖励
            </div>
            <p className="text-xl font-bold text-orange-600">{formatCurrency(totalStats.totalBonus)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Users className="w-4 h-4" />
              活跃地推
            </div>
            <p className="text-xl font-bold text-gray-900">{totalStats.uniquePromoters}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Users className="w-4 h-4 text-blue-500" />
              充值用户
            </div>
            <p className="text-xl font-bold text-blue-600">{totalStats.uniqueUsers}</p>
          </CardContent>
        </Card>
      </div>

      {/* 筛选栏 */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* 时间范围 */}
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-gray-400" />
              {(['today', 'week', 'month', 'custom'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                    timeRange === range
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {{ today: '今日', week: '本周', month: '本月', custom: '自定义' }[range]}
                </button>
              ))}
            </div>

            {/* 自定义日期 */}
            {timeRange === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-xs"
                />
                <span className="text-gray-400">至</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-xs"
                />
              </div>
            )}

            {/* 地推人员筛选 */}
            <div className="flex items-center gap-1">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={selectedPromoterId}
                onChange={(e) => { setSelectedPromoterId(e.target.value); setPage(0); }}
                className="px-2 py-1.5 border border-gray-300 rounded text-xs"
              >
                <option value="">全部地推人员</option>
                {promoterList.map(p => (
                  <option key={p.user_id} value={p.user_id}>{p.user_name}</option>
                ))}
              </select>
            </div>

            {/* 导出 */}
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="w-3 h-3 mr-1" />
              导出CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="records">充值记录</TabsTrigger>
          <TabsTrigger value="summary">对账汇总</TabsTrigger>
          <TabsTrigger value="config">快捷金额配置</TabsTrigger>
        </TabsList>

        {/* ==================== 充值记录 Tab ==================== */}
        <TabsContent value="records">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>充值明细 ({totalCount} 条)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-500">加载中...</span>
                </div>
              ) : deposits.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  暂无充值记录
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[160px]">时间</TableHead>
                        <TableHead>地推人员</TableHead>
                        <TableHead>目标用户</TableHead>
                        <TableHead className="text-right">充值金额</TableHead>
                        <TableHead className="text-right">首充奖励</TableHead>
                        <TableHead>备注</TableHead>
                        <TableHead className="w-[60px]">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deposits.map(d => (
                        <TableRow key={d.id}>
                          <TableCell className="text-xs text-gray-500">
                            {formatDateTime(d.created_at)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium">{d.promoter_name}</p>
                              {d.promoter_telegram_id && (
                                <p className="text-xs text-gray-400">TG: {d.promoter_telegram_id}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium">{d.target_user_name}</p>
                              {d.target_telegram_id && (
                                <p className="text-xs text-gray-400">TG: {d.target_telegram_id}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            +{formatCurrency(d.amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {(d.bonus_amount || 0) > 0 ? (
                              <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                                +{formatCurrency(d.bonus_amount)}
                              </Badge>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-gray-500 max-w-[120px] truncate">
                            {d.note || '-'}
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => setSelectedDeposit(d)}
                              className="p-1 text-gray-400 hover:text-blue-600 rounded"
                              title="查看详情"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* 分页 */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <p className="text-sm text-gray-500">
                        第 {page + 1} / {totalPages} 页，共 {totalCount} 条
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => Math.max(0, p - 1))}
                          disabled={page === 0}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                          disabled={page >= totalPages - 1}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== 对账汇总 Tab ==================== */}
        <TabsContent value="summary">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                按地推人员汇总
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summaries.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  当前时间范围内暂无数据
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>排名</TableHead>
                      <TableHead>地推人员</TableHead>
                      <TableHead className="text-right">充值笔数</TableHead>
                      <TableHead className="text-right">充值总额</TableHead>
                      <TableHead className="text-right">首充奖励</TableHead>
                      <TableHead className="text-right">充值用户数</TableHead>
                      <TableHead className="text-right">笔均金额</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaries.map((s, idx) => (
                      <TableRow key={s.promoter_id}>
                        <TableCell>
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                            idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                            idx === 1 ? 'bg-gray-100 text-gray-700' :
                            idx === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-50 text-gray-500'
                          }`}>
                            {idx + 1}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">{s.promoter_name}</TableCell>
                        <TableCell className="text-right">{s.total_count}</TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCurrency(s.total_amount)}
                        </TableCell>
                        <TableCell className="text-right text-orange-600">
                          {s.total_bonus > 0 ? formatCurrency(s.total_bonus) : '-'}
                        </TableCell>
                        <TableCell className="text-right">{s.unique_users}</TableCell>
                        <TableCell className="text-right text-gray-600">
                          {formatCurrency(s.total_count > 0 ? s.total_amount / s.total_count : 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== 快捷金额配置 Tab ==================== */}
        <TabsContent value="config">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">快捷金额配置</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                配置地推人员充值时显示的快捷金额按钮。金额范围: 10 - 500 TJS。
              </p>

              {/* 当前快捷金额列表 */}
              <div className="flex flex-wrap gap-2 mb-4">
                {quickAmounts.map(amount => (
                  <div
                    key={amount}
                    className="flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5"
                  >
                    <span className="text-sm font-medium text-blue-700">{amount} TJS</span>
                    <button
                      onClick={() => handleRemoveQuickAmount(amount)}
                      className="text-blue-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* 添加新金额 */}
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="number"
                  min="10"
                  max="500"
                  value={newQuickAmount}
                  onChange={(e) => setNewQuickAmount(e.target.value)}
                  placeholder="输入金额 (10-500)"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-48 focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddQuickAmount()}
                />
                <Button variant="outline" size="sm" onClick={handleAddQuickAmount}>
                  <Plus className="w-4 h-4 mr-1" />
                  添加
                </Button>
              </div>

              {/* 保存按钮 */}
              <Button onClick={handleSaveQuickAmounts} disabled={savingQuickAmounts}>
                <Save className="w-4 h-4 mr-1" />
                {savingQuickAmounts ? '保存中...' : '保存配置'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ==================== 充值详情对话框 ==================== */}
      <Dialog open={!!selectedDeposit} onOpenChange={(open) => !open && setSelectedDeposit(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>充值详情</DialogTitle>
            <DialogDescription>
              {selectedDeposit && formatDateTime(selectedDeposit.created_at)}
            </DialogDescription>
          </DialogHeader>
          {selectedDeposit && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">地推人员</p>
                  <p className="text-sm font-medium">{selectedDeposit.promoter_name}</p>
                  {selectedDeposit.promoter_telegram_id && (
                    <p className="text-xs text-gray-400">TG: {selectedDeposit.promoter_telegram_id}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">目标用户</p>
                  <p className="text-sm font-medium">{selectedDeposit.target_user_name}</p>
                  {selectedDeposit.target_telegram_id && (
                    <p className="text-xs text-gray-400">TG: {selectedDeposit.target_telegram_id}</p>
                  )}
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-600 mb-1">充值金额</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(selectedDeposit.amount)}</p>
              </div>
              {(selectedDeposit.bonus_amount || 0) > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-xs text-orange-600 mb-1">首充奖励</p>
                  <p className="text-lg font-bold text-orange-700">+{formatCurrency(selectedDeposit.bonus_amount)}</p>
                </div>
              )}
              {selectedDeposit.note && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">备注</p>
                  <p className="text-sm bg-gray-50 rounded p-2">{selectedDeposit.note}</p>
                </div>
              )}
              <div className="text-xs text-gray-400 pt-2 border-t">
                <p>记录ID: {selectedDeposit.id}</p>
                <p>地推人员ID: {selectedDeposit.promoter_id}</p>
                <p>目标用户ID: {selectedDeposit.target_user_id}</p>
                {selectedDeposit.transaction_id && (
                  <p>交易ID: {selectedDeposit.transaction_id}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
