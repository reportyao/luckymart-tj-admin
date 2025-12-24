import React, { useState, useEffect } from 'react';
import { FileText, Download, Eye, Calendar } from 'lucide-react';
import { useSupabase } from '../contexts/SupabaseContext';

interface DrawLog {
  id: string;
  lottery_id: string;
  algorithm_name: string;
  input_data: any;
  calculation_steps: any;
  winning_number: number;
  winner_user_id: string | null;
  winner_order_id: string | null;
  vrf_seed: string | null;
  vrf_proof: string | null;
  draw_time: string;
  lottery?: {
    name_i18n: any;
  };
  winner?: {
    username: string;
    telegram_id: string;
  };
}

export default function DrawLogsPage() {
  const { supabase } = useSupabase();
  const [logs, setLogs] = useState<DrawLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<DrawLog | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    loadLogs();
  }, [currentPage]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      // 先查询draw_logs
      const { data: logsData, error, count } = await supabase
        .from('draw_logs')
        .select('*', { count: 'exact' })
        .order('draw_time', { ascending: false })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      if (error) {throw error;}
      if (!logsData || logsData.length === 0) {
        setLogs([]);
        setTotalCount(0);
        return;
      }

      // 手动查询关联数据
      const lotteryIds = [...new Set(logsData.map(log => log.lottery_id))];
      const userIds = [...new Set(logsData.map(log => log.winner_user_id).filter(Boolean))];

      const { data: lotteries } = await supabase
        .from('lotteries')
        .select('id, name_i18n')
        .in('id', lotteryIds);

      const { data: users } = await supabase
        .from('users')
        .select('id, username, telegram_id')
        .in('id', userIds);

      // 组装数据
      const data = logsData.map(log => ({
        ...log,
        lottery: lotteries?.find(l => l.id === log.lottery_id),
        winner: users?.find(u => u.id === log.winner_user_id),
      }));

      setLogs(data || []);
      setTotalCount(count || 0);
    } catch (error: any) {
      console.error('加载开奖记录失败:', error);
      alert('加载失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadVerificationData = (log: DrawLog) => {
    const verificationData = {
      lottery_id: log.lottery_id,
      algorithm: log.algorithm_name,
      draw_time: log.draw_time,
      input_data: log.input_data,
      calculation_steps: log.calculation_steps,
      winning_number: log.winning_number,
      winner_user_id: log.winner_user_id,
      vrf_seed: log.vrf_seed,
      vrf_proof: log.vrf_proof
    };

    const blob = new Blob([JSON.stringify(verificationData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `draw_verification_${log.id}.json`;
    link.click();
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-7 h-7" />
          开奖记录
        </h1>
        <p className="text-gray-600 mt-1">查看所有夺宝活动的开奖历史和验证数据</p>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">开奖时间</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">活动名称</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">算法</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">中奖号码</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">中奖用户</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-900">{new Date(log.draw_time).toLocaleDateString('zh-CN')}</div>
                        <div className="text-xs text-gray-500">{new Date(log.draw_time).toLocaleTimeString('zh-CN')}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900">
                      {log.lottery?.name_i18n?.zh || log.lottery_id}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {log.algorithm_name}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-lg font-bold text-blue-600">
                      #{String(log.winning_number).padStart(7, '0')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {log.winner ? (
                      <div>
                        <div className="text-sm font-medium text-gray-900">{log.winner.username}</div>
                        <div className="text-xs text-gray-500">{log.winner.telegram_id}</div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedLog(log);
                          setShowDetailModal(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => downloadVerificationData(log)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded"
                        title="下载验证数据"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              共 {totalCount} 条记录，第 {currentPage} / {totalPages} 页
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                上一页
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 详情模态框 */}
      {showDetailModal && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold">开奖验证详情</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-semibold mb-2">基本信息</h3>
                <div className="bg-gray-50 p-4 rounded space-y-2 text-sm">
                  <p><span className="font-medium">开奖时间:</span> {new Date(selectedLog.draw_time).toLocaleString('zh-CN')}</p>
                  <p><span className="font-medium">算法:</span> {selectedLog.algorithm_name}</p>
                  <p><span className="font-medium">中奖号码:</span> <span className="text-lg font-bold text-blue-600">#{String(selectedLog.winning_number).padStart(7, '0')}</span></p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">输入数据</h3>
                <pre className="bg-gray-50 p-4 rounded text-xs overflow-x-auto">
                  {JSON.stringify(selectedLog.input_data, null, 2)}
                </pre>
              </div>

              {selectedLog.calculation_steps && (
                <div>
                  <h3 className="font-semibold mb-2">计算步骤</h3>
                  <pre className="bg-gray-50 p-4 rounded text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.calculation_steps, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.vrf_seed && (
                <div>
                  <h3 className="font-semibold mb-2">VRF验证</h3>
                  <div className="bg-gray-50 p-4 rounded space-y-2 text-xs">
                    <p><span className="font-medium">Seed:</span> {selectedLog.vrf_seed}</p>
                    <p><span className="font-medium">Proof:</span> {selectedLog.vrf_proof}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-8 text-gray-500">
          加载中...
        </div>
      )}

      {!loading && logs.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>暂无开奖记录</p>
        </div>
      )}
    </div>
  );
}
