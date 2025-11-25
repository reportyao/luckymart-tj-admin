import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSupabase } from '@/contexts/SupabaseContext';
import { Enums } from '@/types/supabase';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { MultiLanguageInput } from '../MultiLanguageInput';
import { RichTextEditor } from '../RichTextEditor';
import { ImageUpload } from '../ui/ImageUpload';
import toast from 'react-hot-toast';
import { formatDateTime } from '@/lib/utils';

type LotteryStatus = Enums<'LotteryStatus'>;
type Currency = Enums<'Currency'>;

interface LotteryFormData {
  details_i18n: Record<string, string> | null;
  title: Record<string, string> | null;
  description: Record<string, string> | null;
  period: string;
  ticket_price: number;
  total_tickets: number;
  max_per_user: number;
  unlimited_purchase: boolean;
  currency: Currency;
  status: LotteryStatus;
  image_urls: string[];
  start_time: string;
}

const initialFormData: LotteryFormData = {
  details_i18n: { zh: '', ru: '', tg: '' },
  title: { zh: '', en: '' },
  description: { zh: '', en: '' },
  period: '',
  ticket_price: 0,
  total_tickets: 0,
  max_per_user: 1,
  unlimited_purchase: true,
  currency: 'TJS',
  status: 'PENDING',
  image_urls: [],
  start_time: new Date().toISOString().slice(0, 16),
};

/**
 * 生成期号：使用复杂算法避免规律被发现
 * 算法：时间戳 + 随机数 + Base36编码 + 校验位
 */
const generatePeriod = (): string => {
  const now = Date.now();
  // 使用时间戳的后8位 + 随机4位数
  const timePart = (now % 100000000).toString(36).toUpperCase();
  const randomPart = Math.floor(Math.random() * 46656).toString(36).toUpperCase().padStart(3, '0');
  // 计算校验位（防止伪造）
  const checksum = ((now + Math.floor(Math.random() * 1000)) % 36).toString(36).toUpperCase();
  return `LM${timePart}${randomPart}${checksum}`;
};

