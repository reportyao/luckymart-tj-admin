import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/contexts/SupabaseContext';
import { MultiLanguageInput } from '@/components/MultiLanguageInput';
import toast from 'react-hot-toast';

interface PaymentConfig {
  id: string;
  name: string;
  name_i18n: Record<string, string>;
  description_i18n: Record<string, string>;
  config: {
    account_number?: string;
    account_name?: string;
    bank_name?: string;
    qr_code_url?: string;
    api_key?: string;
    api_secret?: string;
    merchant_id?: string;
    [key: string]: any;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface FormData {
  name: string;
  name_i18n: Record<string, string>;
  description_i18n: Record<string, string>;
  config: Record<string, string>;
  is_active: boolean;
}

const initialFormData: FormData = {
  name: '',
  name_i18n: { zh: '', en: '', ru: '', tg: '' },
  description_i18n: { zh: '', en: '', ru: '', tg: '' },
  config: {
    account_number: '',
    account_name: '',
    bank_name: '',
    qr_code_url: '',
  },
  is_active: true,
};

export const PaymentConfigPage: React.FC = () => {
  const { supabase } = useSupabase();
  const [configs, setConfigs] = useState<PaymentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<PaymentConfig | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payment_config')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
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
    setFormData(initialFormData);
    setShowModal(true);
  };

  const handleEdit = (config: PaymentConfig) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      name_i18n: config.name_i18n || { zh: '', en: '', ru: '', tg: '' },
      description_i18n: config.description_i18n || { zh: '', en: '', ru: '', tg: '' },
      config: config.config || {},
      is_active: config.is_active,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('请输入支付方式名称');
      return;
    }

    try {
      const payload = {
        name: formData.name,
        name_i18n: formData.name_i18n,
        description_i18n: formData.description_i18n,
        config: formData.config,
        is_active: formData.is_active,
        updated_at: new Date().toISOString(),
      };

      if (editingConfig) {
        // 更新
        const { error } = await supabase
          .from('payment_config')
          .update(payload)
          .eq('id', editingConfig.id);

        if (error) throw error;
        toast.success('支付配置更新成功');
      } else {
        // 创建
        const { error } = await supabase
          .from('payment_config')
          .insert({
            ...payload,
            created_at: new Date().toISOString(),
          });

        if (error) throw error;
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
    if (!confirm(`确定要删除支付方式"${name}"吗？`)) return;

    try {
      const { error } = await supabase
        .from('payment_config')
        .delete()
        .eq('id', id);

      if (error) throw error;
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
          is_active: !currentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      toast.success('状态更新成功');
      fetchConfigs();
    } catch (error: any) {
      toast.error(`更新失败: ${error.message}`);
    }
  };

  const handleConfigChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [key]: value,
      },
    }));
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
                状态
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                更新时间
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {configs.map((config) => (
              <tr key={config.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{config.name}</div>
                  <div className="text-xs text-gray-500">
                    {config.name_i18n?.zh || config.name_i18n?.en || '-'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {config.config?.account_name && (
                      <div>户名: {config.config.account_name}</div>
                    )}
                    {config.config?.account_number && (
                      <div>账号: {config.config.account_number}</div>
                    )}
                    {config.config?.bank_name && (
                      <div>银行: {config.config.bank_name}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    config.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {config.is_active ? '启用' : '禁用'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(config.updated_at || config.created_at).toLocaleString('zh-CN')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEdit(config)}
                    className="text-indigo-600 hover:text-indigo-900 mr-3"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => toggleActive(config.id, config.is_active)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    {config.is_active ? '禁用' : '启用'}
                  </button>
                  <button
                    onClick={() => handleDelete(config.id, config.name)}
                    className="text-red-600 hover:text-red-900"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {configs.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            暂无支付配置，点击右上角"添加支付方式"开始配置
          </div>
        )}
      </div>

      {/* 创建/编辑模态框 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl m-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingConfig ? '编辑支付方式' : '添加支付方式'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 基本信息 */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-700">基本信息</h3>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    支付方式标识 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="例如: bank_transfer, alipay, wechat_pay"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    用于系统识别的唯一标识，建议使用英文
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
              </div>

              {/* 配置信息 */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-700">配置信息</h3>
                
                <div>
                  <label className="block text-sm font-medium mb-1">账户名称</label>
                  <input
                    type="text"
                    value={formData.config.account_name || ''}
                    onChange={(e) => handleConfigChange('account_name', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="收款账户名称"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">账户号码</label>
                  <input
                    type="text"
                    value={formData.config.account_number || ''}
                    onChange={(e) => handleConfigChange('account_number', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="银行账号/支付账号"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">银行名称</label>
                  <input
                    type="text"
                    value={formData.config.bank_name || ''}
                    onChange={(e) => handleConfigChange('bank_name', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="银行名称或支付平台"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">二维码URL</label>
                  <input
                    type="text"
                    value={formData.config.qr_code_url || ''}
                    onChange={(e) => handleConfigChange('qr_code_url', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="收款二维码图片URL"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">API Key（可选）</label>
                  <input
                    type="text"
                    value={formData.config.api_key || ''}
                    onChange={(e) => handleConfigChange('api_key', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="第三方支付API Key"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">API Secret（可选）</label>
                  <input
                    type="password"
                    value={formData.config.api_secret || ''}
                    onChange={(e) => handleConfigChange('api_secret', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="第三方支付API Secret"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">商户ID（可选）</label>
                  <input
                    type="text"
                    value={formData.config.merchant_id || ''}
                    onChange={(e) => handleConfigChange('merchant_id', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="商户ID或Merchant ID"
                  />
                </div>
              </div>

              {/* 状态 */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <label htmlFor="is_active" className="ml-2 text-sm font-medium">
                  启用此支付方式
                </label>
              </div>

              {/* 按钮 */}
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700"
                >
                  {editingConfig ? '更新' : '创建'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentConfigPage;
