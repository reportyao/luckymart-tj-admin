import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { useSupabase } from '../contexts/SupabaseContext';
import toast from 'react-hot-toast';

interface BankConfig {
  id: string;
  bank_name_i18n: {
    zh: string;
    ru: string;
    tg: string;
  };
  account_name: string;
  account_number: string;
  bank_code: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export default function BankConfigPage() {
  const { supabase } = useSupabase();
  const [banks, setBanks] = useState<BankConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<BankConfig>>({
    bank_name_i18n: { zh: '', ru: '', tg: '' },
    account_name: '',
    account_number: '',
    bank_code: '',
    is_active: true,
    sort_order: 0,
  });

  useEffect(() => {
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('type', 'BANK_TRANSFER')
        .order('sort_order', { ascending: true });

      if (error) {throw error;}
      setBanks(data || []);
    } catch (error: any) {
      toast.error('加载银行配置失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.bank_name_i18n?.zh || !formData.account_name || !formData.account_number) {
        toast.error('请填写必填字段');
        return;
      }

      if (editingId) {
        // 更新
        const { error } = await supabase
          .from('payment_methods')
          .update({
            bank_name_i18n: formData.bank_name_i18n,
            account_name: formData.account_name,
            account_number: formData.account_number,
            bank_code: formData.bank_code,
            is_active: formData.is_active,
            sort_order: formData.sort_order,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);

        if (error) {throw error;}
        toast.success('更新成功');
      } else {
        // 新增
        const { error } = await supabase
          .from('payment_methods')
          .insert({
            type: 'BANK_TRANSFER',
            bank_name_i18n: formData.bank_name_i18n,
            account_name: formData.account_name,
            account_number: formData.account_number,
            bank_code: formData.bank_code,
            is_active: formData.is_active,
            sort_order: formData.sort_order,
          });

        if (error) {throw error;}
        toast.success('添加成功');
      }

      setEditingId(null);
      setFormData({
        bank_name_i18n: { zh: '', ru: '', tg: '' },
        account_name: '',
        account_number: '',
        bank_code: '',
        is_active: true,
        sort_order: 0,
      });
      fetchBanks();
    } catch (error: any) {
      toast.error('保存失败: ' + error.message);
    }
  };

  const handleEdit = (bank: BankConfig) => {
    setEditingId(bank.id);
    setFormData({
      bank_name_i18n: bank.bank_name_i18n,
      account_name: bank.account_name,
      account_number: bank.account_number,
      bank_code: bank.bank_code,
      is_active: bank.is_active,
      sort_order: bank.sort_order,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个银行配置吗?')) {return;}

    try {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', id);

      if (error) {throw error;}
      toast.success('删除成功');
      fetchBanks();
    } catch (error: any) {
      toast.error('删除失败: ' + error.message);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      bank_name_i18n: { zh: '', ru: '', tg: '' },
      account_name: '',
      account_number: '',
      bank_code: '',
      is_active: true,
      sort_order: 0,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">充值银行参数配置</h1>
        <p className="mt-1 text-sm text-gray-500">
          管理用户充值时可选择的银行账户信息(支持多语言)
        </p>
      </div>

      {/* 编辑表单 */}
      <div className="mb-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">
          {editingId ? '编辑银行配置' : '添加银行配置'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 银行名称 - 中文 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              银行名称 (中文) *
            </label>
            <input
              type="text"
              value={formData.bank_name_i18n?.zh || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  bank_name_i18n: { ...formData.bank_name_i18n!, zh: e.target.value },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="例如: 中国银行"
            />
          </div>

          {/* 银行名称 - 俄语 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              银行名称 (俄语)
            </label>
            <input
              type="text"
              value={formData.bank_name_i18n?.ru || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  bank_name_i18n: { ...formData.bank_name_i18n!, ru: e.target.value },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="例如: Банк Китая"
            />
          </div>

          {/* 银行名称 - 塔吉克语 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              银行名称 (塔吉克语)
            </label>
            <input
              type="text"
              value={formData.bank_name_i18n?.tg || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  bank_name_i18n: { ...formData.bank_name_i18n!, tg: e.target.value },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="例如: Бонки Чин"
            />
          </div>

          {/* 账户名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              账户名 *
            </label>
            <input
              type="text"
              value={formData.account_name || ''}
              onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="例如: 张三"
            />
          </div>

          {/* 账户号码 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              账户号码 *
            </label>
            <input
              type="text"
              value={formData.account_number || ''}
              onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="例如: 6222021234567890123"
            />
          </div>

          {/* 银行代码 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              银行代码 (可选)
            </label>
            <input
              type="text"
              value={formData.bank_code || ''}
              onChange={(e) => setFormData({ ...formData, bank_code: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="例如: BOC"
            />
          </div>

          {/* 排序 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              排序
            </label>
            <input
              type="number"
              value={formData.sort_order || 0}
              onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* 是否启用 */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
              启用
            </label>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Save className="w-4 h-4" />
            保存
          </button>
          {editingId && (
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              <X className="w-4 h-4" />
              取消
            </button>
          )}
        </div>
      </div>

      {/* 银行列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                银行名称
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                账户名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                账户号码
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                银行代码
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                排序
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                状态
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {banks.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  暂无银行配置,点击上方"添加银行配置"开始添加
                </td>
              </tr>
            ) : (
              banks.map((bank) => (
                <tr key={bank.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {bank.bank_name_i18n.zh}
                    </div>
                    <div className="text-xs text-gray-500">
                      {bank.bank_name_i18n.ru} / {bank.bank_name_i18n.tg}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {bank.account_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-mono">
                    {bank.account_number}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {bank.bank_code || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {bank.sort_order}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        bank.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {bank.is_active ? '启用' : '禁用'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(bank)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(bank.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
