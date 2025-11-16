import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSupabase } from '../../contexts/SupabaseContext';
import { Tables, Enums } from '../../types/supabase';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { MultiLanguageInput } from '../MultiLanguageInput';
import toast from 'react-hot-toast';

type Lottery = Tables<'lotteries'>;
type LotteryStatus = Enums<'LotteryStatus'>;
type Currency = Enums<'Currency'>;

interface LotteryFormData {
  title: Record<string, string> | null;
  description: Record<string, string> | null;
  period: string;
  ticket_price: number;
  total_tickets: number;
  max_per_user: number;
  currency: Currency;
  status: LotteryStatus;
  image_url: string;
  start_time: string;
  end_time: string;
  draw_time: string;
}

const initialFormData: LotteryFormData = {
  title: { zh: '', en: '' },
  description: { zh: '', en: '' },
  period: '',
  ticket_price: 0,
  total_tickets: 0,
  max_per_user: 1,
  currency: 'CNY', // 默认使用 CNY，但前端用 TJS，这里先用 CNY
  status: 'PENDING',
  image_url: '',
  start_time: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:MM 格式
  end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  draw_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString().slice(0, 16),
};

export const LotteryForm: React.FC = () => {
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const [formData, setFormData] = useState<LotteryFormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadLottery = useCallback(async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('lotteries')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          title: data.title as Record<string, string>,
          description: data.description as Record<string, string> | null,
          period: data.period,
          ticket_price: data.ticket_price,
          total_tickets: data.total_tickets,
          max_per_user: data.max_per_user,
          currency: data.currency,
          status: data.status,
          image_url: data.image_url || '',
          start_time: new Date(data.start_time).toISOString().slice(0, 16),
          end_time: new Date(data.end_time).toISOString().slice(0, 16),
          draw_time: new Date(data.draw_time).toISOString().slice(0, 16),
        });
      }
    } catch (error: any) {
      toast.error(`加载夺宝信息失败: ${error.message}`);
      console.error('Error loading lottery:', error);
    } finally {
      setIsLoading(false);
    }
  }, [id, supabase]);

  useEffect(() => {
    if (isEdit) {
      loadLottery();
    } else {
      setIsLoading(false);
    }
  }, [isEdit, loadLottery]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: type === 'number' ? parseFloat(value) : value,
    }));
  };

  const handleSelectChange = (id: keyof LotteryFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleMultiLangChange = (id: 'title' | 'description', value: Record<string, string>) => {
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        updated_at: new Date().toISOString(),
        // 确保数字类型正确
        ticket_price: Number(formData.ticket_price),
        total_tickets: Number(formData.total_tickets),
        max_per_user: Number(formData.max_per_user),
        // 确保 JSONB 字段非空
        title: formData.title || {},
        description: formData.description || {},
      };

      let result;
      if (isEdit) {
        result = await supabase
          .from('lotteries')
          .update(payload)
          .eq('id', id)
          .select();
      } else {
        result = await supabase
          .from('lotteries')
          .insert(payload)
          .select();
      }

      if (result.error) throw result.error;

      toast.success(isEdit ? '夺宝信息更新成功!' : '夺宝创建成功!');
      navigate('/lotteries'); // 假设存在一个夺宝列表页
    } catch (error: any) {
      toast.error(error.message || (isEdit ? '更新失败' : '创建失败'));
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-10">加载中...</div>;
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{isEdit ? '编辑夺宝' : '创建新夺宝'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 多语言标题 */}
          <MultiLanguageInput
            label="夺宝标题"
            value={formData.title}
            onChange={(v) => handleMultiLangChange('title', v)}
          />

          {/* 多语言描述 */}
          <MultiLanguageInput
            label="夺宝描述"
            value={formData.description}
            onChange={(v) => handleMultiLangChange('description', v)}
            type="textarea"
          />

          {/* 基础信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period">期号</Label>
              <Input
                id="period"
                type="text"
                value={formData.period}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">货币</Label>
              <Select
                value={formData.currency}
                onValueChange={(v) => handleSelectChange('currency', v)}
              >
                <SelectTrigger id="currency">
                  <SelectValue placeholder="选择货币" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CNY">CNY</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="VND">VND</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 价格和数量 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ticket_price">单价</Label>
              <Input
                id="ticket_price"
                type="number"
                step="0.01"
                value={formData.ticket_price}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="total_tickets">总票数</Label>
              <Input
                id="total_tickets"
                type="number"
                value={formData.total_tickets}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_per_user">每人限购</Label>
              <Input
                id="max_per_user"
                type="number"
                value={formData.max_per_user}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* 时间设置 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">开始时间</Label>
              <Input
                id="start_time"
                type="datetime-local"
                value={formData.start_time}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">结束时间</Label>
              <Input
                id="end_time"
                type="datetime-local"
                value={formData.end_time}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="draw_time">开奖时间</Label>
              <Input
                id="draw_time"
                type="datetime-local"
                value={formData.draw_time}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* 状态和图片 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">状态</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => handleSelectChange('status', v)}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">待开始</SelectItem>
                  <SelectItem value="ACTIVE">进行中</SelectItem>
                  <SelectItem value="DRAWN">已开奖</SelectItem>
                  <SelectItem value="CANCELLED">已取消</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="image_url">图片 URL</Label>
              <Input
                id="image_url"
                type="url"
                value={formData.image_url}
                onChange={handleChange}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? '提交中...' : isEdit ? '保存更改' : '创建夺宝'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
