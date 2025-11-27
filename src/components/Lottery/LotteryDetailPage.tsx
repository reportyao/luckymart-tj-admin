import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSupabase } from '@/contexts/SupabaseContext';
import { Tables } from '@/types/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';
import { ArrowLeft, Users, Ticket, Trophy, TrendingUp } from 'lucide-react';

interface TicketWithUser extends Tables<'tickets'> {
  user?: {
    telegram_username: string | null;
    telegram_id: string;
  };
}

interface LotteryDetail extends Tables<'lotteries'> {
  winning_user?: {
    telegram_username: string | null;
    telegram_id: string;
  };
}

const getLocalizedText = (jsonb: any, language: string = 'zh', fallbackLanguage: string = 'en'): string => {
  if (!jsonb || typeof jsonb !== 'object') {return '';}
  if (jsonb[language]) {return jsonb[language];}
  if (jsonb[fallbackLanguage]) {return jsonb[fallbackLanguage];}
  const firstValue = Object.values(jsonb).find(value => typeof value === 'string' && value.trim() !== '');
  return firstValue as string || '';
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return 'bg-green-100 text-green-800';
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'DRAWN':
      return 'bg-blue-100 text-blue-800';
    case 'SOLD_OUT':
      return 'bg-purple-100 text-purple-800';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const LotteryDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const [lottery, setLottery] = useState<LotteryDetail | null>(null);
  const [tickets, setTickets] = useState<TicketWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ticketsPage, setTicketsPage] = useState(1);
  const [ticketsHasMore, setTicketsHasMore] = useState(true);
  const TICKETS_LIMIT = 20;

  useEffect(() => {
    if (id) {
      fetchLotteryDetail();
      fetchTickets();
    }
  }, [id, ticketsPage]);

  const fetchLotteryDetail = async () => {
    try {
      setIsLoading(true);
      
      // 获取夺宝详情
      const { data: lotteryData, error: lotteryError } = await supabase
        .from('lotteries')
        .select('*')
        .eq('id', id)
        .single();

      if (lotteryError) {throw lotteryError;}

      // 如果有中奖用户，获取用户信息
      if (lotteryData.winning_user_id) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('telegram_username, telegram_id')
          .eq('id', lotteryData.winning_user_id)
          .single();

        if (!userError && userData) {
          setLottery({
            ...lotteryData,
            winning_user: userData
          });
        } else {
          setLottery(lotteryData);
        }
      } else {
        setLottery(lotteryData);
      }
    } catch (error: any) {
      toast.error(`加载夺宝详情失败: ${error.message}`);
      console.error('Error loading lottery detail:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTickets = async () => {
    try {
      const from = (ticketsPage - 1) * TICKETS_LIMIT;
      const to = from + TICKETS_LIMIT - 1;

      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select(`
          *,
          user:users!tickets_user_id_fkey (
            telegram_username,
            telegram_id
          )
        `)
        .eq('lottery_id', id)
        .order('ticket_number', { ascending: true })
        .range(from, to);

      if (ticketsError) {throw ticketsError;}

      setTickets(ticketsData || []);
      setTicketsHasMore((ticketsData || []).length === TICKETS_LIMIT);
    } catch (error: any) {
      toast.error(`加载票据列表失败: ${error.message}`);
      console.error('Error loading tickets:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg">加载中...</div>
        </div>
      </div>
    );
  }

  if (!lottery) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg text-red-600">夺宝不存在</div>
          <Button onClick={() => navigate('/lotteries')} className="mt-4">
            返回列表
          </Button>
        </div>
      </div>
    );
  }

  const progress = lottery.total_tickets > 0 
    ? ((lottery.sold_tickets || 0) / lottery.total_tickets * 100).toFixed(2)
    : '0.00';

  // 按用户分组统计票数
  const userTicketsMap = new Map<string, { username: string; count: number; tickets: number[] }>();
  tickets.forEach(ticket => {
    const userId = ticket.user_id;
    const username = (ticket.user as any)?.telegram_username || (ticket.user as any)?.telegram_id || '未知用户';
    
    if (!userTicketsMap.has(userId)) {
      userTicketsMap.set(userId, {
        username,
        count: 0,
        tickets: []
      });
    }
    
    const userInfo = userTicketsMap.get(userId)!;
    userInfo.count++;
    userInfo.tickets.push(ticket.ticket_number);
  });

  const userStats = Array.from(userTicketsMap.entries()).map(([userId, info]) => ({
    userId,
    ...info
  })).sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      {/* 返回按钮 */}
      <Button variant="outline" onClick={() => navigate('/lotteries')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        返回列表
      </Button>

      {/* 基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">夺宝详情 - 期号 {lottery.period}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-500">标题</div>
              <div className="font-medium">{getLocalizedText(lottery.title_i18n, 'zh')}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">状态</div>
              <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(lottery.status)}`}>
                {lottery.status}
              </span>
            </div>
            <div>
              <div className="text-sm text-gray-500">单价</div>
              <div className="font-medium">{lottery.ticket_price} {lottery.currency}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">总票数</div>
              <div className="font-medium">{lottery.total_tickets}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">已售票数</div>
              <div className="font-medium">{lottery.sold_tickets || 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">进度</div>
              <div className="font-medium">{progress}%</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">开始时间</div>
              <div className="font-medium">{formatDateTime(lottery.start_time)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">结束时间</div>
              <div className="font-medium">{formatDateTime(lottery.end_time)}</div>
            </div>
            {lottery.draw_time && (
              <div>
                <div className="text-sm text-gray-500">开奖时间</div>
                <div className="font-medium">{formatDateTime(lottery.draw_time)}</div>
              </div>
            )}
          </div>

          {/* 进度条 */}
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span>销售进度</span>
              <span>{lottery.sold_tickets || 0} / {lottery.total_tickets}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 中奖信息 */}
      {lottery.status === 'DRAWN' && lottery.winning_ticket_number && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Trophy className="mr-2 h-5 w-5 text-yellow-500" />
              中奖信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-500">中奖票号</div>
                <div className="text-2xl font-bold text-yellow-600">#{lottery.winning_ticket_number}</div>
              </div>
              {lottery.winning_user && (
                <div>
                  <div className="text-sm text-gray-500">中奖用户</div>
                  <div className="font-medium">
                    {lottery.winning_user.telegram_username || lottery.winning_user.telegram_id}
                  </div>
                </div>
              )}
              {lottery.draw_time && (
                <div>
                  <div className="text-sm text-gray-500">开奖时间</div>
                  <div className="font-medium">{formatDateTime(lottery.draw_time)}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 参与用户统计 */}
      {userStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              参与用户统计 (共 {userStats.length} 人)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>排名</TableHead>
                  <TableHead>用户</TableHead>
                  <TableHead>购买票数</TableHead>
                  <TableHead>票号范围</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userStats.map((user, index) => (
                  <TableRow key={user.userId}>
                    <TableCell className="font-medium">#{index + 1}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.count} 张</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {user.tickets.length > 3
                        ? `#${Math.min(...user.tickets)} - #${Math.max(...user.tickets)}`
                        : user.tickets.map(t => `#${t}`).join(', ')
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 所有票据列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Ticket className="mr-2 h-5 w-5" />
            票据列表 (共 {lottery.sold_tickets || 0} 张)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <div className="text-center py-10 text-gray-500">暂无票据</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>票号</TableHead>
                    <TableHead>用户</TableHead>
                    <TableHead>购买时间</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow 
                      key={ticket.id}
                      className={ticket.is_winning ? 'bg-yellow-50' : ''}
                    >
                      <TableCell className="font-medium">
                        #{ticket.ticket_number}
                        {ticket.is_winning && (
                          <Trophy className="inline ml-2 h-4 w-4 text-yellow-500" />
                        )}
                      </TableCell>
                      <TableCell>
                        {(ticket.user as any)?.telegram_username || (ticket.user as any)?.telegram_id || '未知用户'}
                      </TableCell>
                      <TableCell>{formatDateTime(ticket.created_at)}</TableCell>
                      <TableCell>
                        {ticket.is_winning ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            中奖
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            未中奖
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* 分页 */}
              <div className="flex justify-between items-center mt-4">
                <Button
                  onClick={() => setTicketsPage(p => Math.max(1, p - 1))}
                  disabled={ticketsPage === 1}
                  variant="outline"
                  size="sm"
                >
                  上一页
                </Button>
                <span className="text-sm text-gray-600">
                  第 {ticketsPage} 页
                </span>
                <Button
                  onClick={() => setTicketsPage(p => p + 1)}
                  disabled={!ticketsHasMore}
                  variant="outline"
                  size="sm"
                >
                  下一页
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
