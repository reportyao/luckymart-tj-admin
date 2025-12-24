import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Users, Clock, Trophy, RefreshCw } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://owyitxwxmxwbkqgzffdw.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93eWl0eHd4bXh3YmtxZ3pmZmR3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQyMzg1MywiZXhwIjoyMDc3OTk5ODUzfQ.Yqu0OluUMtVC73H_bHC6nCqEtjllzhz2HfltbffF_HA';
const supabase = createClient(supabaseUrl, supabaseKey);

interface GroupBuySession {
  id: string;
  session_code: string;
  product_id: string;
  current_participants: number;
  max_participants: number;
  status: string;
  created_at: string;
  expires_at: string;
  winner_id: string | null;
  product: {
    title: { zh: string; ru: string; tg: string };
    image_url: string;
    price_per_person: number;
  };
  orders: Array<{
    id: string;
    user_id: string;
    username: string;
    amount: number;
    created_at: string;
  }>;
}

export default function GroupBuySessionManagementPage() {
  const [sessions, setSessions] = useState<GroupBuySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'success' | 'timeout'>('active');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    success: 0,
    timeout: 0,
  });

  useEffect(() => {
    fetchSessions();
    fetchStats();
  }, [filter]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('group_buy_sessions')
        .select(`
          *,
          product:group_buy_products(title, image_url, price_per_person),
          orders:group_buy_orders(id, user_id, username, amount, created_at)
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter.toUpperCase());
      }

      const { data, error } = await query;

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      alert('获取拼团会话失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('group_buy_sessions')
        .select('status');

      if (error) throw error;

      const stats = {
        total: data.length,
        active: data.filter((s) => s.status === 'ACTIVE').length,
        success: data.filter((s) => s.status === 'SUCCESS').length,
        timeout: data.filter((s) => s.status === 'TIMEOUT').length,
      };

      setStats(stats);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      ACTIVE: { label: '进行中', className: 'bg-green-100 text-green-700' },
      SUCCESS: { label: '已完成', className: 'bg-blue-100 text-blue-700' },
      TIMEOUT: { label: '已超时', className: 'bg-gray-100 text-gray-700' },
    };

    const config = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-700' };

    return (
      <span className={`px-2 py-1 rounded text-xs font-bold ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return '已过期';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}小时${minutes}分钟`;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">拼团会话管理</h1>
        <button
          onClick={() => {
            fetchSessions();
            fetchStats();
          }}
          className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
        >
          <RefreshCw className="w-5 h-5" />
          刷新
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">总会话数</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4">
          <div className="text-sm text-green-600 mb-1">进行中</div>
          <div className="text-2xl font-bold text-green-700">{stats.active}</div>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-4">
          <div className="text-sm text-blue-600 mb-1">已完成</div>
          <div className="text-2xl font-bold text-blue-700">{stats.success}</div>
        </div>
        <div className="bg-gray-50 rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">已超时</div>
          <div className="text-2xl font-bold text-gray-700">{stats.timeout}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'all', label: '全部' },
          { key: 'active', label: '进行中' },
          { key: 'success', label: '已完成' },
          { key: 'timeout', label: '已超时' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === tab.key
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sessions List */}
      {loading ? (
        <div className="text-center py-12">加载中...</div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">暂无拼团会话</div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <div key={session.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex gap-4">
                {/* Product Image */}
                <img
                  src={session.product.image_url}
                  alt={session.product.title.zh}
                  className="w-24 h-24 object-cover rounded-lg"
                />

                {/* Session Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-lg">{session.product.title.zh}</h3>
                      <p className="text-sm text-gray-600">会话编号: {session.session_code}</p>
                    </div>
                    {getStatusBadge(session.status)}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <div className="text-xs text-gray-600 mb-1">参与人数</div>
                      <div className="flex items-center gap-1 font-bold">
                        <Users className="w-4 h-4" />
                        {session.current_participants}/{session.max_participants}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">人均价格</div>
                      <div className="font-bold text-orange-600">
                        ₽{session.product.price_per_person}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">创建时间</div>
                      <div className="text-sm">
                        {new Date(session.created_at).toLocaleString('zh-CN')}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">剩余时间</div>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="w-4 h-4" />
                        {getTimeRemaining(session.expires_at)}
                      </div>
                    </div>
                  </div>

                  {/* Participants */}
                  {session.orders && session.orders.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-2">参与者:</div>
                      <div className="flex flex-wrap gap-2">
                        {session.orders.map((order, index) => (
                          <div
                            key={order.id}
                            className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                              session.winner_id === order.user_id
                                ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-400'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {session.winner_id === order.user_id && (
                              <Trophy className="w-4 h-4" />
                            )}
                            <span className="font-medium">{index + 1}.</span>
                            <span>{order.username}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
