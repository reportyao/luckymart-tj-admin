import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '@/contexts/SupabaseContext';
import { Tables, Enums } from '@/types/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';
import { EmptyState } from '../EmptyState';


type LotteryStatus = Enums<'LotteryStatus'>;

const getStatusColor = (status: LotteryStatus) => {
  switch (status) {
    case 'ACTIVE':
      return 'bg-green-100 text-green-800';
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'COMPLETED':
      return 'bg-blue-100 text-blue-800';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getLocalizedText = (jsonb: any, language: string = 'zh', fallbackLanguage: string = 'en'): string => {
  if (!jsonb || typeof jsonb !== 'object') {return '';}
  if (jsonb[language]) {return jsonb[language];}
  if (jsonb[fallbackLanguage]) {return jsonb[fallbackLanguage];}
  const firstValue = Object.values(jsonb).find(value => typeof value === 'string' && value.trim() !== '');
  return firstValue as string || '';
};

export const LotteryListPage: React.FC = () => {
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const [lotteries, setLotteries] = useState<Tables<'lotteries'>[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 10; // 每页显示 10 条
  const [isLoading, setIsLoading] = useState(true);

  const fetchLotteries = useCallback(async () => {
    try {
      setIsLoading(true);
      const from = (page - 1) * LIMIT;
      const to = from + LIMIT - 1;

      const { data, error } = await supabase
        .from('lotteries')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {throw error;}

      setLotteries(data || []);
      setHasMore((data || []).length === LIMIT);
    } catch (error: any) {
      toast.error(`加载积分商城列表失败: ${error.message}`);
      console.error('Error loading lotteries:', error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, page]);

  useEffect(() => {
    fetchLotteries();
  }, [fetchLotteries]);

  const handleDraw = async (id: string) => {
    if (!window.confirm('确定要立即开奖吗？开奖后将无法修改。')) {return;}

    try {
      // 假设存在一个 Supabase RPC 或 Edge Function 来执行开奖逻辑
      const { data, error } = await supabase.rpc('draw_lottery', { p_lottery_id: id });

      if (error) {throw error;}

      toast.success(`积分商城 ${id} 开奖成功! 中奖号码: ${(data as any).winning_number}`);
      fetchLotteries(); // 刷新列表
    } catch (error: any) {
      toast.error(`开奖失败: ${error.message}`);
      console.error('Error drawing lottery:', error);
    }
  };

  const handleViewResult = (id: string) => {
    // 在管理后台，我们跳转到编辑页面，并在编辑页面显示结果
    navigate(`/lotteries/${id}`);
  };

  // 生成期号：使用复杂算法避免规律被发现
  const generatePeriod = (): string => {
    const now = Date.now();
    // 使用时间戳的后8位 + 随机4位数
    const timePart = (now % 100000000).toString(36).toUpperCase();
    const randomPart = Math.floor(Math.random() * 46656).toString(36).toUpperCase().padStart(3, '0');
    // 计算校验位（防止伪造）
    const checksum = ((now + Math.floor(Math.random() * 1000)) % 36).toString(36).toUpperCase();
    return `LM${timePart}${randomPart}${checksum}`;
  };

  const handleCopy = async (id: string) => {
    if (!window.confirm('确定要复制这个积分商城吗？')) {return;}

    try {
      // 获取原积分商城数据
      const { data: originalLottery, error: fetchError } = await supabase
        .from('lotteries')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {throw fetchError;}

      // 生成新期号（使用与创建时相同的算法）
      const newPeriod = generatePeriod();

      // 计算新的开始和结束时间（保持原有时长，从现在开始）
      const now = new Date();
      const originalDuration = new Date(originalLottery.end_time).getTime() - new Date(originalLottery.start_time).getTime();
      const newStartTime = now.toISOString();
      const newEndTime = new Date(now.getTime() + originalDuration).toISOString();
      
      // 复制积分商城数据（重置所有状态相关字段）
      const newLottery = {
        ...originalLottery,
        id: undefined, // 让数据库生成新 ID
        period: newPeriod,
        status: 'ACTIVE' as LotteryStatus,
        sold_tickets: 0,
        winning_ticket_number: null,
        winning_user_id: null,
        draw_time: null,
        actual_draw_time: null,
        start_time: newStartTime,
        end_time: newEndTime,
        vrf_seed: null,
        vrf_proof: null,
        vrf_timestamp: null,
        winning_numbers: null,
        draw_algorithm_data: null,
        created_at: undefined,
        updated_at: undefined
      };

      const { error: insertError } = await supabase
        .from('lotteries')
        .insert(newLottery);

      if (insertError) {throw insertError;}

      toast.success(`积分商城复制成功! 新期号: ${newPeriod}`);
      fetchLotteries(); // 刷新列表
    } catch (error: any) {
      toast.error(`复制失败: ${error.message}`);
      console.error('Error copying lottery:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这个积分商城吗？')) {return;}

    try {
      const { error } = await supabase
        .from('lotteries')
        .delete()
        .eq('id', id);

      if (error) {throw error;}

      toast.success('积分商城删除成功!');
      fetchLotteries(); // 刷新列表
    } catch (error: any) {
      toast.error(`删除失败: ${error.message}`);
      console.error('Error deleting lottery:', error);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold">积分商城管理</CardTitle>
        <Button onClick={() => navigate('/lotteries/new')}>
          创建新积分商城
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-10">加载中...</div>
        ) : lotteries.length === 0 ? (
          <EmptyState title="暂无积分商城" message="当前没有积分商城活动，请点击上方按钮创建。" action={<Button onClick={() => navigate('/lotteries/new')}>创建新积分商城</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>期号</TableHead>
                  <TableHead>标题 (中文)</TableHead>
                  <TableHead>单价</TableHead>
                  <TableHead>总票数/已售</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>开始时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lotteries.map((lottery) => (
                  <TableRow key={lottery.id}>
                    <TableCell className="font-medium">{lottery.period}</TableCell>
                    <TableCell>{getLocalizedText(lottery.title_i18n, 'zh')}</TableCell>
                    <TableCell>{lottery.ticket_price} {lottery.currency}</TableCell>
                    <TableCell>{lottery.total_tickets}/{lottery.sold_tickets || 0}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(lottery.status)}`}>
                        {lottery.status}
                      </span>
                    </TableCell>
                    <TableCell>{formatDateTime(lottery.start_time)}</TableCell>
                    <TableCell className="flex space-x-2">
                      {(lottery.status === 'ACTIVE' && new Date(lottery.end_time) < new Date()) && lottery.status !== 'DRAWN' && (
                        <Button variant="default" size="sm" onClick={() => handleDraw(lottery.id)}>
                          立即开奖
                        </Button>
                      )}
                      {lottery.status === 'DRAWN' && (
                        <Button variant="outline" size="sm" onClick={() => handleViewResult(lottery.id)}>
                          查看结果
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => navigate(`/lotteries/${lottery.id}/detail`)}>
                        查看详情
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/lotteries/${lottery.id}`)}>
                        编辑
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => handleCopy(lottery.id)}>
                        复制
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(lottery.id)}>
                        删除
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-between items-center mt-4">
              <Button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                variant="outline"
              >
                上一页
              </Button>
              <span className="text-sm text-gray-600">
                第 {page} 页
              </span>
              <Button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={!hasMore}
                variant="outline"
              >
                下一页
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