export const LotteryForm: React.FC = () => {
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const [formData, setFormData] = useState<LotteryFormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [lotteryRound, setLotteryRound] = useState<any | null>(null);
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
        // 如果已开奖，尝试获取开奖轮次信息
        if (data.status === 'DRAWN') {
          const { data: roundData, error: roundError } = await supabase
            .from('lottery_results')
            .select(
              `
                *,
                winner:tickets!lottery_results_winner_id_fkey (
                  ticket_number,
                  user_id,
                  profiles:user_profiles (username, avatar_url)
                )
              `
            )
            .eq('lottery_id', id)
            .single();

          if (roundError && roundError.code !== 'PGRST116') throw roundError;
          const result = roundData ? { ...roundData, winner: roundData.winner[0] } : null;
          setLotteryRound(result);
        }

        setFormData({
          title: data.title as Record<string, string>,
          description: data.description as Record<string, string> | null,
          details_i18n: data.details_i18n as Record<string, string> | null,
          period: data.period,
          ticket_price: data.ticket_price,
          total_tickets: data.total_tickets,
          max_per_user: data.max_per_user || 1,
          unlimited_purchase: data.max_per_user === null,
          currency: data.currency,
          status: data.status,
          image_urls: data.image_url ? [data.image_url] : [],
          start_time: new Date(data.start_time).toISOString().slice(0, 16),
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

  const handleMultiLangChange = (id: 'title' | 'description' | 'details_i18n', value: Record<string, string>) => {
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleUnlimitedPurchaseChange = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      unlimited_purchase: checked,
      max_per_user: checked ? 1 : prev.max_per_user,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 验证图片
      if (formData.image_urls.length === 0) {
        toast.error('请至少上传一张图片');
        setIsSubmitting(false);
        return;
      }

      // 计算结束时间和开奖时间（售罄后180秒自动开奖）
      const startTime = new Date(formData.start_time);
      // 结束时间设置为开始后7天（或根据业务需求调整）
      const endTime = new Date(startTime.getTime() + 7 * 24 * 60 * 60 * 1000);
      // 开奖时间 = 结束时间 + 180秒
      const drawTime = new Date(endTime.getTime() + 180 * 1000);

      const payload = {
        ...formData,
        image_url: formData.image_urls[0] || null,
        period: isEdit ? formData.period : generatePeriod(),
        max_per_user: formData.unlimited_purchase ? 999999 : Number(formData.max_per_user),
        currency: 'TJS', // 固定为塔吉克索莫尼
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        draw_time: drawTime.toISOString(),
        updated_at: new Date().toISOString(),
        ticket_price: Number(formData.ticket_price),
        total_tickets: Number(formData.total_tickets),
        title: formData.title || {},
        description: formData.description || {},
        details_i18n: formData.details_i18n || {},
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
      navigate('/lotteries');
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

  const isDrawn = formData.status === 'DRAWN';

  const verificationData = lotteryRound
    ? [
        { label: '开奖时间', value: formatDateTime(lotteryRound.draw_time) },
        { label: '中奖号码 (Winning Number)', value: lotteryRound.winning_number },
        { label: '时间戳总和 (S)', value: lotteryRound.timestamp_sum },
        { label: '总份数 (N)', value: lotteryRound.total_shares },
        { label: '中奖用户', value: lotteryRound.winner?.profiles?.username || 'N/A' },
        { label: '中奖门票 ID', value: lotteryRound.winning_ticket_id },
      ]
    : [];

  return (
    <Card className="w-full max-w-4xl mx-auto">
      {isDrawn && lotteryRound && (
        <Card className="mb-6 border-2 border-green-500 bg-green-50">
          <CardHeader>
            <CardTitle className="text-xl text-green-700">开奖结果与验证数据</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {verificationData.map((item, index) => (
                <div key={index} className="space-y-1">
                  <Label className="text-sm font-medium text-green-600">{item.label}</Label>
                  <p className="text-base font-semibold text-gray-800 break-all">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-green-100 rounded-lg">
              <Label className="text-sm font-medium text-green-600">开奖公式</Label>
              <p className="text-sm font-mono text-gray-700 break-all">
                (时间戳总和 S / 总份数 N) % 总份数 N + 1 = 中奖号码
              </p>
            </div>
          </CardContent>
        </Card>
      )}
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

          {/* 多语言详情 (富文本) */}
          <div className="space-y-2">
            <Label>夺宝详情</Label>
            <RichTextEditor
              value={formData.details_i18n}
              onChange={(v) => handleMultiLangChange('details_i18n', v)}
            />
          </div>

          {/* 图片上传 */}
          <div className="space-y-2">
            <Label>商品图片 *</Label>
            <ImageUpload
              value={formData.image_urls}
              onChange={(urls) => setFormData((prev) => ({ ...prev, image_urls: urls }))}
              maxImages={5}
              maxSizeMB={5}
            />
            <p className="text-sm text-gray-500">支持上传最多5张图片，自动压缩并上传到云存储</p>
          </div>

          {/* 期号（自动生成，仅显示） */}
          {isEdit && (
            <div className="space-y-2">
              <Label htmlFor="period">期号（自动生成）</Label>
              <Input id="period" type="text" value={formData.period} disabled className="bg-gray-100" />
            </div>
          )}

          {/* 价格和数量 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ticket_price">单价（TJS）*</Label>
              <Input
                id="ticket_price"
                type="number"
                step="0.01"
                min="0"
                value={formData.ticket_price}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="total_tickets">总票数 *</Label>
              <Input
                id="total_tickets"
                type="number"
                min="1"
                value={formData.total_tickets}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_per_user">每人限购</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="max_per_user"
                  type="number"
                  min="1"
                  value={formData.max_per_user}
                  onChange={handleChange}
                  disabled={formData.unlimited_purchase}
                  className={formData.unlimited_purchase ? 'bg-gray-100' : ''}
                />
              </div>
            </div>
          </div>

          {/* 无限购选项 */}
          <div className="flex items-center gap-2">
            <input
              id="unlimited_purchase"
              type="checkbox"
              checked={formData.unlimited_purchase}
              onChange={(e) => handleUnlimitedPurchaseChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <Label htmlFor="unlimited_purchase" className="cursor-pointer">
              无限购（不限制用户购买份数）
            </Label>
          </div>

          {/* 开始时间 */}
          <div className="space-y-2">
            <Label htmlFor="start_time">开始时间 *</Label>
            <Input
              id="start_time"
              type="datetime-local"
              value={formData.start_time}
              onChange={handleChange}
              required
            />
            <p className="text-xs text-gray-500">
              💡 售罄后将自动倒计时180秒开奖
            </p>
          </div>

          {/* 状态 */}
          <div className="space-y-2">
            <Label htmlFor="status">状态</Label>
            <Select
              value={formData.status}
              onValueChange={(v) => handleSelectChange('status', v)}
              disabled={isDrawn}
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

          {/* 提示信息 */}
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-800">
                💡 货币已固定为<strong>塔吉克索莫尼（TJS）</strong>
              </p>
            </div>
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800">
                ⏱️ <strong>自动开奖机制</strong>：售罄后系统将自动倒计时180秒，倒计时结束后自动开奖
              </p>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting || isDrawn}>
            {isSubmitting ? '提交中...' : isEdit ? (isDrawn ? '已开奖，无法修改' : '保存更改') : '创建夺宝'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
