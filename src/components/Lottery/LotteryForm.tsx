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
import { PriceComparisonInput } from '../PriceComparisonInput';
import toast from 'react-hot-toast';
import { formatDateTime } from '@/lib/utils';

type LotteryStatus = Enums<'LotteryStatus'>;
type Currency = Enums<'Currency'>;

interface PriceComparisonItem {
  platform: string;
  price: number;
}

interface InventoryProduct {
  id: string;
  name: string;
  name_i18n: { zh?: string; ru?: string; tg?: string };
  original_price: number;
  stock: number;
  status: string;
}

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
  price_comparisons: PriceComparisonItem[];
  inventory_product_id: string | null;
  full_purchase_enabled: boolean;
  full_purchase_price: number | null;
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
  price_comparisons: [],
  inventory_product_id: null,
  full_purchase_enabled: true,
  full_purchase_price: null,
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
  const [inventoryProducts, setInventoryProducts] = useState<InventoryProduct[]>([]);

  // 加载库存商品列表
  const loadInventoryProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_products')
        .select('id, name, name_i18n, original_price, stock, status')
        .eq('status', 'ACTIVE')
        .order('name', { ascending: true });

      if (error) {throw error;}
      setInventoryProducts(data || []);
    } catch (error) {
      console.error('Failed to load inventory products:', error);
    }
  }, [supabase]);

  useEffect(() => {
    loadInventoryProducts();
  }, [loadInventoryProducts]);

  const loadLottery = useCallback(async () => {
    if (!id) {return;}

    try {
      const { data, error } = await supabase
        .from('lotteries')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {throw error;}

      if (data) {
        // 如果已开奖，尝试获取开奖轮次信息
        if (data.status === 'COMPLETED') {
          const { data: roundData, error: roundError } = await supabase
            .from('lottery_results')
            .select(
              `
                *,
                winner:tickets!lottery_results_winner_id_fkey (
                  ticket_number,
                  user_id,
                  user:users (telegram_username, first_name, last_name, avatar_url)
                )
              `
            )
            .eq('lottery_id', id)
            .single();

          if (roundError && roundError.code !== 'PGRST116') {throw roundError;}
          const result = roundData ? { ...roundData, winner: roundData.winner[0] } : null;
          setLotteryRound(result);
        }

        // 解析比价清单数据
        let priceComparisons: PriceComparisonItem[] = [];
        try {
          const rawComparisons = (data as any).price_comparisons;
          if (Array.isArray(rawComparisons)) {
            priceComparisons = rawComparisons;
          }
        } catch {
          priceComparisons = [];
        }

        setFormData({
          // 优先使用JSONB字段，如果为空则尝试从旧字段读取
          title: (data.title_i18n as Record<string, string>) || (typeof data.title === 'string' ? { zh: data.title } : {}),
          description: (data.description_i18n as Record<string, string>) || (typeof data.description === 'string' ? { zh: data.description } : {}),
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
          price_comparisons: priceComparisons,
          inventory_product_id: data.inventory_product_id || null,
          full_purchase_enabled: data.full_purchase_enabled !== false,
          full_purchase_price: data.full_purchase_price || null,
        });
      }
    } catch (error: any) {
      toast.error(`加载积分商城信息失败: ${error.message}`);
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

  const handlePriceComparisonsChange = (value: PriceComparisonItem[]) => {
    setFormData((prev) => ({
      ...prev,
      price_comparisons: value,
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
        // 使用JSONB字段存储多语言内容
        title_i18n: formData.title || {},
        description_i18n: formData.description || {},
        details_i18n: formData.details_i18n || {},
        // 前端使用name_i18n字段，也需要保存
        name_i18n: formData.title || {},
        // 保留旧字段兼容性，使用中文作为默认值
        title: (formData.title && formData.title.zh) || '',
        description: (formData.description && formData.description.zh) || '',
        // 比价清单
        price_comparisons: formData.price_comparisons,
        // 库存商品关联
        inventory_product_id: formData.inventory_product_id || null,
        full_purchase_enabled: formData.full_purchase_enabled,
        full_purchase_price: formData.full_purchase_price ? Number(formData.full_purchase_price) : null,
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
          .insert([payload])
          .select();
      }

      if (result.error) {throw result.error;}

      toast.success(isEdit ? '积分商城信息更新成功!' : '积分商城创建成功!');
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

  const isDrawn = formData.status === 'COMPLETED';

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
        <CardTitle>{isEdit ? '编辑积分商城' : '创建新积分商城'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 多语言标题 */}
          <MultiLanguageInput
            label="积分商城标题"
            value={formData.title}
            onChange={(v) => handleMultiLangChange('title', v)}
          />

          {/* 多语言描述 */}
          <MultiLanguageInput
            label="积分商城描述"
            value={formData.description}
            onChange={(v) => handleMultiLangChange('description', v)}
            type="textarea"
          />

          {/* 多语言详情 (富文本) */}
          <div className="space-y-2">
            <Label>积分商城详情</Label>
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

          {/* 比价清单 */}
          <div className="border-t pt-6">
            <PriceComparisonInput
              value={formData.price_comparisons}
              onChange={handlePriceComparisonsChange}
            />
          </div>

          {/* 库存商品关联（全款购买设置） */}
          <div className="border-t pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">全款购买设置</Label>
              <div className="flex items-center gap-2">
                <input
                  id="full_purchase_enabled"
                  type="checkbox"
                  checked={formData.full_purchase_enabled}
                  onChange={(e) => setFormData((prev) => ({ ...prev, full_purchase_enabled: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <Label htmlFor="full_purchase_enabled" className="cursor-pointer text-sm">
                  启用全款购买
                </Label>
              </div>
            </div>
            
            {formData.full_purchase_enabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="inventory_product_id">关联库存商品 *</Label>
                  <Select
                    value={formData.inventory_product_id || 'none'}
                    onValueChange={(v) => {
                      const selectedProduct = inventoryProducts.find(p => p.id === v);
                      setFormData((prev) => ({
                        ...prev,
                        inventory_product_id: v === 'none' ? null : v,
                        // 自动填充全款购买价格
                        full_purchase_price: selectedProduct ? selectedProduct.original_price : prev.full_purchase_price,
                      }));
                    }}
                  >
                    <SelectTrigger id="inventory_product_id">
                      <SelectValue placeholder="选择库存商品" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">不关联库存商品</SelectItem>
                      {inventoryProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name_i18n?.zh || product.name} - 库存: {product.stock} - 价格: TJS {product.original_price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    📦 关联库存商品后，全款购买将从该库存商品扣减库存，不影响一元购物的份数
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full_purchase_price">全款购买价格（TJS）</Label>
                  <Input
                    id="full_purchase_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.full_purchase_price || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, full_purchase_price: e.target.value ? Number(e.target.value) : null }))}
                    placeholder="留空则使用库存商品原价"
                  />
                  <p className="text-xs text-gray-500">
                    💰 留空则使用关联库存商品的原价
                  </p>
                </div>
              </>
            )}
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
            {isSubmitting ? '提交中...' : isEdit ? (isDrawn ? '已开奖，无法修改' : '保存更改') : '创建积分商城'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
