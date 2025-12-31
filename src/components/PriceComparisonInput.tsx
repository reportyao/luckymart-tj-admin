import React, { useState } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Trash2, Plus } from 'lucide-react';

interface PriceComparisonItem {
  platform: string;
  price: number;
}

interface PriceComparisonInputProps {
  value: PriceComparisonItem[];
  onChange: (value: PriceComparisonItem[]) => void;
}

/**
 * 比价清单输入组件
 * 用于在后台管理中添加/编辑商品的比价信息
 */
export const PriceComparisonInput: React.FC<PriceComparisonInputProps> = ({
  value = [],
  onChange,
}) => {
  const [newPlatform, setNewPlatform] = useState('');
  const [newPrice, setNewPrice] = useState('');

  const handleAdd = () => {
    if (!newPlatform.trim() || !newPrice) {
      return;
    }

    const price = parseFloat(newPrice);
    if (isNaN(price) || price <= 0) {
      return;
    }

    const newItem: PriceComparisonItem = {
      platform: newPlatform.trim(),
      price: price,
    };

    onChange([...value, newItem]);
    setNewPlatform('');
    setNewPrice('');
  };

  const handleRemove = (index: number) => {
    const newValue = [...value];
    newValue.splice(index, 1);
    onChange(newValue);
  };

  const handleUpdate = (index: number, field: 'platform' | 'price', fieldValue: string) => {
    const newValue = [...value];
    if (field === 'platform') {
      newValue[index].platform = fieldValue;
    } else {
      const price = parseFloat(fieldValue);
      if (!isNaN(price) && price > 0) {
        newValue[index].price = price;
      }
    }
    onChange(newValue);
  };

  return (
    <div className="space-y-4">
      <Label className="text-base font-semibold">比价清单</Label>
      <p className="text-sm text-gray-500">
        添加其他平台的价格对比，帮助用户了解价格优势
      </p>

      {/* 已添加的比价项 */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((item, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
              <Input
                value={item.platform}
                onChange={(e) => handleUpdate(index, 'platform', e.target.value)}
                placeholder="平台名称"
                className="flex-1"
              />
              <div className="flex items-center gap-1">
                <span className="text-gray-500">TJS</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.price}
                  onChange={(e) => handleUpdate(index, 'price', e.target.value)}
                  placeholder="价格"
                  className="w-24"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(index)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* 添加新比价项 */}
      <div className="flex items-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg">
        <Input
          value={newPlatform}
          onChange={(e) => setNewPlatform(e.target.value)}
          placeholder="平台名称 (如: Somon.tj)"
          className="flex-1"
        />
        <div className="flex items-center gap-1">
          <span className="text-gray-500">TJS</span>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            placeholder="价格"
            className="w-24"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={!newPlatform.trim() || !newPrice}
          className="whitespace-nowrap"
        >
          <Plus className="w-4 h-4 mr-1" />
          添加
        </Button>
      </div>

      {/* 预览效果 */}
      {value.length > 0 && (
        <div className="p-3 bg-gray-100 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-2">前端展示预览：</p>
          <div className="text-sm text-gray-600 space-y-1">
            {value.map((item, index) => (
              <div key={index} className="flex items-center">
                <span className="text-red-500 mr-2">❌</span>
                <span>{item.platform}:</span>
                <span className="ml-2 text-gray-500">TJS {item.price.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceComparisonInput;
