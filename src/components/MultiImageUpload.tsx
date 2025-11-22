import React, { useState } from 'react';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Upload, X, Loader2, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadImage } from '@/lib/uploadImage';
import { SortableContainer, SortableElement, SortableHandle } from 'react-sortable-hoc';
import arrayMove from 'array-move';

interface MultiImageUploadProps {
  label: string;
  bucket: string;
  folder: string;
  maxImages: number;
  imageUrls: string[];
  onImageUrlsChange: (urls: string[]) => void;
}

interface SortableItemProps {
  url: string;
  index: number;
  onRemove: (index: number) => void;
}

const DragHandle = SortableHandle(() => (
  <span className="absolute top-1 left-1 p-1 cursor-grab bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-colors z-10">
    <GripVertical className="w-4 h-4" />
  </span>
));

const SortableItem: React.FC<SortableItemProps> = SortableElement(({ url, index, onRemove }: SortableItemProps) => (
  <div className="relative aspect-square rounded-lg overflow-hidden border border-gray-300">
    <DragHandle />
    <img src={url} alt={`Image ${index + 1}`} className="w-full h-full object-cover" />
    <button
      type="button"
      onClick={() => onRemove(index)}
      className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors z-10"
    >
      <X className="w-4 h-4" />
    </button>
  </div>
));

const SortableList = SortableContainer(({ items, onRemove }: { items: string[], onRemove: (index: number) => void }) => {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
      {items.map((url, index) => (
        <SortableItem key={`item-${index}`} index={index} url={url} onRemove={onRemove} />
      ))}
    </div>
  );
});

export const MultiImageUpload: React.FC<MultiImageUploadProps> = ({
  label,
  bucket,
  folder,
  maxImages,
  imageUrls,
  onImageUrlsChange,
}) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    const availableSlots = maxImages - imageUrls.length;

    if (newFiles.length > availableSlots) {
      toast.error(`最多只能上传 ${maxImages} 张图片，您还可以上传 ${availableSlots} 张。`);
      return;
    }

    setIsUploading(true);
    const uploadPromises = newFiles.map(file => uploadImage(file, true, bucket, folder));

    try {
      const newUrls = await Promise.all(uploadPromises);
      onImageUrlsChange([...imageUrls, ...newUrls]);
      toast.success('图片上传成功并已优化!');
    } catch (error: any) {
      toast.error(`图片上传失败: ${error.message}`);
      console.error('Image upload error:', error);
    } finally {
      setIsUploading(false);
      e.target.value = ''; // 清空文件输入框
    }
  };

  const handleRemove = (indexToRemove: number) => {
    const newUrls = imageUrls.filter((_, index) => index !== indexToRemove);
    onImageUrlsChange(newUrls);
  };

  const onSortEnd = ({ oldIndex, newIndex }: { oldIndex: number, newIndex: number }) => {
    onImageUrlsChange(arrayMove(imageUrls, oldIndex, newIndex));
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <SortableList items={imageUrls} onSortEnd={onSortEnd} onRemove={handleRemove} axis="xy" useDragHandle />
      
      {imageUrls.length < maxImages && (
        <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors bg-gray-50">
          {isUploading ? (
            <div className="flex items-center space-x-2 text-blue-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>上传中...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center text-gray-500">
              <Upload className="w-6 h-6" />
              <span className="mt-1 text-sm">点击上传图片 (最多 {maxImages} 张)</span>
            </div>
          )}
          <Input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
            disabled={isUploading}
          />
        </label>
      )}
      <p className="text-xs text-gray-500">
        图片将自动压缩并转换为 WebP 格式 (最大 1MB, 1920px)。拖动图片可排序。
      </p>
    </div>
  );
};
