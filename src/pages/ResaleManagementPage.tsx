import { useState, useEffect } from 'react';
import { Eye, TrendingUp, DollarSign, Package, Search } from 'lucide-react';
import { useSupabase } from '@/contexts/SupabaseContext';
import toast from 'react-hot-toast';

interface Resale {
  id: string;
  prize_id: string;
  seller_id: string;
  price: number;
  original_price: number;
  discount_rate: number;
  status: string;
  created_at: string;
  updated_at: string;
  sold_at: string | null;
  buyer_id: string | null;
  seller?: {
    telegram_username: string;
    first_name: string;
  };
  buyer?: {
    telegram_username: string;
    first_name: string;
  };
  prize?: {
    lottery_id: string;
    lottery?: {
      title: string;
      image_url: string;
    };
  };
}

export default function ResaleManagementPage() {
  const { supabase } = useSupabase();
  const [resales, setResales] = useState<Resale[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'on_sale' | 'sold' | 'cancelled'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    onSale: 0,
    sold: 0,
    totalRevenue: 0,
    avgDiscount: 0,
  });

  useEffect(() => {
    fetchResales();
  }, [filter]);

  const fetchResales = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('resales')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter.toUpperCase());
      }

      const { data, error } = await query;

      if (error) {throw error;}
      
      const resaleData = data || [];
      setResales(resaleData);

      // 计算统计数据
      const total = resaleData.length;
      const onSale = resaleData.filter((r) => r.status === 'ON_SALE').length;
      const sold = resaleData.filter((r) => r.status === 'SOLD').length;
      const totalRevenue = resaleData
        .filter((r) => r.status === 'SOLD')
        .reduce((sum, r) => sum + r.price, 0);
      const avgDiscount = resaleData.length > 0
        ? resaleData.reduce((sum, r) => sum + r.discount_rate, 0) / resaleData.length
        : 0;

      setStats({ total, onSale, sold, totalRevenue, avgDiscount });
    } catch (error: any) {
      toast.error('加载转售列表失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredResales = resales.filter((resale) => {
    if (!searchTerm) {return true;}
    const searchLower = searchTerm.toLowerCase();
    return (
      resale.seller?.telegram_username?.toLowerCase().includes(searchLower) ||
      resale.buyer?.telegram_username?.toLowerCase().includes(searchLower) ||
      resale.lottery?.title?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ON_SALE: { color: 'bg-green-100 text-green-800', text: '在售' },
      SOLD: { color: 'bg-blue-100 text-blue-800', text: '已售出' },
      CANCELLED: { color: 'bg-gray-100 text-gray-800', text: '已取消' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.ON_SALE;
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        {config.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">转售监控</h1>
        <p className="mt-1 text-sm text-gray-500">
          查看和监控用户的中奖商品转售情况(无需审核,用户可直接发布)
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <Package className="w-8 h-8 text-blue-500" />
            <div className="ml-3">
              <div className="text-sm text-gray-500">总转售数</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-green-500" />
            <div className="ml-3">
              <div className="text-sm text-gray-500">在售中</div>
              <div className="text-2xl font-bold text-green-600">{stats.onSale}</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-blue-500" />
            <div className="ml-3">
              <div className="text-sm text-gray-500">已售出</div>
              <div className="text-2xl font-bold text-blue-600">{stats.sold}</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-purple-500" />
            <div className="ml-3">
              <div className="text-sm text-gray-500">总交易额</div>
              <div className="text-2xl font-bold text-purple-600">
                ¥{stats.totalRevenue.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-orange-500" />
            <div className="ml-3">
              <div className="text-sm text-gray-500">平均折扣</div>
              <div className="text-2xl font-bold text-orange-600">
                {(stats.avgDiscount * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 筛选和搜索 */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            全部
          </button>
          <button
            onClick={() => setFilter('on_sale')}
            className={`px-4 py-2 rounded-md ${
              filter === 'on_sale'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            在售中
          </button>
          <button
            onClick={() => setFilter('sold')}
            className={`px-4 py-2 rounded-md ${
              filter === 'sold'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            已售出
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            className={`px-4 py-2 rounded-md ${
              filter === 'cancelled'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            已取消
          </button>
        </div>

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索用户名或商品名称..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>

      {/* 转售列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                商品信息
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                卖家
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                买家
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                原价/转售价
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                折扣
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                状态
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                创建/售出时间
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredResales.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                  暂无转售记录
                </td>
              </tr>
            ) : (
              filteredResales.map((resale) => (
                <tr key={resale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      {resale.lottery?.image_url && (
                        <img
                          src={resale.prize.lottery.image_url}
                          alt=""
                          className="w-12 h-12 rounded-md object-cover mr-3"
                        />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {`夺宝活动 ${resale.lottery_id?.substring(0, 8)}`}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {resale.prize_id.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {resale.seller?.first_name || '未知'}
                    </div>
                    <div className="text-xs text-gray-500">
                      @{resale.seller?.telegram_username || 'unknown'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {resale.buyer ? (
                      <>
                        <div className="text-sm text-gray-900">
                          {resale.buyer.first_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          @{resale.buyer.telegram_username}
                        </div>
                      </>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500 line-through">
                      ¥{resale.original_price.toFixed(2)}
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      ¥{resale.price.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                      -{(resale.discount_rate * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(resale.status)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {new Date(resale.created_at).toLocaleDateString('zh-CN')}
                    </div>
                    {resale.sold_at && (
                      <div className="text-xs text-gray-500">
                        售出: {new Date(resale.sold_at).toLocaleDateString('zh-CN')}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => {
                        // TODO: 查看详情
                        toast.info('查看详情功能待开发');
                      }}
                      className="text-blue-600 hover:text-blue-900"
                      title="查看详情"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
