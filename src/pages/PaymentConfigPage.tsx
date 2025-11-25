import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/contexts/SupabaseContext';
import { MultiLanguageInput } from '@/components/MultiLanguageInput';
import { ImageUpload } from '@/components/ui/ImageUpload';
import toast from 'react-hot-toast';

interface PaymentConfig {
  id: string;
  config_key: string;
  config_type: string;
  config_data: {
    method: string;
    enabled: boolean;
    account_number?: string;
    account_name?: string;
    bank_name?: string;
    qr_code_url?: string;
    instructions: {
      zh: string;
      ru: string;
      tg: string;
    };
    min_amount: number;
    max_amount: number;
    processing_time: string;
    [key: string]: any;
  };
  name_i18n: Record<string, string>;
  description_i18n: Record<string, string>;
  is_enabled: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface FormData {
  config_key: string;
  config_type: string;
  method: string;
  name_i18n: Record<string, string>;
  description_i18n: Record<string, string>;
  instructions: Record<string, string>;
  account_number: string;
  account_name: string;
  bank_name: string;
  min_amount: number;
  max_amount: number;
  processing_time: string;
  is_enabled: boolean;
  sort_order: number;
  qr_code_urls: string[];
}

const initialFormData: FormData = {
  config_key: '',
  config_type: 'DEPOSIT',
  method: '',
  name_i18n: { zh: '', ru: '', tg: '' },
  description_i18n: { zh: '', ru: '', tg: '' },
  instructions: { zh: '', ru: '', tg: '' },
  account_number: '',
  account_name: '',
  bank_name: '',
  min_amount: 10,
  max_amount: 50000,
  processing_time: '30',
  is_enabled: true,
  sort_order: 0,
  qr_code_urls: [],
};

export const PaymentConfigPage: React.FC = () => {
  const { supabase } = useSupabase();
  const [configs, setConfigs] = useState<PaymentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<PaymentConfig | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [activeTab, setActiveTab] = useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT');

  useEffect(() => {
    fetchConfigs();
  }, [activeTab]);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payment_config')
        .select('*')
        .eq('config_type', activeTab)
        .order('sort_order', { ascending: true });

      if (error) {throw error;}
      setConfigs(data || []);
    } catch (error: any) {
      toast.error(`加载支付配置失败: ${error.message}`);
      console.error('Error fetching payment configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingConfig(null);
    setFormData({ ...initialFormData, config_type: activeTab });
    setShowModal(true);
  };

  const handleEdit = (config: PaymentConfig) => {
    setEditingConfig(config);
    const configData = config.config_data || {};
    setFormData({
      config_key: config.config_key,
      config_type: config.config_type,
      method: configData.method || '',
      name_i18n: config.name_i18n || { zh: '', ru: '', tg: '' },
      description_i18n: config.description_i18n || { zh: '', ru: '', tg: '' },
      instructions: configData.instructions || { zh: '', ru: '', tg: '' },
      account_number: configData.account_number || '',
      account_name: configData.account_name || '',
      bank_name: configData.bank_name || '',
      min_amount: configData.min_amount || 10,
      max_amount: configData.max_amount || 50000,
      processing_time: configData.processing_time || '30',
      is_enabled: config.is_enabled,
      sort_order: config.sort_order || 0,
      qr_code_urls: configData.qr_code_url ? [configData.qr_code_url] : [],
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.config_key.trim()) {
      toast.error('请输入支付方式标识');
      return;
    }

    if (!formData.method.trim()) {
      toast.error('请输入支付方法标识');
      return;
    }

    if (formData.min_amount <= 0) {
      toast.error('最小金额必须大于0');
      return;
    }

    if (formData.max_amount <= formData.min_amount) {
      toast.error('最大金额必须大于最小金额');
      return;
    }

    try {
      // 构建config_data
      const configData = {
        method: formData.method,
        enabled: formData.is_enabled,
        account_number: formData.account_number,
        account_name: formData.account_name,
        bank_name: formData.bank_name,
        qr_code_url: formData.qr_code_urls[0] || null,
        instructions: formData.instructions,
        min_amount: formData.min_amount,
        max_amount: formData.max_amount,
        processing_time: formData.processing_time,
      };

      const payload = {
        config_key: formData.config_key,
        config_type: formData.config_type,
        config_data: configData,
        config: configData, // 兼容旧字段
        name_i18n: formData.name_i18n,
        description_i18n: formData.description_i18n,
        is_enabled: formData.is_enabled,
        is_active: formData.is_enabled,
        sort_order: formData.sort_order,
        updated_at: new Date().toISOString(),
      };

      if (editingConfig) {
        // 更新
        const { error } = await supabase
          .from('payment_config')
          .update(payload)
          .eq('id', editingConfig.id);

        if (error) {throw error;}
        toast.success('支付配置更新成功');
      } else {
        // 创建
        const { error } = await supabase
          .from('payment_config')
          .insert({
            ...payload,
            created_at: new Date().toISOString(),
          });

        if (error) {throw error;}
        toast.success('支付配置创建成功');
      }

      setShowModal(false);
      fetchConfigs();
    } catch (error: any) {
      toast.error(`操作失败: ${error.message}`);
      console.error('Error saving payment config:', error);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定要删除支付方式"${name}"吗？`)) {return;}

    try {
      const { error } = await supabase
        .from('payment_config')
        .delete()
        .eq('id', id);

      if (error) {throw error;}
      toast.success('支付配置已删除');
      fetchConfigs();
    } catch (error: any) {
      toast.error(`删除失败: ${error.message}`);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('payment_config')
        .update({ 
          is_enabled: !currentStatus,
          is_active: !currentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {throw error;}
      toast.success('状态更新成功');
      fetchConfigs();
    } catch (error: any) {
      toast.error(`更新失败: ${error.message}`);
    }
  };

  if (loading) {
    return <div className="p-6">加载中...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">支付配置</h1>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          + 添加支付方式
        </button>
      </div>

      {/* 标签页 */}
      <div className="mb-4 border-b">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('DEPOSIT')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'DEPOSIT'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            充值配置
          </button>
          <button
            onClick={() => setActiveTab('WITHDRAWAL')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'WITHDRAWAL'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            提现配置
          </button>
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                名称
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                账户信息
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                金额范围
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                状态
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                排序
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {configs.map((config) => {
              const configData = config.config_data || {};
              return (
                <tr key={config.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{config.config_key}</div>
                    <div className="text-xs text-gray-500">
                      {config.name_i18n?.zh || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {configData.bank_name && (
                        <div>银行: {configData.bank_name}</div>
                      )}
                      {configData.account_name && (
                        <div>户名: {configData.account_name}</div>
                      )}
                      {configData.account_number && (
                        <div>账号: {configData.account_number}</div>
                      )}
                      {configData.qr_code_url && (
                        <div className="text-xs text-blue-600">✓ 已上传二维码</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {configData.min_amount || 0} - {configData.max_amount || 0} TJS
                    <div className="text-xs text-gray-400">
                      {configData.processing_time || 0}分钟
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      config.is_enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {config.is_enabled ? '启用' : '禁用'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {config.sort_order}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(config)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => toggleActive(config.id, config.is_enabled)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      {config.is_enabled ? '禁用' : '启用'}
                    </button>
                    <button
                      onClick={() => handleDelete(config.id, config.config_key)}
                      className="text-red-600 hover:text-red-900"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {configs.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            暂无{activeTab === 'DEPOSIT' ? '充值' : '提现'}配置，点击右上角"添加支付方式"开始配置
          </div>
        )}
      </div>

      {/* 创建/编辑模态框 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingConfig ? '编辑支付方式' : '添加支付方式'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 基本信息 */}
              <div className="space-y-4 border-b pb-4">
                <h3 className="font-semibold text-gray-700">基本信息</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      配置类型 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.config_type}
                      onChange={(e) => setFormData({ ...formData, config_type: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      disabled={!!editingConfig}
                    >
                      <option value="DEPOSIT">充值</option>
                      <option value="WITHDRAWAL">提现</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      支付方式标识 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.config_key}
                      onChange={(e) => setFormData({ ...formData, config_key: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="例如: DC银行, Alif Mobi"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    支付方法代码 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.method}
                    onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="例如: DC_BANK, ALIF_MOBI"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    用于系统识别的方法代码，建议使用大写英文和下划线
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    显示名称（多语言）
                  </label>
                  <MultiLanguageInput
                    value={formData.name_i18n}
                    onChange={(value) => setFormData({ ...formData, name_i18n: value })}
                    placeholder="支付方式名称"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    描述（多语言）
                  </label>
                  <MultiLanguageInput
                    value={formData.description_i18n}
                    onChange={(value) => setFormData({ ...formData, description_i18n: value })}
                    placeholder="支付方式描述"
                    multiline
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    排序顺序
                  </label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="数字越小越靠前"
                    min="0"
                  />
                </div>
              </div>

              {/* 账户信息 */}
              <div className="space-y-4 border-b pb-4">
                <h3 className="font-semibold text-gray-700">账户信息</h3>
                
                <div>
                  <label className="block text-sm font-medium mb-1">银行名称</label>
                  <input
                    type="text"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="例如: DC Bank, Alif Mobi"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">账户名称</label>
                    <input
                      type="text"
                      value={formData.account_name}
                      onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="收款账户名称"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">账户号码</label>
                    <input
                      type="text"
                      value={formData.account_number}
                      onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="银行账号/支付账号"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    收款二维码（选填）
                  </label>
                  <ImageUpload
                    value={formData.qr_code_urls}
                    onChange={(urls) => setFormData({ ...formData, qr_code_urls: urls })}
                    maxImages={1}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    上传收款二维码图片，支持JPG、PNG格式
                  </p>
                </div>
              </div>

              {/* 金额和时间设置 */}
              <div className="space-y-4 border-b pb-4">
                <h3 className="font-semibold text-gray-700">金额和时间设置</h3>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      最小金额 (TJS) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.min_amount}
                      onChange={(e) => setFormData({ ...formData, min_amount: Number(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="10"
                      min="1"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      最大金额 (TJS) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.max_amount}
                      onChange={(e) => setFormData({ ...formData, max_amount: Number(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="50000"
                      min="1"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      处理时间 (分钟) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.processing_time}
                      onChange={(e) => setFormData({ ...formData, processing_time: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="30"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 操作说明 */}
              <div className="space-y-4 border-b pb-4">
                <h3 className="font-semibold text-gray-700">
                  操作说明（多语言） <span className="text-red-500">*</span>
                </h3>
                <p className="text-sm text-gray-500">
                  用户在充值/提现时会看到这些说明，请详细说明操作步骤
                </p>
                <MultiLanguageInput
                  value={formData.instructions}
                  onChange={(value) => setFormData({ ...formData, instructions: value })}
                  placeholder="详细的操作步骤说明"
                  multiline
                  rows={6}
                />
              </div>

              {/* 状态 */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_enabled"
                  checked={formData.is_enabled}
                  onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked })}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                />
                <label htmlFor="is_enabled" className="ml-2 block text-sm text-gray-900">
                  启用此支付方式
                </label>
              </div>

              {/* 按钮 */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  {editingConfig ? '更新' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
