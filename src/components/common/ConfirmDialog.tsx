import React from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => Promise<void>;
  onOpenChange: (open: boolean) => void;
  confirmText: string;
  isDangerous?: boolean; // 是否为危险操作
}

export function ConfirmDialog({
  open,
  title,
  description,
  onConfirm,
  onOpenChange,
  confirmText,
  isDangerous = true,
}: ConfirmDialogProps) {
  const [loading, setLoading] = React.useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p>{description}</p>
          
          {isDangerous && (
            <div className="bg-red-50 p-3 rounded text-red-800 border border-red-200">
              ⚠️ 此操作无法撤销，请谨慎操作！
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline" disabled={loading}>
            取消
          </Button>
          <Button 
            onClick={handleConfirm} 
            variant={isDangerous ? 'destructive' : 'default'}
            disabled={loading}
          >
            {loading ? '处理中...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
