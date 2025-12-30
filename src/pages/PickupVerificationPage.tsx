import React, { useState } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import toast from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  GiftIcon,
  MapPinIcon,
  ClockIcon,
  QrCodeIcon,
} from '@heroicons/react/24/outline';

interface PrizeInfo {
  id: string;
  prize_name: string;
  prize_image: string;
  prize_value: number;
  pickup_code: string;
  pickup_status: string;
  expires_at: string;
  claimed_at: string;
  user: {
    id: string;
    telegram_username: string;
    first_name: string;
    last_name: string;
    avatar_url: string;
  };
  lottery: {
    title: string;
    title_i18n: any;
  };
  pickup_point: {
    name: string;
    name_i18n: any;
    address: string;
    address_i18n: any;
  };
}

const PickupVerificationPage: React.FC = () => {
  const { supabase } = useSupabase();
  const [pickupCode, setPickupCode] = useState('');
  const [prizeInfo, setPrizeInfo] = useState<PrizeInfo | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // 搜索提货码
  const handleSearch = async () => {
    if (!pickupCode || pickupCode.length < 6) {
      toast.error('请输入有效的提货码');
      return;
    }

    setIsSearching(true);
    setPrizeInfo(null);

    try {
      // 查询 prizes 表
      const { data: prize, error } = await supabase
        .from('prizes')
        .select(`
          id,
          prize_name,
          prize_image,
          prize_value,
          pickup_code,
          pickup_status,
          expires_at,
          claimed_at,
          user_id,
          lottery_id,
          pickup_point_id,
          user:users(
            id,
            telegram_username,
            first_name,
            last_name,
            avatar_url
          ),
          lottery:lotteries(
            title,
            title_i18n
          ),
          pickup_point:pickup_points(
            name,
            name_i18n,
            address,
            address_i18n
          )
        `)
        .eq('pickup_code', pickupCode)
        .single();

      if (error) {
        // 如果 prizes 表没找到，尝试查询 group_buy_results 表
        const { data: groupBuyPrize, error: groupBuyError } = await supabase
          .from('group_buy_results')
          .select(`
            id,
            product_name as prize_name,
            product_image as prize_image,
            product_value as prize_value,
            pickup_code,
            pickup_status,
            expires_at,
            claimed_at,
            winner_id,
            session_id,
            pickup_point_id,
            user:users!group_buy_results_winner_id_fkey(
              id,
              telegram_username,
              first_name,
              last_name,
              avatar_url
            ),
            pickup_point:pickup_points(
              name,
              name_i18n,
              address,
              address_i18n
            )
          `)
          .eq('pickup_code', pickupCode)
          .single();

        if (groupBuyError || !groupBuyPrize) {
          toast.error('未找到该提货码对应的奖品');
          return;
        }

        setPrizeInfo({
          ...groupBuyPrize,
          lottery: { title: '拼团商品', title_i18n: { zh: '拼团商品', ru: 'Групповая покупка', tg: 'Харидҳои гурӯҳӣ' } }
        } as PrizeInfo);
      } else {
        setPrizeInfo(prize as PrizeInfo);
      }
    } catch (error: any) {
      console.error('Search error:', error);
      toast.error('查询失败，请重试');
    } finally {
      setIsSearching(false);
    }
  };

  // 确认核销
  const handleVerify = async () => {
    if (!prizeInfo) return;

    // 检查状态
    if (prizeInfo.pickup_status !== 'PENDING_PICKUP') {
      toast.error('该奖品状态不允许核销');
      return;
    }

    // 检查是否过期
    const expiresAt = new Date(prizeInfo.expires_at);
    const now = new Date();
    if (expiresAt < now) {
      toast.error('该提货码已过期，请联系用户延期');
      return;
    }

    setIsVerifying(true);

    try {
      // 获取当前管理员ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('未登录');
      }

      // 更新奖品状态
      const tableName = prizeInfo.lottery?.title === '拼团商品' ? 'group_buy_results' : 'prizes';
      
      const { error: updateError } = await supabase
        .from(tableName)
        .update({
          pickup_status: 'PICKED_UP',
          picked_up_at: new Date().toISOString(),
          picked_up_by: user.id,
        })
        .eq('id', prizeInfo.id);

      if (updateError) {
        throw updateError;
      }

      // 记录核销日志
      const { error: logError } = await supabase
        .from('pickup_logs')
        .insert({
          prize_id: prizeInfo.id,
          pickup_code: prizeInfo.pickup_code,
          pickup_point_id: prizeInfo.pickup_point?.id,
          operator_id: user.id,
          operation_type: 'PICKUP',
          notes: `管理员核销提货码: ${prizeInfo.pickup_code}`,
        });

      if (logError) {
        console.error('Log error:', logError);
        // 不影响主流程
      }

      toast.success('核销成功！');
      
      // 重置状态
      setPickupCode('');
      setPrizeInfo(null);
    } catch (error: any) {
      console.error('Verify error:', error);
      toast.error(error.message || '核销失败，请重试');
    } finally {
      setIsVerifying(false);
    }
  };

  // 取消操作
  const handleCancel = () => {
    setPickupCode('');
    setPrizeInfo(null);
  };

  // 计算剩余天数
  const getRemainingDays = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">自提核销</h1>
          <p className="text-gray-600">扫描或输入用户的提货码进行核销</p>
        </div>

        {/* 搜索区域 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                提货码
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={pickupCode}
                  onChange={(e) => setPickupCode(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="请输入6-8位提货码"
                  className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg font-mono"
                  maxLength={8}
                />
                <QrCodeIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>
            <div className="pt-7">
              <button
                onClick={handleSearch}
                disabled={isSearching || pickupCode.length < 6}
                className="px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSearching ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>查询中...</span>
                  </>
                ) : (
                  <>
                    <MagnifyingGlassIcon className="w-5 h-5" />
                    <span>查询</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 奖品信息展示 */}
        {prizeInfo && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* 状态指示 */}
            <div className={`px-6 py-4 ${
              prizeInfo.pickup_status === 'PENDING_PICKUP' 
                ? 'bg-gradient-to-r from-green-50 to-emerald-50' 
                : 'bg-gradient-to-r from-red-50 to-orange-50'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {prizeInfo.pickup_status === 'PENDING_PICKUP' ? (
                    <>
                      <CheckCircleIcon className="w-6 h-6 text-green-600" />
                      <span className="text-green-800 font-medium">可以核销</span>
                    </>
                  ) : (
                    <>
                      <XCircleIcon className="w-6 h-6 text-red-600" />
                      <span className="text-red-800 font-medium">
                        {prizeInfo.pickup_status === 'PICKED_UP' ? '已核销' : '不可核销'}
                      </span>
                    </>
                  )}
                </div>
                {prizeInfo.expires_at && (
                  <div className="text-sm text-gray-600">
                    有效期至: {new Date(prizeInfo.expires_at).toLocaleDateString()}
                    {getRemainingDays(prizeInfo.expires_at) <= 7 && (
                      <span className="ml-2 text-red-600 font-medium">
                        (剩余 {getRemainingDays(prizeInfo.expires_at)} 天)
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* 用户信息 */}
              <div className="flex items-center space-x-4 pb-6 border-b">
                <div className="relative">
                  {prizeInfo.user.avatar_url ? (
                    <img
                      src={prizeInfo.user.avatar_url}
                      alt="User"
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                      <UserIcon className="w-8 h-8 text-purple-600" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">
                    {prizeInfo.user.first_name} {prizeInfo.user.last_name}
                  </h3>
                  <p className="text-sm text-gray-500">@{prizeInfo.user.telegram_username}</p>
                </div>
              </div>

              {/* 奖品信息 */}
              <div className="flex items-start space-x-4 pb-6 border-b">
                {prizeInfo.prize_image ? (
                  <img
                    src={prizeInfo.prize_image}
                    alt="Prize"
                    className="w-24 h-24 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                    <GiftIcon className="w-12 h-12 text-purple-600" />
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-gray-900 mb-1">
                    {prizeInfo.lottery?.title_i18n?.zh || prizeInfo.lottery?.title || prizeInfo.prize_name}
                  </h4>
                  <p className="text-sm text-gray-500 mb-2">
                    价值: ₽{prizeInfo.prize_value}
                  </p>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <ClockIcon className="w-4 h-4" />
                    <span>领取时间: {new Date(prizeInfo.claimed_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* 自提点信息 */}
              {prizeInfo.pickup_point && (
                <div className="flex items-start space-x-3 pb-6 border-b">
                  <MapPinIcon className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <h5 className="font-medium text-gray-900 mb-1">
                      {prizeInfo.pickup_point.name_i18n?.zh || prizeInfo.pickup_point.name}
                    </h5>
                    <p className="text-sm text-gray-600">
                      {prizeInfo.pickup_point.address_i18n?.zh || prizeInfo.pickup_point.address}
                    </p>
                  </div>
                </div>
              )}

              {/* 提货码展示 */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 text-center">
                <p className="text-sm text-gray-600 mb-2">提货码</p>
                <p className="text-4xl font-bold text-purple-600 font-mono tracking-wider">
                  {prizeInfo.pickup_code}
                </p>
              </div>

              {/* 操作按钮 */}
              <div className="flex space-x-4 pt-4">
                <button
                  onClick={handleCancel}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleVerify}
                  disabled={isVerifying || prizeInfo.pickup_status !== 'PENDING_PICKUP'}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isVerifying ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>核销中...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-5 h-5" />
                      <span>确认核销</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 使用说明 */}
        {!prizeInfo && (
          <div className="bg-blue-50 rounded-2xl p-6 mt-6">
            <h3 className="font-medium text-blue-900 mb-3">使用说明</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>请用户出示提货码（6-8位数字）</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>在上方输入框中输入提货码并点击查询</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>核对用户信息和商品信息无误后，点击"确认核销"</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>核销成功后，用户即可领取商品</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>如果提货码已过期，请引导用户在小程序中申请延期</span>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default PickupVerificationPage;
