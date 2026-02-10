import React, { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '@/contexts/SupabaseContext';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Edit, Loader2 } from 'lucide-react';

interface Showoff {
  id: string;
  user_id: string;
  content: string;
  image_urls: string[];
  status: string;
  reward_coins: number;
  likes_count: number;
  comments_count: number;
  is_operational: boolean;
  is_hidden: boolean;
  display_username?: string;
  display_avatar_url?: string;
  lottery_id?: string;
  title?: string;
  created_at: string;
  updated_at: string;
}

export const OperationalShowoffManagementPage: React.FC = () => {
  const { supabase } = useSupabase();
  const { admin } = useAdminAuth();
  const [showoffs, setShowoffs] = useState<Showoff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedShowoff, setSelectedShowoff] = useState<Showoff | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 编辑表单状态
  const [editFormData, setEditFormData] = useState({
    display_username: '',
    content: '',
    likes_count: 0,
    reward_coins: 0,
  });

  const fetchShowoffs = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('showoffs')
        .select('*')
        .eq('is_operational', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShowoffs(data || []);
    } catch (error: any) {
      toast.error(`加载运营晒单列表失败: ${error.message}`);
      console.error('Error loading operational showoffs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchShowoffs();
  }, [fetchShowoffs]);

  const handleToggleHidden = async (showoff: Showoff) => {
    try {
      const newHiddenStatus = !showoff.is_hidden;
      
      const { error } = await supabase
        .from('showoffs')
        .update({ is_hidden: newHiddenStatus })
        .eq('id', showoff.id);

      if (error) throw error;

      toast.success(`已${newHiddenStatus ? '隐藏' : '显示'}晒单`);
      fetchShowoffs();
    } catch (error: any) {
      toast.error(`操作失败: ${error.message}`);
      console.error('Error toggling hidden status:', error);
    }
  };

  const handleEditClick = (showoff: Showoff) => {
    setSelectedShowoff(showoff);
    setEditFormData({
      display_username: showoff.display_username || '',
      content: showoff.content,
      likes_count: showoff.likes_count || 0,
      reward_coins: showoff.reward_coins || 0,
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedShowoff) return;

    // 表单验证
    if (!editFormData.display_username.trim()) {
      toast.error('请输入用户昵称');
      return;
    }
    if (!editFormData.content.trim()) {
      toast.error('请输入晒单内容');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('showoffs')
        .update({
          display_username: editFormData.display_username.trim(),
          content: editFormData.content.trim(),
          likes_count: editFormData.likes_count,
          reward_coins: editFormData.reward_coins,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedShowoff.id);

      if (error) throw error;

      toast.success('晒单更新成功');
      setIsEditDialogOpen(false);
      fetchShowoffs();
    } catch (error: any) {
      toast.error(`更新失败: ${error.message}`);
      console.error('Error updating showoff:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">运营晒单管理</CardTitle>
          <div className="text-sm text-gray-500">
            共 {showoffs.length} 条运营晒单
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>虚拟用户</TableHead>
                    <TableHead>内容预览</TableHead>
                    <TableHead>图片</TableHead>
                    <TableHead>点赞数</TableHead>
                    <TableHead>奖励</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {showoffs.map((showoff) => (
                    <TableRow key={showoff.id}>
                      <TableCell className="font-medium">{showoff.id.substring(0, 8)}...</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {showoff.display_avatar_url && (
                            <img
                              src={showoff.display_avatar_url}
                              alt={showoff.display_username}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          )}
                          <span className="text-sm">{showoff.display_username || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{showoff.content}</TableCell>
                      <TableCell>
                        {showoff.image_urls && showoff.image_urls.length > 0 ? (
                          <span className="text-sm text-gray-600">{showoff.image_urls.length} 张</span>
                        ) : (
                          <span className="text-sm text-gray-400">无</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">{showoff.likes_count || 0}</span>
                      </TableCell>
                      <TableCell>
                        {showoff.reward_coins ? (
                          <span className="text-sm font-medium text-amber-600">
                            {showoff.reward_coins} 币
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {showoff.is_hidden ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            已隐藏
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            显示中
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{formatDateTime(showoff.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleHidden(showoff)}
                            title={showoff.is_hidden ? '显示' : '隐藏'}
                          >
                            {showoff.is_hidden ? (
                              <Eye className="w-4 h-4" />
                            ) : (
                              <EyeOff className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditClick(showoff)}
                            title="编辑"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 编辑对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑运营晒单</DialogTitle>
            <DialogDescription>
              ID: {selectedShowoff?.id}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 虚拟用户昵称 */}
            <div className="space-y-2">
              <Label htmlFor="edit_display_username">
                虚拟用户昵称 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit_display_username"
                value={editFormData.display_username}
                onChange={(e) => setEditFormData({ ...editFormData, display_username: e.target.value })}
                placeholder="例如: 幸运的Манус"
                maxLength={50}
              />
            </div>

            {/* 晒单内容 */}
            <div className="space-y-2">
              <Label htmlFor="edit_content">
                晒单内容 <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="edit_content"
                value={editFormData.content}
                onChange={(e) => setEditFormData({ ...editFormData, content: e.target.value })}
                placeholder="输入晒单文案..."
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 text-right">
                {editFormData.content.length}/500
              </p>
            </div>

            {/* 晒单图片预览 */}
            {selectedShowoff?.image_urls && selectedShowoff.image_urls.length > 0 && (
              <div className="space-y-2">
                <Label>晒单图片</Label>
                <div className="grid grid-cols-3 gap-2">
                  {selectedShowoff.image_urls.map((imageUrl, index) => (
                    <div key={index} className="border rounded-lg overflow-hidden">
                      <img
                        src={imageUrl}
                        alt={`晒单图片 ${index + 1}`}
                        className="w-full h-24 object-cover"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  注意：图片暂不支持修改，如需修改请重新创建晒单
                </p>
              </div>
            )}

            {/* 点赞数 */}
            <div className="space-y-2">
              <Label htmlFor="edit_likes_count">点赞数</Label>
              <Input
                id="edit_likes_count"
                type="number"
                min="0"
                max="9999"
                value={editFormData.likes_count}
                onChange={(e) => setEditFormData({ ...editFormData, likes_count: parseInt(e.target.value) || 0 })}
              />
            </div>

            {/* 积分奖励 */}
            <div className="space-y-2">
              <Label htmlFor="edit_reward_coins">积分奖励</Label>
              <Input
                id="edit_reward_coins"
                type="number"
                min="0"
                max="1000"
                value={editFormData.reward_coins}
                onChange={(e) => setEditFormData({ ...editFormData, reward_coins: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                '保存'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
