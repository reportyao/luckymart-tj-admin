import React, { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';

interface PickupStats {
  total_prizes: number;
  pending_claim: number;
  pending_pickup: number;
  picked_up: number;
  expired: number;
  // 分类统计
  lottery_total: number;
  lottery_pending_claim: number;
  lottery_pending_pickup: number;
  lottery_picked_up: number;
  lottery_expired: number;
  groupbuy_total: number;
  groupbuy_pending_claim: number;
  groupbuy_pending_pickup: number;
  groupbuy_picked_up: number;
  groupbuy_expired: number;
}

interface PickupLog {
  id: string;
  prize_id: string;
  order_id: string | null;
  operator_id: string;
  action: string;
  created_at: string;
  notes: string | null;
  source: 'lottery' | 'groupbuy';
  prize: {
    id: string;
    user_id: string;
    lottery: {
      title: string;
      title_i18n: { zh: string; ru: string; tg: string } | null;
    } | null;
    product: {
      name_i18n: { zh: string; ru: string; tg: string } | null;
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
  lottery_count: number;
  groupbuy_count: number;
}

export default function PickupStatsPage() {
  const { supabase } = useSupabase();
  const [stats, setStats] = useState<PickupStats>({
    total_prizes: 0,
    pending_claim: 0,
    pending_pickup: 0,
    picked_up: 0,
    expired: 0,
    lottery_total: 0,
    lottery_pending_claim: 0,
    lottery_pending_pickup: 0,
    lottery_picked_up: 0,
    lottery_expired: 0,
    groupbuy_total: 0,
    groupbuy_pending_claim: 0,
    groupbuy_pending_pickup: 0,
    groupbuy_picked_up: 0,
    groupbuy_expired: 0,
  });
  const [recentLogs, setRecentLogs] = useState<PickupLog[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | 'all'>('7d');
  const [viewMode, setViewMode] = useState<'all' | 'lottery' | 'groupbuy'>('all');

  // 加载统计数据
  const loadStats = async () => {
    setLoading(true);
    try {
      // 1. 获取抽奖奖品统计 (prizes表)
      const { data: prizes, error: prizesError } = await supabase
        .from('prizes')
        .select('pickup_status');

      if (prizesError) {throw prizesError;}

      const lotteryStats = {
        total: prizes?.length || 0,
        pending_claim: prizes?.filter(p => p.pickup_status === 'PENDING_CLAIM' || !p.pickup_status).length || 0,
        pending_pickup: prizes?.filter(p => p.pickup_status === 'PENDING_PICKUP').length || 0,
        picked_up: prizes?.filter(p => p.pickup_status === 'PICKED_UP').length || 0,
        expired: prizes?.filter(p => p.pickup_status === 'EXPIRED').length || 0,
      };

      // 2. 获取拼团结果统计 (group_buy_results表)
      const { data: groupBuyResults, error: groupBuyError } = await supabase
        .from('group_buy_results')
        .select('pickup_status');

      if (groupBuyError) {throw groupBuyError;}

      const groupBuyStats = {
        total: groupBuyResults?.length || 0,
        pending_claim: groupBuyResults?.filter(p => p.pickup_status === 'PENDING_CLAIM' || !p.pickup_status).length || 0,
        pending_pickup: groupBuyResults?.filter(p => p.pickup_status === 'PENDING_PICKUP').length || 0,
        picked_up: groupBuyResults?.filter(p => p.pickup_status === 'PICKED_UP').length || 0,
        expired: groupBuyResults?.filter(p => p.pickup_status === 'EXPIRED').length || 0,
      };

      // 3. 合并统计数据
      const combinedStats: PickupStats = {
        total_prizes: lotteryStats.total + groupBuyStats.total,
        pending_claim: lotteryStats.pending_claim + groupBuyStats.pending_claim,
        pending_pickup: lotteryStats.pending_pickup + groupBuyStats.pending_pickup,
        picked_up: lotteryStats.picked_up + groupBuyStats.picked_up,
        expired: lotteryStats.expired + groupBuyStats.expired,
        lottery_total: lotteryStats.total,
        lottery_pending_claim: lotteryStats.pending_claim,
        lottery_pending_pickup: lotteryStats.pending_pickup,
        lottery_picked_up: lotteryStats.picked_up,
        lottery_expired: lotteryStats.expired,
        groupbuy_total: groupBuyStats.total,
        groupbuy_pending_claim: groupBuyStats.pending_claim,
        groupbuy_pending_pickup: groupBuyStats.pending_pickup,
        groupbuy_picked_up: groupBuyStats.picked_up,
        groupbuy_expired: groupBuyStats.expired,
      };
      setStats(combinedStats);

      // 4. 获取最近核销记录 - 从pickup_logs表
      const { data: logs, error: logsError } = await supabase
        .from('pickup_logs')
        .select(`
          id,
          prize_id,
          order_id,
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
          let prize = null;
          let user = null;
          let source: 'lottery' | 'groupbuy' = 'lottery';

          // 先尝试从prizes表查询
          if (log.prize_id) {
            const { data: prizeData } = await supabase
              .from('prizes')
              .select(`
                id,
                user_id,
                lottery:lotteries(title, title_i18n)
              `)
              .eq('id', log.prize_id)
              .single();

            if (prizeData) {
              prize = prizeData;
              source = 'lottery';
            }
          }

          // 如果prizes表没有找到，尝试从group_buy_results表查询
          if (!prize && log.order_id) {
            const { data: groupBuyData } = await supabase
              .from('group_buy_results')
              .select(`
                id,
                user_id,
                product:group_buy_products(name_i18n)
              `)
              .eq('id', log.order_id)
              .single();

            if (groupBuyData) {
              prize = {
                id: groupBuyData.id,
                user_id: groupBuyData.user_id,
                lottery: null,
                product: groupBuyData.product,
              };
              source = 'groupbuy';
            }
          }

          // 获取用户信息
          const userId = prize?.user_id;
          if (userId) {
            const { data: userData } = await supabase
              .from('users')
              .select('username, first_name')
              .eq('id', userId)
              .single();
            user = userData;
          }

          return {
            ...log,
            source,
            prize: prize ? { ...prize, user } : null,
          };
        })
      );

      setRecentLogs(logsWithDetails);

      // 5. 获取每日核销统计 - 基于prizes和group_buy_results的picked_up_at字段
      const daysAgo = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 365;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // 从prizes表获取已提货记录
      const { data: lotteryPickups } = await supabase
        .from('prizes')
        .select('picked_up_at')
        .eq('pickup_status', 'PICKED_UP')
        .gte('picked_up_at', startDate.toISOString());

      // 从group_buy_results表获取已提货记录
      const { data: groupBuyPickups } = await supabase
        .from('group_buy_results')
        .select('picked_up_at')
        .eq('pickup_status', 'PICKED_UP')
        .gte('picked_up_at', startDate.toISOString());

      // 按日期分组统计
      const dailyMap: { [key: string]: { lottery: number; groupbuy: number } } = {};
      
      (lotteryPickups || []).forEach((item: any) => {
        if (item.picked_up_at) {
          const date = new Date(item.picked_up_at).toISOString().split('T')[0];
          if (!dailyMap[date]) {
            dailyMap[date] = { lottery: 0, groupbuy: 0 };
          }
          dailyMap[date].lottery += 1;
        }
      });

      (groupBuyPickups || []).forEach((item: any) => {
        if (item.picked_up_at) {
          const date = new Date(item.picked_up_at).toISOString().split('T')[0];
          if (!dailyMap[date]) {
            dailyMap[date] = { lottery: 0, groupbuy: 0 };
          }
          dailyMap[date].groupbuy += 1;
        }
      });

      const dailyStatsArray = Object.entries(dailyMap)
        .map(([date, counts]) => ({ 
          date, 
          count: counts.lottery + counts.groupbuy,
          lottery_count: counts.lottery,
          groupbuy_count: counts.groupbuy,
        }))
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
  const getLocalizedTitle = (log: PickupLog) => {
    if (!log.prize) {return '未知商品';}
    
    if (log.source === 'lottery' && log.prize.lottery) {
      if (log.prize.lottery.title_i18n?.zh) {return log.prize.lottery.title_i18n.zh;}
      return log.prize.lottery.title || '未知商品';
    }
    
    if (log.source === 'groupbuy' && log.prize.product) {
      if (log.prize.product.name_i18n?.zh) {return log.prize.product.name_i18n.zh;}
    }
    
    return '未知商品';
  };

  // 根据视图模式获取显示的统计数据
  const getDisplayStats = () => {
    if (viewMode === 'lottery') {
      return {
        total: stats.lottery_total,
        pending_claim: stats.lottery_pending_claim,
        pending_pickup: stats.lottery_pending_pickup,
        picked_up: stats.lottery_picked_up,
        expired: stats.lottery_expired,
      };
    }
    if (viewMode === 'groupbuy') {
      return {
        total: stats.groupbuy_total,
        pending_claim: stats.groupbuy_pending_claim,
        pending_pickup: stats.groupbuy_pending_pickup,
        picked_up: stats.groupbuy_picked_up,
        expired: stats.groupbuy_expired,
      };
    }
    return {
      total: stats.total_prizes,
      pending_claim: stats.pending_claim,
      pending_pickup: stats.pending_pickup,
      picked_up: stats.picked_up,
      expired: stats.expired,
    };
  };

  const displayStats = getDisplayStats();

  // 根据视图模式过滤日志
  const filteredLogs = viewMode === 'all' 
    ? recentLogs 
    : recentLogs.filter(log => log.source === viewMode);

  // 根据视图模式获取每日统计
  const getDisplayDailyStats = () => {
    return dailyStats.map(day => ({
      date: day.date,
      count: viewMode === 'lottery' ? day.lottery_count : 
             viewMode === 'groupbuy' ? day.groupbuy_count : 
             day.count,
    }));
  };

  const displayDailyStats = getDisplayDailyStats();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">核销统计报表</h1>
        <div className="flex space-x-2">
          <button
            onClick={loadStats}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            刷新数据
          </button>
        </div>
      </div>

      {/* 视图切换 */}
      <div className="mb-6 flex space-x-2">
        <button
          onClick={() => setViewMode('all')}
          className={`px-4 py-2 rounded-lg transition ${
            viewMode === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          全部
        </button>
        <button
          onClick={() => setViewMode('lottery')}
          className={`px-4 py-2 rounded-lg transition ${
            viewMode === 'lottery'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          抽奖 ({stats.lottery_total})
        </button>
        <button
          onClick={() => setViewMode('groupbuy')}
          className={`px-4 py-2 rounded-lg transition ${
            viewMode === 'groupbuy'
              ? 'bg-pink-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          拼团 ({stats.groupbuy_total})
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
              <div className="text-sm text-gray-500 mb-1">
                {viewMode === 'all' ? '总奖品数' : viewMode === 'lottery' ? '抽奖奖品数' : '拼团奖品数'}
              </div>
              <div className="text-3xl font-bold text-gray-900">{displayStats.total}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500 mb-1">待确认领取</div>
              <div className="text-3xl font-bold text-yellow-600">{displayStats.pending_claim}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500 mb-1">待提货</div>
              <div className="text-3xl font-bold text-blue-600">{displayStats.pending_pickup}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500 mb-1">已提货</div>
              <div className="text-3xl font-bold text-green-600">{displayStats.picked_up}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500 mb-1">已过期</div>
              <div className="text-3xl font-bold text-red-600">{displayStats.expired}</div>
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
                    width: `${displayStats.total > 0 ? (displayStats.picked_up / displayStats.total) * 100 : 0}%`,
                  }}
                ></div>
              </div>
              <div className="ml-4 text-lg font-semibold">
                {displayStats.total > 0
                  ? ((displayStats.picked_up / displayStats.total) * 100).toFixed(1)
                  : 0}
                %
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              已提货 {displayStats.picked_up} / 总计 {displayStats.total}
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

            {displayDailyStats.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                暂无核销记录
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="flex items-end space-x-2 h-40 min-w-max">
                  {displayDailyStats.map((day) => {
                    const maxCount = Math.max(...displayDailyStats.map(d => d.count), 1);
                    const height = (day.count / maxCount) * 100;
                    return (
                      <div key={day.date} className="flex flex-col items-center">
                        <div className="text-xs text-gray-500 mb-1">{day.count}</div>
                        <div
                          className={`w-8 rounded-t transition-all duration-300 ${
                            viewMode === 'lottery' ? 'bg-purple-500' :
                            viewMode === 'groupbuy' ? 'bg-pink-500' :
                            'bg-blue-500'
                          }`}
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

            {filteredLogs.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                暂无核销记录
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      类型
                    </th>
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
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          log.source === 'lottery' 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-pink-100 text-pink-700'
                        }`}>
                          {log.source === 'lottery' ? '抽奖' : '拼团'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getLocalizedTitle(log)}
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
