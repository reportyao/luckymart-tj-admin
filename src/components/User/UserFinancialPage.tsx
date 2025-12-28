import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  DocumentArrowDownIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { useSupabase } from '../../contexts/SupabaseContext';

interface FinancialSummary {
  luckyCoinsBalance: number;
  cashBalance: number;
  frozenBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalSpending: number;
  totalIncome: number;
  level1Commission: number;
  level2Commission: number;
  level3Commission: number;
  totalCommission: number;
  periodStats: {
    period: string;
    deposits: number;
    withdrawals: number;
    spending: number;
    income: number;
    netChange: number;
  };
}

interface Transaction {
  id: string;
  type: string;
  typeName: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  status: string;
  description: string;
  related_order_id?: string;
  related_lottery_id?: string;
  walletType: string;
  currency: string;
  created_at: string;
  isIncome: boolean;
}

const UserFinancialPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { supabase } = useSupabase();
  
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    startDate: '',
    endDate: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchFinancialData();
    }
  }, [userId, period, page, filters]);

  const fetchFinancialData = async () => {
    setLoading(true);
    try {
      // 获取汇总数据
      const summaryUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-user-financial?user_id=${userId}&action=summary&period=${period}`;
      const summaryResponse = await fetch(summaryUrl, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      const summaryData = await summaryResponse.json();
      if (summaryData.success) {
        setSummary(summaryData.data);
      }

      // 获取交易记录
      const transactionsUrl = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-user-financial`);
      transactionsUrl.searchParams.set('user_id', userId!);
      transactionsUrl.searchParams.set('action', 'transactions');
      transactionsUrl.searchParams.set('page', page.toString());
      transactionsUrl.searchParams.set('pageSize', '20');
      if (filters.type) transactionsUrl.searchParams.set('type', filters.type);
      if (filters.status) transactionsUrl.searchParams.set('status', filters.status);
      if (filters.startDate) transactionsUrl.searchParams.set('startDate', filters.startDate);
      if (filters.endDate) transactionsUrl.searchParams.set('endDate', filters.endDate);

      const transactionsResponse = await fetch(transactionsUrl.toString(), {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      const transactionsData = await transactionsResponse.json();
      if (transactionsData.success) {
        setTransactions(transactionsData.data.transactions);
        setTotalPages(transactionsData.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const exportUrl = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-user-financial`);
      exportUrl.searchParams.set('user_id', userId!);
      exportUrl.searchParams.set('action', 'export');
      if (filters.type) exportUrl.searchParams.set('type', filters.type);
      if (filters.status) exportUrl.searchParams.set('status', filters.status);
      if (filters.startDate) exportUrl.searchParams.set('startDate', filters.startDate);
      if (filters.endDate) exportUrl.searchParams.set('endDate', filters.endDate);

      const response = await fetch(exportUrl.toString(), {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user_${userId}_transactions_${new Date().toISOString()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/users')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">用户财务数据</h1>
            <p className="text-sm text-gray-500">用户ID: {userId}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FunnelIcon className="w-5 h-5" />
            <span>筛选</span>
          </button>
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <DocumentArrowDownIcon className="w-5 h-5" />
            <span>导出</span>
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex space-x-2 mb-6">
        {['today', 'week', 'month', 'all'].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              period === p
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {p === 'today' && '今日'}
            {p === 'week' && '本周'}
            {p === 'month' && '本月'}
            {p === 'all' && '全部'}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Balance Cards */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm opacity-90">幸运币余额</span>
              <BanknotesIcon className="w-6 h-6 opacity-80" />
            </div>
            <div className="text-3xl font-bold">{summary.luckyCoinsBalance.toFixed(2)}</div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm opacity-90">现金余额</span>
              <CurrencyDollarIcon className="w-6 h-6 opacity-80" />
            </div>
            <div className="text-3xl font-bold">{summary.cashBalance.toFixed(2)}</div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm opacity-90">冻结金额</span>
              <BanknotesIcon className="w-6 h-6 opacity-80" />
            </div>
            <div className="text-3xl font-bold">{summary.frozenBalance.toFixed(2)}</div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm opacity-90">总佣金</span>
              <ArrowTrendingUpIcon className="w-6 h-6 opacity-80" />
            </div>
            <div className="text-3xl font-bold">{summary.totalCommission.toFixed(2)}</div>
          </div>

          {/* Statistics Cards */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="text-sm text-gray-500 mb-1">累计充值</div>
            <div className="text-2xl font-bold text-gray-900">{summary.totalDeposits.toFixed(2)}</div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="text-sm text-gray-500 mb-1">累计提现</div>
            <div className="text-2xl font-bold text-gray-900">{summary.totalWithdrawals.toFixed(2)}</div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="text-sm text-gray-500 mb-1">累计消费</div>
            <div className="text-2xl font-bold text-gray-900">{summary.totalSpending.toFixed(2)}</div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="text-sm text-gray-500 mb-1">累计收入</div>
            <div className="text-2xl font-bold text-gray-900">{summary.totalIncome.toFixed(2)}</div>
          </div>

          {/* Commission Breakdown */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="text-sm text-gray-500 mb-1">一级佣金</div>
            <div className="text-2xl font-bold text-gray-900">{summary.level1Commission.toFixed(2)}</div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="text-sm text-gray-500 mb-1">二级佣金</div>
            <div className="text-2xl font-bold text-gray-900">{summary.level2Commission.toFixed(2)}</div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="text-sm text-gray-500 mb-1">三级佣金</div>
            <div className="text-2xl font-bold text-gray-900">{summary.level3Commission.toFixed(2)}</div>
          </div>

          {/* Period Stats */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="text-sm text-gray-500 mb-1">期间净变化</div>
            <div className={`text-2xl font-bold ${summary.periodStats.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {summary.periodStats.netChange >= 0 ? '+' : ''}{summary.periodStats.netChange.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">交易类型</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全部</option>
                <option value="DEPOSIT">充值</option>
                <option value="WITHDRAWAL">提现</option>
                <option value="LOTTERY_PURCHASE">夺宝消费</option>
                <option value="GROUP_BUY_PURCHASE">拼团消费</option>
                <option value="REFERRAL_BONUS">邀请奖励</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">状态</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全部</option>
                <option value="COMPLETED">已完成</option>
                <option value="PENDING">待处理</option>
                <option value="FAILED">失败</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">开始日期</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">结束日期</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={() => setFilters({ type: '', status: '', startDate: '', endDate: '' })}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              重置
            </button>
            <button
              onClick={() => setPage(1)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              应用
            </button>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">类型</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">金额</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">余额变化</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">钱包类型</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">描述</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(transaction.created_at).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {transaction.typeName}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={transaction.isIncome ? 'text-green-600' : 'text-red-600'}>
                      {transaction.isIncome ? '+' : '-'}{Math.abs(transaction.amount).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.balance_before.toFixed(2)} → {transaction.balance_after.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      transaction.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                      transaction.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {transaction.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.walletType}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {transaction.description || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              第 {page} 页,共 {totalPages} 页
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserFinancialPage;
