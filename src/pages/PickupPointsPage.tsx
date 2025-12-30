import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface PickupPoint {
  id: string;
  name: string;
  name_i18n: { zh: string; ru: string; tg: string };
  address: string;
  address_i18n: { zh: string; ru: string; tg: string };
  latitude: number | null;
  longitude: number | null;
  contact_phone: string | null;
  contact_person: string | null;
  business_hours: string | null;
  is_active: boolean;
  created_at: string;
}

const emptyPickupPoint: Omit<PickupPoint, 'id' | 'created_at'> = {
  name: '',
  name_i18n: { zh: '', ru: '', tg: '' },
  address: '',
  address_i18n: { zh: '', ru: '', tg: '' },
  latitude: null,
  longitude: null,
  contact_phone: '',
  contact_person: '',
  business_hours: '',
  is_active: true,
};

export default function PickupPointsPage() {
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPoint, setEditingPoint] = useState<PickupPoint | null>(null);
  const [formData, setFormData] = useState(emptyPickupPoint);
  const [saving, setSaving] = useState(false);

  // 加载自提点列表
  const loadPickupPoints = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pickup_points')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPickupPoints(data || []);
    } catch (error) {
      console.error('加载自提点失败:', error);
      alert('加载自提点失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPickupPoints();
  }, []);

  // 打开新增/编辑弹窗
  const openModal = (point?: PickupPoint) => {
    if (point) {
      setEditingPoint(point);
      setFormData({
        name: point.name,
        name_i18n: point.name_i18n || { zh: '', ru: '', tg: '' },
        address: point.address,
        address_i18n: point.address_i18n || { zh: '', ru: '', tg: '' },
        latitude: point.latitude,
        longitude: point.longitude,
        contact_phone: point.contact_phone || '',
        contact_person: point.contact_person || '',
        business_hours: point.business_hours || '',
        is_active: point.is_active,
      });
    } else {
      setEditingPoint(null);
      setFormData(emptyPickupPoint);
    }
    setShowModal(true);
  };

  // 关闭弹窗
  const closeModal = () => {
    setShowModal(false);
    setEditingPoint(null);
    setFormData(emptyPickupPoint);
  };

  // 保存自提点
  const handleSave = async () => {
    if (!formData.name || !formData.address) {
      alert('请填写名称和地址');
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        name: formData.name,
        name_i18n: formData.name_i18n,
        address: formData.address,
        address_i18n: formData.address_i18n,
        latitude: formData.latitude,
        longitude: formData.longitude,
        contact_phone: formData.contact_phone || null,
        contact_person: formData.contact_person || null,
        business_hours: formData.business_hours || null,
        is_active: formData.is_active,
      };

      if (editingPoint) {
        // 更新
        const { error } = await supabase
          .from('pickup_points')
          .update(dataToSave)
          .eq('id', editingPoint.id);

        if (error) throw error;
        alert('更新成功');
      } else {
        // 新增
        const { error } = await supabase
          .from('pickup_points')
          .insert(dataToSave);

        if (error) throw error;
        alert('添加成功');
      }

      closeModal();
      loadPickupPoints();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 删除自提点
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个自提点吗？')) return;

    try {
      const { error } = await supabase
        .from('pickup_points')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('删除成功');
      loadPickupPoints();
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
    }
  };

  // 切换启用状态
  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('pickup_points')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      loadPickupPoints();
    } catch (error) {
      console.error('更新状态失败:', error);
      alert('更新状态失败');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">自提点管理</h1>
        <button
          onClick={() => openModal()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          + 添加自提点
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-500">加载中...</p>
        </div>
      ) : pickupPoints.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-lg">
          <p className="text-gray-500">暂无自提点，请点击上方按钮添加</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  地址
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  联系人
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  联系电话
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  营业时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pickupPoints.map((point) => (
                <tr key={point.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{point.name}</div>
                    {point.name_i18n?.ru && (
                      <div className="text-xs text-gray-500">{point.name_i18n.ru}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{point.address}</div>
                    {point.address_i18n?.ru && (
                      <div className="text-xs text-gray-500">{point.address_i18n.ru}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {point.contact_person || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {point.contact_phone || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {point.business_hours || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleActive(point.id, point.is_active)}
                      className={`px-2 py-1 text-xs rounded-full ${
                        point.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {point.is_active ? '启用' : '停用'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openModal(point)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(point.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 新增/编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingPoint ? '编辑自提点' : '添加自提点'}
            </h2>

            <div className="space-y-4">
              {/* 名称 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  名称 (中文) *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例如：杜尚别总店"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    名称 (俄文)
                  </label>
                  <input
                    type="text"
                    value={formData.name_i18n.ru}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name_i18n: { ...formData.name_i18n, ru: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    名称 (塔文)
                  </label>
                  <input
                    type="text"
                    value={formData.name_i18n.tg}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name_i18n: { ...formData.name_i18n, tg: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* 地址 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  地址 (中文) *
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="详细地址"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    地址 (俄文)
                  </label>
                  <input
                    type="text"
                    value={formData.address_i18n.ru}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address_i18n: { ...formData.address_i18n, ru: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    地址 (塔文)
                  </label>
                  <input
                    type="text"
                    value={formData.address_i18n.tg}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address_i18n: { ...formData.address_i18n, tg: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* 坐标 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    纬度
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.latitude || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        latitude: e.target.value ? parseFloat(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="例如：38.5598"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    经度
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.longitude || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        longitude: e.target.value ? parseFloat(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="例如：68.7870"
                  />
                </div>
              </div>

              {/* 联系信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    联系人
                  </label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) =>
                      setFormData({ ...formData, contact_person: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    联系电话
                  </label>
                  <input
                    type="text"
                    value={formData.contact_phone}
                    onChange={(e) =>
                      setFormData({ ...formData, contact_phone: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+992 XXX XXX XXX"
                  />
                </div>
              </div>

              {/* 营业时间 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  营业时间
                </label>
                <input
                  type="text"
                  value={formData.business_hours}
                  onChange={(e) =>
                    setFormData({ ...formData, business_hours: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例如：周一至周五 9:00-18:00"
                />
              </div>

              {/* 启用状态 */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                  启用此自提点
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={closeModal}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
