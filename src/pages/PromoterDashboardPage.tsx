import React, { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import {
  Users,
  DollarSign,
  UserPlus,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  MapPin,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Phone,
} from 'lucide-react';

// ============================================================
// Types
// ============================================================

interface PromoterStat {
  user_id: string;
  name: string;
  referral_code: string;
  team_name: string | null;
  point_name: string | null;
  contacts: number;
  registrations: number;
  first_charges: number;
  first_charge_amount: number;
  reg_conversion_rate: number;
  charge_conversion_rate: number;
}

interface PointStat {
  point_id: string;
  point_name: string;
  area_size: string;
  staff_count: number;
  registrations: number;
  charges: number;
  charge_amount: number;
  reg_per_staff: number;
  health: 'good' | 'fair' | 'poor' | 'inactive';
}

interface DashboardSummary {
  total_registrations: number;
  total_first_charges: number;
  total_first_charge_amount: number;
  total_contacts: number;
  prev_registrations: number;
  prev_first_charges: number;
  prev_first_charge_amount: number;
  prev_contacts: number;
}

type TimeRange = 'today' | 'week' | 'month';

// ============================================================
// Helper functions
// ============================================================

function getTimeRangeStart(range: TimeRange): string {
  const now = new Date();
  switch (range) {
    case 'today':
      now.setHours(0, 0, 0, 0);
      return now.toISOString();
    case 'week': {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      now.setDate(diff);
      now.setHours(0, 0, 0, 0);
      return now.toISOString();
    }
    case 'month':
      now.setDate(1);
      now.setHours(0, 0, 0, 0);
      return now.toISOString();
  }
}

function getPrevTimeRangeStart(range: TimeRange): { start: string; end: string } {
  const now = new Date();
  let start: Date;
  let end: Date;

  switch (range) {
    case 'today':
      end = new Date(now);
      end.setHours(0, 0, 0, 0);
      start = new Date(end);
      start.setDate(start.getDate() - 1);
      return { start: start.toISOString(), end: end.toISOString() };
    case 'week': {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      end = new Date(now);
      end.setDate(diff);
      end.setHours(0, 0, 0, 0);
      start = new Date(end);
      start.setDate(start.getDate() - 7);
      return { start: start.toISOString(), end: end.toISOString() };
    }
    case 'month':
      end = new Date(now);
      end.setDate(1);
      end.setHours(0, 0, 0, 0);
      start = new Date(end);
      start.setMonth(start.getMonth() - 1);
      return { start: start.toISOString(), end: end.toISOString() };
  }
}

function getRankIcon(index: number): string {
  if (index === 0) return '🏆';
  if (index === 1) return '🥇';
  if (index === 2) return '🥈';
  return `#${index + 1}`;
}

function getHealthBadge(health: string) {
  switch (health) {
    case 'good':
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">良好</span>;
    case 'fair':
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">一般</span>;
    case 'poor':
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">较差</span>;
    case 'inactive':
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">无数据</span>;
    default:
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">--</span>;
  }
}

function getAreaSizeLabel(size: string): string {
  switch (size) {
    case 'large': return '大';
    case 'medium': return '中';
    case 'small': return '小';
    default: return size;
  }
}

function TrendIndicator({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) {
    return <span className="text-xs opacity-70">--</span>;
  }
  const pct = ((current - previous) / previous * 100).toFixed(1);
  const num = parseFloat(pct);
  if (num > 0) {
    return (
      <span className="flex items-center text-xs opacity-90">
        <ArrowUpRight className="w-3 h-3 mr-0.5" />+{pct}%
      </span>
    );
  } else if (num < 0) {
    return (
      <span className="flex items-center text-xs opacity-90">
        <ArrowDownRight className="w-3 h-3 mr-0.5" />{pct}%
      </span>
    );
  }
  return (
    <span className="flex items-center text-xs opacity-70">
      <Minus className="w-3 h-3 mr-0.5" />0%
    </span>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function PromoterDashboardPage() {
  const { supabase } = useSupabase();
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary>({
    total_registrations: 0,
    total_first_charges: 0,
    total_first_charge_amount: 0,
    total_contacts: 0,
    prev_registrations: 0,
    prev_first_charges: 0,
    prev_first_charge_amount: 0,
    prev_contacts: 0,
  });
  const [promoters, setPromoters] = useState<PromoterStat[]>([]);
  const [points, setPoints] = useState<PointStat[]>([]);
  const [sortField, setSortField] = useState<keyof PromoterStat>('first_charges');
  const [sortAsc, setSortAsc] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const rangeStart = getTimeRangeStart(timeRange);
      const prev = getPrevTimeRangeStart(timeRange);

      // 1. Fetch all promoter profiles with team and point info
      const { data: promoterProfiles, error: ppError } = await supabase
        .from('promoter_profiles')
        .select('user_id, team_id, point_id, promoter_status')
        .eq('promoter_status', 'active');

      if (ppError) throw ppError;

      if (!promoterProfiles || promoterProfiles.length === 0) {
        setSummary({
          total_registrations: 0, total_first_charges: 0,
          total_first_charge_amount: 0, total_contacts: 0,
          prev_registrations: 0, prev_first_charges: 0,
          prev_first_charge_amount: 0, prev_contacts: 0,
        });
        setPromoters([]);
        setPoints([]);
        setLoading(false);
        return;
      }

      const promoterUserIds = promoterProfiles.map(p => p.user_id);

      // 2. Fetch user info for promoters
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, telegram_username, referral_code')
        .in('id', promoterUserIds);

      if (usersError) throw usersError;

      // 3. Fetch teams
      const teamIds = [...new Set(promoterProfiles.map(p => p.team_id).filter(Boolean))];
      let teamsMap: Record<string, string> = {};
      if (teamIds.length > 0) {
        const { data: teamsData } = await supabase
          .from('promoter_teams')
          .select('id, name')
          .in('id', teamIds);
        if (teamsData) {
          teamsMap = Object.fromEntries(teamsData.map(t => [t.id, t.name]));
        }
      }

      // 4. Fetch points
      const pointIds = [...new Set(promoterProfiles.map(p => p.point_id).filter(Boolean))];
      let pointsMap: Record<string, { name: string; area_size: string }> = {};
      if (pointIds.length > 0) {
        const { data: pointsData } = await supabase
          .from('promotion_points')
          .select('id, name, area_size')
          .in('id', pointIds);
        if (pointsData) {
          pointsMap = Object.fromEntries(pointsData.map(p => [p.id, { name: p.name, area_size: p.area_size }]));
        }
      }

      // 5. Fetch registrations (users referred by promoters in time range)
      const { data: regsData, error: regsError } = await supabase
        .from('users')
        .select('id, referred_by_id, created_at')
        .in('referred_by_id', promoterUserIds)
        .gte('created_at', rangeStart);

      if (regsError) throw regsError;

      // 6. Fetch previous period registrations
      const { data: prevRegsData } = await supabase
        .from('users')
        .select('id, referred_by_id')
        .in('referred_by_id', promoterUserIds)
        .gte('created_at', prev.start)
        .lt('created_at', prev.end);

      // 7. Fetch deposit_requests (approved) in time range for users referred by promoters
      // First get all user IDs referred by promoters
      const { data: allReferredUsers } = await supabase
        .from('users')
        .select('id, referred_by_id')
        .in('referred_by_id', promoterUserIds);

      const referredUserIds = allReferredUsers?.map(u => u.id) || [];
      const referrerMap: Record<string, string> = {};
      allReferredUsers?.forEach(u => {
        if (u.referred_by_id) referrerMap[u.id] = u.referred_by_id;
      });

      let depositsInRange: any[] = [];
      let prevDepositsInRange: any[] = [];

      if (referredUserIds.length > 0) {
        // Batch fetch in chunks of 100 to avoid query limits
        for (let i = 0; i < referredUserIds.length; i += 100) {
          const chunk = referredUserIds.slice(i, i + 100);
          const { data: dData } = await supabase
            .from('deposit_requests')
            .select('id, user_id, amount, status, created_at')
            .in('user_id', chunk)
            .eq('status', 'APPROVED')
            .gte('created_at', rangeStart);
          if (dData) depositsInRange.push(...dData);

          const { data: pdData } = await supabase
            .from('deposit_requests')
            .select('id, user_id, amount, status')
            .in('user_id', chunk)
            .eq('status', 'APPROVED')
            .gte('created_at', prev.start)
            .lt('created_at', prev.end);
          if (pdData) prevDepositsInRange.push(...pdData);
        }
      }

      // 8. Fetch daily logs for contacts
      const { data: logsData } = await supabase
        .from('promoter_daily_logs')
        .select('promoter_id, contact_count, log_date')
        .in('promoter_id', promoterUserIds)
        .gte('log_date', rangeStart.split('T')[0]);

      // 9. Build per-promoter stats
      const promoterStats: PromoterStat[] = promoterProfiles.map(pp => {
        const user = usersData?.find(u => u.id === pp.user_id);
        const name = user?.telegram_username || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'N/A';
        const referralCode = user?.referral_code || '';
        const teamName = pp.team_id ? (teamsMap[pp.team_id] || null) : null;
        const pointName = pp.point_id ? (pointsMap[pp.point_id]?.name || null) : null;

        const regs = regsData?.filter(r => r.referred_by_id === pp.user_id).length || 0;

        // Deposits: find unique users referred by this promoter who deposited in range
        const referredByThis = allReferredUsers?.filter(u => u.referred_by_id === pp.user_id).map(u => u.id) || [];
        const depositsForThis = depositsInRange.filter(d => referredByThis.includes(d.user_id));
        const uniqueChargeUsers = new Set(depositsForThis.map(d => d.user_id));
        const chargeAmount = depositsForThis.reduce((sum: number, d: any) => sum + (parseFloat(d.amount) || 0), 0);

        const contacts = logsData?.filter(l => l.promoter_id === pp.user_id).reduce((sum, l) => sum + (l.contact_count || 0), 0) || 0;

        const regRate = contacts > 0 ? Math.round(regs / contacts * 1000) / 10 : 0;
        const chargeRate = regs > 0 ? Math.round(uniqueChargeUsers.size / regs * 1000) / 10 : 0;

        return {
          user_id: pp.user_id,
          name,
          referral_code: referralCode,
          team_name: teamName,
          point_name: pointName,
          contacts,
          registrations: regs,
          first_charges: uniqueChargeUsers.size,
          first_charge_amount: chargeAmount,
          reg_conversion_rate: regRate,
          charge_conversion_rate: chargeRate,
        };
      });

      // 10. Build summary
      const totalRegs = promoterStats.reduce((s, p) => s + p.registrations, 0);
      const totalCharges = promoterStats.reduce((s, p) => s + p.first_charges, 0);
      const totalChargeAmt = promoterStats.reduce((s, p) => s + p.first_charge_amount, 0);
      const totalContacts = promoterStats.reduce((s, p) => s + p.contacts, 0);

      const prevTotalRegs = prevRegsData?.length || 0;
      const prevUniqueChargeUsers = new Set(prevDepositsInRange.map(d => d.user_id));
      const prevTotalChargeAmt = prevDepositsInRange.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

      setSummary({
        total_registrations: totalRegs,
        total_first_charges: totalCharges,
        total_first_charge_amount: totalChargeAmt,
        total_contacts: totalContacts,
        prev_registrations: prevTotalRegs,
        prev_first_charges: prevUniqueChargeUsers.size,
        prev_first_charge_amount: prevTotalChargeAmt,
        prev_contacts: 0, // Previous contacts not easily available
      });

      setPromoters(promoterStats);

      // 11. Build point stats
      const pointStatsMap: Record<string, PointStat> = {};
      promoterProfiles.forEach(pp => {
        if (!pp.point_id) return;
        const pointInfo = pointsMap[pp.point_id];
        if (!pointInfo) return;

        if (!pointStatsMap[pp.point_id]) {
          pointStatsMap[pp.point_id] = {
            point_id: pp.point_id,
            point_name: pointInfo.name,
            area_size: pointInfo.area_size,
            staff_count: 0,
            registrations: 0,
            charges: 0,
            charge_amount: 0,
            reg_per_staff: 0,
            health: 'inactive',
          };
        }
        const ps = pointStatsMap[pp.point_id];
        ps.staff_count += 1;

        const pStat = promoterStats.find(s => s.user_id === pp.user_id);
        if (pStat) {
          ps.registrations += pStat.registrations;
          ps.charges += pStat.first_charges;
          ps.charge_amount += pStat.first_charge_amount;
        }
      });

      // Calculate derived fields
      Object.values(pointStatsMap).forEach(ps => {
        ps.reg_per_staff = ps.staff_count > 0 ? Math.round(ps.registrations / ps.staff_count * 10) / 10 : 0;
        if (ps.registrations === 0) {
          ps.health = 'inactive';
        } else {
          const chargeRate = ps.charges / ps.registrations;
          if (chargeRate >= 0.25) ps.health = 'good';
          else if (chargeRate >= 0.15) ps.health = 'fair';
          else ps.health = 'poor';
        }
      });

      setPoints(Object.values(pointStatsMap).sort((a, b) => b.registrations - a.registrations));

    } catch (err: any) {
      console.error('Failed to fetch promoter dashboard stats:', err);
      setError(err.message || '加载地推数据失败');
    } finally {
      setLoading(false);
    }
  }, [supabase, timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Sort promoters
  const sortedPromoters = [...promoters].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortAsc ? aVal - bVal : bVal - aVal;
    }
    return sortAsc
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  const handleSort = (field: keyof PromoterStat) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const getSortIcon = (field: keyof PromoterStat) => {
    if (sortField !== field) return '';
    return sortAsc ? ' ↑' : ' ↓';
  };

  // ============================================================
  // Render
  // ============================================================

  if (loading && promoters.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error && promoters.length === 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-red-600" />
        <span className="text-red-800">{error}</span>
        <button
          onClick={fetchData}
          className="ml-auto px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-7 h-7" />
            地推作战指挥室
          </h1>
          <p className="text-gray-600 mt-1">实时监控地推团队的推广效果和关键指标</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Time Range Selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['today', 'week', 'month'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {range === 'today' ? '今日' : range === 'week' ? '本周' : '本月'}
              </button>
            ))}
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard
          title="新增注册"
          value={summary.total_registrations}
          prevValue={summary.prev_registrations}
          icon={<UserPlus className="w-8 h-8" />}
          color="blue"
          format="number"
        />
        <SummaryCard
          title="首充用户"
          value={summary.total_first_charges}
          prevValue={summary.prev_first_charges}
          icon={<DollarSign className="w-8 h-8" />}
          color="green"
          format="number"
        />
        <SummaryCard
          title="首充金额"
          value={summary.total_first_charge_amount}
          prevValue={summary.prev_first_charge_amount}
          icon={<TrendingUp className="w-8 h-8" />}
          color="purple"
          format="currency"
        />
        <SummaryCard
          title="接触人数"
          value={summary.total_contacts}
          prevValue={summary.prev_contacts}
          icon={<Phone className="w-8 h-8" />}
          color="orange"
          format="number"
        />
      </div>

      {/* Promoter Leaderboard */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-500" />
            地推英雄榜
          </h2>
          <p className="text-sm text-gray-500 mt-1">点击列头可排序 · 自动每60秒刷新</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">排名</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 cursor-pointer hover:text-gray-900" onClick={() => handleSort('name')}>
                  姓名{getSortIcon('name')}
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">团队</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">点位</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 cursor-pointer hover:text-gray-900" onClick={() => handleSort('contacts')}>
                  接触{getSortIcon('contacts')}
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 cursor-pointer hover:text-gray-900" onClick={() => handleSort('registrations')}>
                  注册{getSortIcon('registrations')}
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 cursor-pointer hover:text-gray-900" onClick={() => handleSort('first_charges')}>
                  首充{getSortIcon('first_charges')}
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 cursor-pointer hover:text-gray-900" onClick={() => handleSort('first_charge_amount')}>
                  金额(TJS){getSortIcon('first_charge_amount')}
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 cursor-pointer hover:text-gray-900" onClick={() => handleSort('reg_conversion_rate')}>
                  注册率{getSortIcon('reg_conversion_rate')}
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 cursor-pointer hover:text-gray-900" onClick={() => handleSort('charge_conversion_rate')}>
                  充值率{getSortIcon('charge_conversion_rate')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedPromoters.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>暂无地推人员数据</p>
                    <p className="text-xs mt-1">请先在"地推人员管理"页面添加地推人员</p>
                  </td>
                </tr>
              ) : (
                sortedPromoters.map((p, idx) => {
                  const isWarning = p.charge_conversion_rate < 15 && p.registrations > 0;
                  return (
                    <tr
                      key={p.user_id}
                      className={`border-b last:border-0 ${isWarning ? 'bg-red-50' : 'hover:bg-gray-50'}`}
                    >
                      <td className="px-4 py-3 text-center font-medium">
                        {getRankIcon(idx)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{p.name}</div>
                        <div className="text-xs text-gray-500">{p.referral_code}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{p.team_name || '--'}</td>
                      <td className="px-4 py-3 text-gray-600">{p.point_name || '--'}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{p.contacts}</td>
                      <td className="px-4 py-3 text-right font-medium text-blue-600">{p.registrations}</td>
                      <td className="px-4 py-3 text-right font-medium text-green-600">{p.first_charges}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{p.first_charge_amount.toFixed(0)}</td>
                      <td className="px-4 py-3 text-right">
                        {p.contacts > 0 ? (
                          <span className={p.reg_conversion_rate >= 30 ? 'text-green-600' : p.reg_conversion_rate >= 20 ? 'text-yellow-600' : 'text-red-600'}>
                            {p.reg_conversion_rate}%
                          </span>
                        ) : '--'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {p.registrations > 0 ? (
                          <span className={p.charge_conversion_rate >= 25 ? 'text-green-600' : p.charge_conversion_rate >= 15 ? 'text-yellow-600' : 'text-red-600'}>
                            {p.charge_conversion_rate}%
                            {isWarning && <span className="ml-1">⚠️</span>}
                          </span>
                        ) : '--'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Point Stats */}
      {points.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-red-500" />
              点位概况
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">点位</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">面积</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">人数</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">注册</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">充值</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">金额(TJS)</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">人均注册</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">健康度</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">建议</th>
                </tr>
              </thead>
              <tbody>
                {points.map((pt) => (
                  <tr key={pt.point_id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{pt.point_name}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{getAreaSizeLabel(pt.area_size)}</td>
                    <td className="px-4 py-3 text-right text-gray-900">{pt.staff_count}</td>
                    <td className="px-4 py-3 text-right font-medium text-blue-600">{pt.registrations}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-600">{pt.charges}</td>
                    <td className="px-4 py-3 text-right text-gray-900">{pt.charge_amount.toFixed(0)}</td>
                    <td className="px-4 py-3 text-right text-gray-900">{pt.reg_per_staff}</td>
                    <td className="px-4 py-3 text-center">{getHealthBadge(pt.health)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {pt.health === 'good' && '保持现有投入'}
                      {pt.health === 'fair' && '考虑增派人手'}
                      {pt.health === 'poor' && '考虑撤销或更换'}
                      {pt.health === 'inactive' && '暂无数据'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

interface SummaryCardProps {
  title: string;
  value: number;
  prevValue: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'orange';
  format: 'number' | 'currency';
}

function SummaryCard({ title, value, prevValue, icon, color, format }: SummaryCardProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
  };

  const displayValue = format === 'currency'
    ? `TJS ${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : value.toLocaleString();

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-lg p-6 text-white shadow-lg`}>
      <div className="flex items-center justify-between mb-4">
        <div className="opacity-80">{icon}</div>
        <TrendIndicator current={value} previous={prevValue} />
      </div>
      <h3 className="text-sm font-medium opacity-90">{title}</h3>
      <p className="text-3xl font-bold mt-1">{displayValue}</p>
      <p className="text-xs mt-2 opacity-80">
        {prevValue > 0 ? `上期: ${format === 'currency' ? 'TJS ' : ''}${prevValue.toLocaleString()}` : '暂无对比数据'}
      </p>
    </div>
  );
}
