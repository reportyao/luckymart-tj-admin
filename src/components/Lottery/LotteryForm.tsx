import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useSupabase } from '@/contexts/SupabaseContext';
import { Enums } from '@/types/supabase';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { MultiLanguageInput } from '../MultiLanguageInput';
import { MultiImageUpload } from '../MultiImageUpload'; // 新增多图上传组件
import { RichTextEditor } from '../RichTextEditor';
import toast from 'react-hot-toast';
import { formatDateTime } from '@/lib/utils';
import { uploadImage } from '@/lib/uploadImage';
import { Upload } from 'lucide-react';
type LotteryStatus = Enums<'LotteryStatus'>;
// type Currency = Enums<'Currency'>; // 假设货币不是枚举，直接使用 string

interface LotteryFormData {
  details: Record<string, string> | null;
  title: Record<string, string> | null;
  description: Record<string, string> | null;
  specifications: Record<string, string> | null; // 新增：规格信息
  material: Record<string, string> | null; // 新增：材质信息
  period: string;
  ticket_price: number;
  total_tickets: number;
  max_per_user: number;
  currency: string;
  status: LotteryStatus;
  image_urls: string[]; // 更改：支持多图
  start_time: string;
  end_time: string;
  draw_time: string;
}

const initialFormData: LotteryFormData = {
  details: { zh: '', ru: '', tg: '' },
  title: { zh: '', ru: '', tg: '' },
  description: { zh: '', ru: '', tg: '' },
  specifications: { zh: '', ru: '', tg: '' }, // 新增
  material: { zh: '', ru: '', tg: '' }, // 新增
  period: '',
  ticket_price: 0,
  total_tickets: 0,
  max_per_user: 1,
  currency: 'CNY', // 默认使用 CNY
  status: 'PENDING',
  image_urls: [], // 更改
  start_time: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:MM 格式
  end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  draw_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString().slice(0, 16),
};

