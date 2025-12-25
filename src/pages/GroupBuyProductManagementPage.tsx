import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Plus, Edit, Copy, Trash2, Eye, EyeOff } from 'lucide-react';
import { MultiImageUpload } from '@/components/MultiImageUpload';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

interface GroupBuyProduct {
  id: string;
  title: { zh: string; ru: string; tg: string };
  description: { zh: string; ru: string; tg: string };
  image_url: string;
  images?: string[]; // 多张图片
  original_price: number;
  price_per_person: number;
  group_size: number; // 数据库字段名
  timeout_hours: number;
  product_type: string;
  stock_quantity: number;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

export default function GroupBuyProductManagementPage() {
  const [products, setProducts] = useState<GroupBuyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<GroupBuyProduct | null>(null);
  const [formData, setFormData] = useState({
    title_zh: '',
    title_ru: '',
    title_tg: '',
    description_zh: '',
    description_ru: '',
    description_tg: '',
    image_url: '',
    images: [] as string[],
    original_price: 0,
    group_size: 3,
    timeout_hours: 24,
    product_type: 'PHYSICAL',
    stock_quantity: 100,
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('group_buy_products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {throw error;}
      setProducts(data || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      alert('获取商品列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const productData = {
      title: {
        zh: formData.title_zh,
        ru: formData.title_ru,
        tg: formData.title_tg,
      },
      description: {
        zh: formData.description_zh,
        ru: formData.description_ru,
        tg: formData.description_tg,
      },
      image_url: formData.image_url,
      images: formData.images, // 保存多张图片
      original_price: formData.original_price,
      price_per_person: Math.round((formData.original_price / formData.group_size) * 100) / 100,
      group_size: formData.group_size, // 使用正确的数据库字段名
      timeout_hours: formData.timeout_hours,
      product_type: formData.product_type,
      stock_quantity: formData.stock_quantity,
      status: formData.status,
    };

    try {
      if (editingProduct) {
        // Update existing product
        const { error } = await supabase
          .from('group_buy_products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) {throw error;}
        alert('商品更新成功');
      } else {
        // Create new product
        const { error } = await supabase
          .from('group_buy_products')
          .insert([productData]);

        if (error) {throw error;}
        alert('商品创建成功');
      }

      setShowModal(false);
      setEditingProduct(null);
      resetForm();
      fetchProducts();
    } catch (error) {
      console.error('Failed to save product:', error);
      alert('保存商品失败');
    }
  };

  const handleEdit = (product: GroupBuyProduct) => {
    setEditingProduct(product);
    setFormData({
      title_zh: product.title?.zh || '',
      title_ru: product.title?.ru || '',
      title_tg: product.title?.tg || '',
      description_zh: product.description?.zh || '',
      description_ru: product.description?.ru || '',
      description_tg: product.description?.tg || '',
      image_url: product.image_url || '',
      images: product.images || [],
      original_price: product.original_price || 0,
      group_size: product.group_size || 3,
      timeout_hours: product.timeout_hours || 24,
      product_type: product.product_type || 'PHYSICAL',
      stock_quantity: product.stock_quantity || 100,
      status: product.status || 'ACTIVE',
    });
    setShowModal(true);
  };

  const handleDuplicate = (product: GroupBuyProduct) => {
    setEditingProduct(null);
    setFormData({
      title_zh: (product.title?.zh || '') + ' (复制)',
      title_ru: (product.title?.ru || '') + ' (копия)',
      title_tg: (product.title?.tg || '') + ' (нусха)',
      description_zh: product.description?.zh || '',
      description_ru: product.description?.ru || '',
      description_tg: product.description?.tg || '',
      image_url: product.image_url || '',
      images: product.images || [],
      original_price: product.original_price || 0,
      group_size: product.group_size || 3,
      timeout_hours: product.timeout_hours || 24,
      product_type: product.product_type || 'PHYSICAL',
      stock_quantity: product.stock_quantity || 100,
      status: 'INACTIVE',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个商品吗？删除后无法恢复。')) {return;}

    try {
      // 检查是否有进行中的拼团会话
      const { data: activeSessions } = await supabase
        .from('group_buy_sessions')
        .select('id')
        .eq('product_id', id)
        .eq('status', 'ACTIVE');

      if (activeSessions && activeSessions.length > 0) {
        alert('该商品有进行中的拼团会话，无法删除。请先等待会话结束或手动关闭。');
        return;
      }

      const { error } = await supabase
        .from('group_buy_products')
        .delete()
        .eq('id', id);

      if (error) {throw error;}
      alert('商品删除成功');
      fetchProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert('删除商品失败');
    }
  };

  const toggleStatus = async (product: GroupBuyProduct) => {
    try {
      const newStatus = product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const { error } = await supabase
        .from('group_buy_products')
        .update({ status: newStatus })
        .eq('id', product.id);

      if (error) {throw error;}
      fetchProducts();
    } catch (error) {
      console.error('Failed to toggle status:', error);
      alert('状态切换失败');
    }
  };

  const resetForm = () => {
    setFormData({
      title_zh: '',
      title_ru: '',
      title_tg: '',
      description_zh: '',
      description_ru: '',
      description_tg: '',
      image_url: '',
      images: [],
      original_price: 0,
      group_size: 3,
      timeout_hours: 24,
      product_type: 'PHYSICAL',
      stock_quantity: 100,
      status: 'ACTIVE',
    });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">拼团商品管理</h1>
        <button
          onClick={() => {
            setEditingProduct(null);
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600"
        >
          <Plus className="w-5 h-5" />
          创建商品
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">加载中...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-gray-500">暂无拼团商品</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <img
                src={product.image_url || 'https://via.placeholder.com/400x300'}
                alt={product.title?.zh || '商品图片'}
                className="w-full h-48 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=No+Image';
                }}
              />
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg truncate">{product.title?.zh || '未命名商品'}</h3>
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold ${
                      product.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {product.status === 'ACTIVE' ? '上架' : '下架'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {product.description?.zh || '暂无描述'}
                </p>
                <div className="space-y-1 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">原价:</span>
                    <span className="font-bold">₽{product.original_price || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">人均价格:</span>
                    <span className="font-bold text-orange-600">
                      ₽{product.price_per_person || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">参与人数:</span>
                    <span>{product.group_size || 0}人</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">超时时间:</span>
                    <span>{product.timeout_hours || 24}小时</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">库存:</span>
                    <span>{product.stock_quantity || 0}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleStatus(product)}
                    className="flex-1 flex items-center justify-center gap-1 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded text-sm"
                  >
                    {product.status === 'ACTIVE' ? (
                      <>
                        <EyeOff className="w-4 h-4" />
                        下架
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        上架
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(product)}
                    className="flex-1 flex items-center justify-center gap-1 bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded text-sm"
                  >
                    <Edit className="w-4 h-4" />
                    编辑
                  </button>
                  <button
                    onClick={() => handleDuplicate(product)}
                    className="flex-1 flex items-center justify-center gap-1 bg-green-100 hover:bg-green-200 text-green-700 px-3 py-2 rounded text-sm"
                  >
                    <Copy className="w-4 h-4" />
                    复制
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="flex items-center justify-center gap-1 bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingProduct ? '编辑商品' : '创建商品'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 标题部分 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">标题（中文）*</label>
                    <input
                      type="text"
                      value={formData.title_zh}
                      onChange={(e) => setFormData({ ...formData, title_zh: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">标题（俄语）*</label>
                    <input
                      type="text"
                      value={formData.title_ru}
                      onChange={(e) => setFormData({ ...formData, title_ru: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">标题（塔吉克语）*</label>
                    <input
                      type="text"
                      value={formData.title_tg}
                      onChange={(e) => setFormData({ ...formData, title_tg: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      required
                    />
                  </div>
                </div>

                {/* 描述部分 */}
                <div>
                  <label className="block text-sm font-medium mb-1">描述（中文）*</label>
                  <textarea
                    value={formData.description_zh}
                    onChange={(e) => setFormData({ ...formData, description_zh: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    rows={2}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">描述（俄语）*</label>
                  <textarea
                    value={formData.description_ru}
                    onChange={(e) => setFormData({ ...formData, description_ru: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    rows={2}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">描述（塔吉克语）*</label>
                  <textarea
                    value={formData.description_tg}
                    onChange={(e) => setFormData({ ...formData, description_tg: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    rows={2}
                    required
                  />
                </div>

                {/* 图片上传 */}
                <MultiImageUpload
                  label="商品图片 (最多5张)"
                  bucket="group-buy-products"
                  folder="products"
                  maxImages={5}
                  imageUrls={formData.images}
                  onImageUrlsChange={(urls) => setFormData({ ...formData, images: urls, image_url: urls[0] || '' })}
                />

                {/* 价格和参数 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">原价（₽）*</label>
                    <input
                      type="number"
                      value={formData.original_price}
                      onChange={(e) =>
                        setFormData({ ...formData, original_price: Number(e.target.value) })
                      }
                      className="w-full border rounded px-3 py-2"
                      min="1"
                      step="0.01"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">参与人数 *</label>
                    <input
                      type="number"
                      value={formData.group_size}
                      onChange={(e) =>
                        setFormData({ ...formData, group_size: Number(e.target.value) })
                      }
                      className="w-full border rounded px-3 py-2"
                      min="2"
                      max="100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">超时时间（小时）*</label>
                    <input
                      type="number"
                      value={formData.timeout_hours}
                      onChange={(e) =>
                        setFormData({ ...formData, timeout_hours: Number(e.target.value) })
                      }
                      className="w-full border rounded px-3 py-2"
                      min="1"
                      max="168"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">库存数量 *</label>
                    <input
                      type="number"
                      value={formData.stock_quantity}
                      onChange={(e) =>
                        setFormData({ ...formData, stock_quantity: Number(e.target.value) })
                      }
                      className="w-full border rounded px-3 py-2"
                      min="1"
                      required
                    />
                  </div>
                </div>

                {/* 人均价格预览 */}
                <div className="bg-orange-50 rounded-lg p-3">
                  <div className="text-sm text-gray-600">人均价格预览：</div>
                  <div className="text-2xl font-bold text-orange-600">
                    ₽{formData.group_size > 0 ? (formData.original_price / formData.group_size).toFixed(2) : '0.00'}
                  </div>
                </div>

                {/* 商品类型和状态 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">商品类型</label>
                    <select
                      value={formData.product_type}
                      onChange={(e) => setFormData({ ...formData, product_type: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="PHYSICAL">实物商品</option>
                      <option value="VIRTUAL">虚拟商品</option>
                      <option value="SERVICE">服务类</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">状态</label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          status: e.target.value as 'ACTIVE' | 'INACTIVE',
                        })
                      }
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="ACTIVE">上架</option>
                      <option value="INACTIVE">下架</option>
                    </select>
                  </div>
                </div>

                {/* 按钮 */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-orange-500 text-white py-2 rounded hover:bg-orange-600"
                  >
                    {editingProduct ? '更新' : '创建'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingProduct(null);
                      resetForm();
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded hover:bg-gray-300"
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
