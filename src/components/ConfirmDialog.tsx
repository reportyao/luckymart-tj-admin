import React from 'react';
import { Button } from './ui/button'; // 假设存在 Button 组件
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'; // 假设存在 Dialog 组件

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  itemCount?: number; // 显示受影响的项目数
  onConfirm: () => void;
  onCancel: () => void;
  isDangerous?: boolean; // 是否为危险操作
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  itemCount,
  onConfirm,
  onCancel,
  isDangerous,
}: ConfirmDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p>{message}</p>
          
          {itemCount && itemCount > 1 && (
            <div className="bg-yellow-50 p-3 rounded text-yellow-800 border border-yellow-200">
              ⚠️ 此操作将影响 <strong>{itemCount}</strong> 个项目
            </div>
          )}
          
          {isDangerous && (
            <div className="bg-red-50 p-3 rounded text-red-800 border border-red-200">
              ⚠️ 此操作无法撤销，请谨慎操作！
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button onClick={onCancel} variant="outline">
            取消
          </Button>
          <Button 
            onClick={onConfirm} 
            variant={isDangerous ? 'destructive' : 'default'}
          >
            确认
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