export const LotteryForm: React.FC = () => {
	  const { supabase } = useSupabase();
	  const navigate = useNavigate();
	  const { id } = useParams<{ id: string }>();
	  const [searchParams] = useSearchParams();
	  const copyFromId = searchParams.get('copyFrom');
	  const isEdit = !!id && !copyFromId; // 只有在编辑模式下，且没有 copyFrom 参数时，才是真正的编辑
	  const isCopy = !!copyFromId;

	  const [formData, setFormData] = useState<LotteryFormData>(initialFormData);
		  const [isLoading, setIsLoading] = useState(isEdit || isCopy);
	  const [lotteryRound, setLotteryRound] = useState<any | null>(null);
		  const [isSubmitting, setIsSubmitting] = useState(false);
		  // 移除 isUploading 状态，由 MultiImageUpload 内部管理

	  const loadLottery = useCallback(async (loadId: string) => {
	    if (!loadId) {return;}
	
	    try {
	      const { data, error } = await supabase
	        .from('lotteries')
	        .select('*')
	        .eq('id', loadId)
	        .single();

      if (error) {throw error;}

	      if (data) {
	        // 如果是编辑模式且已开奖，尝试获取开奖轮次信息
	        if (isEdit && data.status === 'DRAWN') {
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
	
	          if (roundError && roundError.code !== 'PGRST116') {throw roundError;}
	          // 确保 winner 字段是一个对象而不是数组
	          const result = roundData ? { ...roundData, winner: roundData.winner[0] } : null;
	          setLotteryRound(result);
	        }
        setFormData({
          title: (data.title_i18n || { zh: data.title || '' }) as Record<string, string>,
	          description: data.description_i18n as Record<string, string> | null,
	          details: data.details_i18n as Record<string, string> | null,
	          specifications: data.specifications_i18n as Record<string, string> | null, // 新增
	          material: data.material_i18n as Record<string, string> | null, // 新增
	          period: isCopy ? '' : String(data.period), // 复制时不带期号
	          ticket_price: data.ticket_price,
	          total_tickets: data.total_tickets,
	          max_per_user: data.max_per_user,
	          currency: data.currency,
	          status: isCopy ? 'PENDING' : data.status, // 复制时状态重置为 PENDING
	          image_urls: data.image_urls || [], // 更改
	          start_time: isCopy ? initialFormData.start_time : new Date(data.start_time).toISOString().slice(0, 16), // 复制时重置时间
	          end_time: isCopy ? initialFormData.end_time : new Date(data.end_time).toISOString().slice(0, 16), // 复制时重置时间
	          draw_time: isCopy ? initialFormData.draw_time : new Date(data.draw_time).toISOString().slice(0, 16), // 复制时重置时间
	        });
	      }
	    } catch (error: any) {
	      toast.error(`加载夺宝信息失败: ${error.message}`);
	      console.error('Error loading lottery:', error);
	    } finally {
	      setIsLoading(false);
	    }
	  }, [isEdit, isCopy, supabase]);

	  useEffect(() => {
	    if (isEdit) {
	      loadLottery(id!);
	    } else if (isCopy) {
	      loadLottery(copyFromId!);
	    } else {
	      setIsLoading(false);
	    }
	  }, [isEdit, isCopy, id, copyFromId, loadLottery]);

	  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
	    const { id, value, type } = e.target;
	    setFormData((prev) => ({
	      ...prev,
	      [id]: type === 'number' ? parseFloat(value) : value,
	    }));
	  };
	
	  // 移除 handleImageUpload 函数，由 MultiImageUpload 组件处理

  const handleSelectChange = (id: keyof LotteryFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

	  const handleMultiLangChange = (id: 'title' | 'description' | 'details' | 'specifications' | 'material', value: Record<string, string>) => {
	    setFormData((prev) => ({
	      ...prev,
	      [id]: value,
	    }));
	  };
	
	  const handleImageUrlsChange = (urls: string[]) => {
	    setFormData((prev) => ({
	      ...prev,
	      image_urls: urls,
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
	        title_i18n: formData.title || {},
	        description_i18n: formData.description || {},
	        details_i18n: formData.details || {},
	        specifications_i18n: formData.specifications || {}, // 新增
	        material_i18n: formData.material || {}, // 新增
	        // 修正：title 字段应该使用 MultiLanguageInput 的值
	        title: formData.title?.zh || '',
	        // 更改：image_url -> image_urls
	        image_urls: formData.image_urls,
	      };

	      let result;
	      if (isEdit) {
	        result = await supabase
	          .from('lotteries')
	          .update(payload as any) // 暂时使用 any 绕过复杂的类型检查
	          .eq('id', id)
	          .select();
	      } else {
	        // 创建或复制
	        // 移除 id 字段，确保 Supabase 自动生成新的 ID
	        const { id, ...insertPayload } = payload;
	        result = await supabase
	          .from('lotteries')
	          .insert(insertPayload as any) // 暂时使用 any 绕过复杂的类型检查
	          .select();
	      }

      if (result.error) {throw result.error;}

	      toast.success(isEdit ? '夺宝信息更新成功!' : isCopy ? '夺宝复制创建成功!' : '夺宝创建成功!');
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
	
	  const isDrawn = formData.status === 'DRAWN';
	
	  const verificationData = lotteryRound ? [
	    { label: '开奖时间', value: formatDateTime(lotteryRound.draw_time) },
	    { label: '中奖号码 (Winning Number)', value: lotteryRound.winning_number },
	    { label: '时间戳总和 (S)', value: lotteryRound.timestamp_sum },
	    { label: '总份数 (N)', value: lotteryRound.total_shares },
	    { label: '中奖用户', value: lotteryRound.winner?.profiles?.username || 'N/A' },
	    { label: '中奖门票 ID', value: lotteryRound.winning_ticket_id },
	  ] : [];

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
	          <CardTitle>{isEdit ? '编辑夺宝' : isCopy ? '复制夺宝' : '创建新夺宝'}</CardTitle>
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
	
	          {/* 多语言规格信息 */}
	          <MultiLanguageInput
	            label="规格信息"
	            value={formData.specifications}
	            onChange={(v) => handleMultiLangChange('specifications', v)}
	            type="textarea"
	          />
	
	          {/* 多语言材质信息 */}
	          <MultiLanguageInput
	            label="材质信息"
	            value={formData.material}
	            onChange={(v) => handleMultiLangChange('material', v)}
	            type="textarea"
	          />

	          {/* 多语言详情 (富文本) */}
	          <RichTextEditor
	            label="夺宝详情"
	            value={formData.details}
	            onChange={(v) => handleMultiLangChange('details', v)}
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
                onValueChange={(v) => handleSelectChange('currency', v as string)}
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

	          {/* 状态 */}
	          <div className="space-y-2">
	            <Label htmlFor="status">状态</Label>
	            <Select
	              value={formData.status as string}
	              onValueChange={(v) => handleSelectChange('status', v)}
	              disabled={isDrawn} // 开奖后不能修改状态
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
	
	          {/* 多图上传 */}
	          <MultiImageUpload
	            label="夺宝图片 (最多5张)"
	            bucket="lottery-images"
	            folder="public"
	            maxImages={5}
	            imageUrls={formData.image_urls}
	            onImageUrlsChange={handleImageUrlsChange}
	          />

	          <Button type="submit" className="w-full" disabled={isSubmitting || (isEdit && isDrawn)}>
		            {isSubmitting ? '提交中...' : isEdit ? (isDrawn ? '已开奖，无法修改' : '保存更改') : '创建夺宝'}
		          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
