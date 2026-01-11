import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface PickupStats {
  total_prizes: number;
  pending_claim: number;
  pending_pickup: number;
  picked_up: number;
  expired: number;
}

interface PickupLog {
  id: string;
  prize_id: string;
  operator_id: string;
  action: string;
  created_at: string;
  notes: string | null;
  prize: {
    id: string;
    user_id: string;
    lottery: {
      title: string;
      title_i18n: { zh: string; ru: string; tg: string } | null;
    } | null;
    user: {
      username: string;
      first_name: string;
    } | null;
  } | null;
  pickup_point: {
    name: string;
  } | null;
}

interface DailyStats {
  date: string;
  count: number;
}

export default function PickupStatsPage() {
  const [stats, setStats] = useState<PickupStats>({
    total_prizes: 0,
    pending_claim: 0,
    pending_pickup: 0,
    picked_up: 0,
    expired: 0,
  });
  const [recentLogs, setRecentLogs] = useState<PickupLog[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | 'all'>('7d');

  // 加载统计数据
  const loadStats = async () => {
    setLoading(true);
    try {
      // 获取总体统计
      const { data: prizes, error: prizesError } = await supabase
        .from('prizes')
        .select('pickup_status');

      if (prizesError) {throw prizesError;}

      const statsData: PickupStats = {
        total_prizes: prizes?.length || 0,
        pending_claim: prizes?.filter(p => p.pickup_status === 'PENDING_CLAIM' || !p.pickup_status).length || 0,
        pending_pickup: prizes?.filter(p => p.pickup_status === 'PENDING_PICKUP').length || 0,
        picked_up: prizes?.filter(p => p.pickup_status === 'PICKED_UP').length || 0,
        expired: prizes?.filter(p => p.pickup_status === 'EXPIRED').length || 0,
      };
      setStats(statsData);

      // 获取最近核销记录
      const { data: logs, error: logsError } = await supabase
        .from('pickup_logs')
        .select(`
          id,
          prize_id,
          operator_id,
          action,
          created_at,
          notes,
          pickup_point:pickup_points(name)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (logsError) {throw logsError;}

      // 为每条记录获取奖品和用户信息
      const logsWithDetails = await Promise.all(
        (logs || []).map(async (log: any) => {
          const { data: prize } = await supabase
            .from('prizes')
            .select(`
              id,
              user_id,
              lottery:lotteries(title, title_i18n)
            `)
            .eq('id', log.prize_id)
            .single();

          let user = null;
          if (prize?.user_id) {
            const { data: userData } = await supabase
              .from('users')
              .select('username, first_name')
              .eq('id', prize.user_id)
              .single();
            user = userData;
          }

          return {
            ...log,
            prize: prize ? { ...prize, user } : null,
          };
        })
      );

      setRecentLogs(logsWithDetails);

      // 获取每日核销统计
      const daysAgo = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 365;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { data: dailyData, error: dailyError } = await supabase
        .from('pickup_logs')
        .select('created_at')
        .gte('created_at', startDate.toISOString());

      if (dailyError) {throw dailyError;}

      // 按日期分组统计
      const dailyMap: { [key: string]: number } = {};
      (dailyData || []).forEach((log: any) => {
        const date = new Date(log.created_at).toISOString().split('T')[0];
        dailyMap[date] = (dailyMap[date] || 0) + 1;
      });

      const dailyStatsArray = Object.entries(dailyMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setDailyStats(dailyStatsArray);
    } catch (error) {
      console.error('加载统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [dateRange]);

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 获取本地化标题
  const getLocalizedTitle = (lottery: any) => {
    if (!lottery) {return '未知商品';}
    if (lottery.title_i18n?.zh) {return lottery.title_i18n.zh;}
    return lottery.title || '未知商品';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">核销统计报表</h1>
        <button
          onClick={loadStats}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
        >
          刷新数据
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-500">加载中...</p>
        </div>
      ) : (
        <>
          {/* 总体统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500 mb-1">总奖品数</div>
              <div className="text-3xl font-bold text-gray-900">{stats.total_prizes}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500 mb-1">待确认领取</div>
              <div className="text-3xl font-bold text-yellow-600">{stats.pending_claim}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500 mb-1">待提货</div>
              <div className="text-3xl font-bold text-blue-600">{stats.pending_pickup}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500 mb-1">已提货</div>
              <div className="text-3xl font-bold text-green-600">{stats.picked_up}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500 mb-1">已过期</div>
              <div className="text-3xl font-bold text-red-600">{stats.expired}</div>
            </div>
          </div>

          {/* 提货率 */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">提货率统计</h2>
            <div className="flex items-center">
              <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-green-500 h-full transition-all duration-500"
                  style={{
                    width: `${stats.total_prizes > 0 ? (stats.picked_up / stats.total_prizes) * 100 : 0}%`,
                  }}
                ></div>
              </div>
              <div className="ml-4 text-lg font-semibold">
                {stats.total_prizes > 0
                  ? ((stats.picked_up / stats.total_prizes) * 100).toFixed(1)
                  : 0}
                %
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              已提货 {stats.picked_up} / 总计 {stats.total_prizes}
            </div>
          </div>

          {/* 每日核销趋势 */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">每日核销趋势</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setDateRange('7d')}
                  className={`px-3 py-1 rounded ${
                    dateRange === '7d'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  近7天
                </button>
                <button
                  onClick={() => setDateRange('30d')}
                  className={`px-3 py-1 rounded ${
                    dateRange === '30d'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  近30天
                </button>
                <button
                  onClick={() => setDateRange('all')}
                  className={`px-3 py-1 rounded ${
                    dateRange === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  全部
                </button>
              </div>
            </div>

            {dailyStats.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                暂无核销记录
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="flex items-end space-x-2 h-40 min-w-max">
                  {dailyStats.map((day) => {
                    const maxCount = Math.max(...dailyStats.map(d => d.count), 1);
                    const height = (day.count / maxCount) * 100;
                    return (
                      <div key={day.date} className="flex flex-col items-center">
                        <div className="text-xs text-gray-500 mb-1">{day.count}</div>
                        <div
                          className="w-8 bg-blue-500 rounded-t transition-all duration-300"
                          style={{ height: `${Math.max(height, 5)}%` }}
                        ></div>
                        <div className="text-xs text-gray-500 mt-1 transform -rotate-45 origin-top-left w-16">
                          {day.date.slice(5)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 最近核销记录 */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">最近核销记录</h2>
            </div>

            {recentLogs.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                暂无核销记录
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      商品
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      用户
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      自提点
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作人
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      时间
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getLocalizedTitle(log.prize?.lottery)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.prize?.user?.first_name || log.prize?.user?.username || '未知用户'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.pickup_point?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.operator_id || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.action || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(log.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
