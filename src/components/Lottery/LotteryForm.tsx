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
import toast from 'react-hot-toast';
import { formatDateTime } from '@/lib/utils';
import imageCompression from 'browser-image-compression';
import { Upload } from 'lucide-react';
type LotteryStatus = Enums<'LotteryStatus'>;
// type Currency = Enums<'Currency'>; // 假设货币不是枚举，直接使用 string

interface LotteryFormData {
  details: Record<string, string> | null;
  title: Record<string, string> | null;
  description: Record<string, string> | null;
  period: string;
  ticket_price: number;
  total_tickets: number;
  max_per_user: number;
  currency: string;
  status: LotteryStatus;
  image_url: string;
  start_time: string;
  end_time: string;
  draw_time: string;
}

const initialFormData: LotteryFormData = {
  details: { zh: '', ru: '', tg: '' },
  title: { zh: '', en: '' },
  description: { zh: '', en: '' },
  period: '',
  ticket_price: 0,
  total_tickets: 0,
  max_per_user: 1,
  currency: 'CNY', // 默认使用 CNY
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
	  const [lotteryRound, setLotteryRound] = useState<any | null>(null);
	  const [isSubmitting, setIsSubmitting] = useState(false);
	  const [isUploading, setIsUploading] = useState(false);

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
	
	          if (roundError && roundError.code !== 'PGRST116') {throw roundError;}
	          // 确保 winner 字段是一个对象而不是数组
	          const result = roundData ? { ...roundData, winner: roundData.winner[0] } : null;
	          setLotteryRound(result);
	        }
        setFormData({
          title: (data.title_i18n || { zh: data.title || '' }) as Record<string, string>,
          description: data.description_i18n as Record<string, string> | null,
          details: data.details_i18n as Record<string, string> | null,
          period: String(data.period),
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
	
	  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
	    const file = e.target.files?.[0];
	    if (!file) return;
	
	    setIsUploading(true);
	    try {
	      // 1. 压缩和 WebP 转换
	      const compressedFile = await imageCompression(file, {
	        maxSizeMB: 1, // 最大文件大小 1MB
	        maxWidthOrHeight: 1920, // 最大分辨率 1920px
	        useWebWorker: true,
	        fileType: 'image/webp', // 转换为 WebP 格式
	      });
	
	      // 2. 上传到 Supabase Storage
	      const filePath = `lottery-images/${Date.now()}-${compressedFile.name.replace(/\.[^/.]+$/, '.webp')}`;
	      const { data, error } = await supabase.storage
	        .from('public') // 假设使用名为 'public' 的 bucket
	        .upload(filePath, compressedFile, {
	          cacheControl: '3600',
	          upsert: false,
	          contentType: 'image/webp',
	        });
	
	      if (error) {
	        throw error;
	      }
	
	      // 3. 获取公共 URL
	      const { data: publicUrlData } = supabase.storage
	        .from('public')
	        .getPublicUrl(data.path);
	
	      setFormData((prev) => ({
	        ...prev,
	        image_url: publicUrlData.publicUrl,
	      }));
	
	      toast.success('图片上传成功并已优化!');
	    } catch (error: any) {
	      toast.error(`图片上传失败: ${error.message}`);
	      console.error('Image upload error:', error);
	    } finally {
	      setIsUploading(false);
	      e.target.value = ''; // 清空文件输入框
	    }
	  };

  const handleSelectChange = (id: keyof LotteryFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleMultiLangChange = (id: 'title' | 'description' | 'details', value: Record<string, string>) => {
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
        title_i18n: formData.title || {}, // 修正：使用 title_i18n
          description_i18n: formData.description || {}, // 修正：使用 description_i18n
          details_i18n: formData.details || {},
          // 修正：title 字段应该使用 MultiLanguageInput 的值
          title: formData.title?.zh || '',
        };

      let result;
      if (isEdit) {
        result = await supabase
          .from('lotteries')
          .update(payload as any) // 暂时使用 any 绕过复杂的类型检查
          .eq('id', id)
          .select();
      } else {
        result = await supabase
          .from('lotteries')
          .insert(payload as any) // 暂时使用 any 绕过复杂的类型检查
          .select();
      }

      if (result.error) {throw result.error;}

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

          {/* 状态和图片 */}
	          <div className="grid grid-cols-2 gap-4">
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
	            <div className="space-y-2">
	              <Label htmlFor="image_url">夺宝图片</Label>
	              <div className="flex items-center space-x-4">
	                <div className="relative w-32 h-32 border border-gray-300 rounded-lg overflow-hidden flex items-center justify-center bg-gray-50">
	                  {formData.image_url ? (
	                    <img src={formData.image_url} alt="夺宝图片" className="w-full h-full object-cover" />
	                  ) : isUploading ? (
	                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
	                  ) : (
	                    <Upload className="w-8 h-8 text-gray-400" />
	                  )}
	                </div>
	                <div className="flex-1 space-y-2">
	                  <Input
	                    id="image_upload"
	                    type="file"
	                    accept="image/*"
	                    onChange={handleImageUpload}
	                    disabled={isUploading}
	                  />
	                  <p className="text-xs text-gray-500">
	                    图片将自动压缩并转换为 WebP 格式 (最大 1MB, 1920px)。
	                  </p>
	                  {formData.image_url && (
	                    <p className="text-xs text-gray-500 truncate">
	                      URL: {formData.image_url}
	                    </p>
	                  )}
	                </div>
	              </div>
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
