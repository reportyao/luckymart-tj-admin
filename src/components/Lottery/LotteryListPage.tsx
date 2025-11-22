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




const getStatusColor = (status: Enums<'LotteryStatus'>) => { switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'DRAWN':
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
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 10; // 每页显示 10 条
  const [isLoading, setIsLoading] = useState(true);

  const fetchLotteries = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error, count } = await supabase
        .from('lotteries')
        .select('*, count()', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * LIMIT, page * LIMIT - 1);

      if (error) {throw error;}

      setLotteries(data || []);
      if (count !== null) {
        setTotalPages(Math.ceil(count / LIMIT));
        if (page > Math.ceil(count / LIMIT) && count > 0) {
          setPage(Math.ceil(count / LIMIT));
        }
      }
    } catch (error: any) {
      toast.error(`加载夺宝列表失败: ${error.message}`);
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
	
	      toast.success(`夺宝 ${id} 开奖成功! 中奖号码: ${(data as any).winning_number}`);
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
		
		  const handleCopy = (id: string) => {
		    // 跳转到创建页面，并带上源 ID 作为查询参数
		    navigate(`/lotteries/new?copyFrom=${id}`);
		  };
	
	  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这个夺宝吗？')) {return;}

    try {
      const { error } = await supabase
        .from('lotteries')
        .delete()
        .eq('id', id);

      if (error) {throw error;}

      toast.success('夺宝删除成功!');
      fetchLotteries(); // 刷新列表
    } catch (error: any) {
      toast.error(`删除失败: ${error.message}`);
      console.error('Error deleting lottery:', error);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold">夺宝管理</CardTitle>
	        <Button onClick={() => navigate('/lotteries/new')}>
	          创建新夺宝
	        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-10">加载中...</div>
        ) : lotteries.length === 0 ? (
          <EmptyState title="暂无夺宝" message="当前没有夺宝活动，请点击上方按钮创建。" action={<Button onClick={() => navigate('/lotteries/new')}>创建新夺宝</Button>} />
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
                    <TableCell>{lottery.total_tickets}</TableCell>
                    <TableCell>
	                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(lottery.status)}`}>
	                        {lottery.status}
	                      </span>
	                    </TableCell>
	                    <TableCell>{formatDateTime(lottery.start_time)}</TableCell>
	                    <TableCell className="flex space-x-2">
	                      {(lottery.status === 'PENDING' && new Date(lottery.end_time) < new Date()) && (
	                        <Button variant="default" size="sm" onClick={() => handleDraw(lottery.id)}>
	                          立即开奖
	                        </Button>
	                      )}
	                      {lottery.status === 'DRAWN' && (
	                        <Button variant="outline" size="sm" onClick={() => handleViewResult(lottery.id)}>
	                          查看结果
	                        </Button>
	                      )}
	                      <Button variant="outline" size="sm" onClick={() => navigate(`/lotteries/${lottery.id}`)}>
	                        编辑
	                      </Button>
	                      <Button variant="outline" size="sm" onClick={() => handleCopy(lottery.id)}>
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
                第 {page} 页 / 共 {totalPages} 页
              </span>
              <Button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
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
