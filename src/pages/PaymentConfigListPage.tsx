import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { PencilIcon, TrashIcon, PlusIcon } from 'lucide-react';
import { useSupabase } from '@/contexts/SupabaseContext';
import { Tables } from '@/types/supabase';
import { useNavigate } from 'react-router-dom';
type PaymentConfig = Tables<'payment_config'>;
import { toast } from 'react-hot-toast';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
// import { Skeleton } from '@/components/ui/skeleton'; // 暂时注释掉，避免找不到模块

// PaymentConfig 表结构已更新为扁平化支付配置字段

const PaymentConfigListPage: React.FC = () => {
  const { t } = useTranslation();
  const { supabase } = useSupabase();
  const [configs, setConfigs] = useState<PaymentConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const navigate = useNavigate();
  const [deleteConfigId, setDeleteConfigId] = useState<string | null>(null);
  // const [isDeleting, setIsDeleting] = useState(false);

  const fetchConfigs = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('payment_config')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error(t('paymentConfig.fetchError') + error.message);
      console.error('Error fetching payment configs:', error);
    } else {
      setConfigs(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  // 移除 handleToggleActive，因为 is_active 字段已移除

  const handleDelete = async () => {
    if (!deleteConfigId) {return;}
    // setIsDeleting(true);

    const { error } = await supabase
      .from('payment_config')
      .delete()
      .eq('id', parseInt(deleteConfigId)); // 假设 id 是 number 类型，但 deleteConfigId 是 string

    if (error) {
      toast.error(t('paymentConfig.deleteError') + error.message);
    } else {
      setConfigs(prev => prev.filter(c => c.id.toString() !== deleteConfigId));
      toast.success(t('paymentConfig.deleteSuccess'));
    }

    // setIsDeleting(false);
    setDeleteConfigId(null);
  };

  

  const renderLoading = () => (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        // <Skeleton key={i} className="h-16 w-full" />
        <div key={i} className="h-16 w-full bg-gray-200 rounded-md animate-pulse" />
      ))}
    </div>
  );

  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('paymentConfig.title')}</CardTitle>
          <Button onClick={() => navigate('/payment-config/new')}>
            <PlusIcon className="w-4 h-4 mr-2" />
            {t('paymentConfig.addConfig')}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            renderLoading()
          ) : configs.length === 0 ? (
            <EmptyState
              title={t('paymentConfig.emptyTitle')}
              message={t('paymentConfig.emptyDescription')}
              // icon={BanknotesIcon} // 暂时注释掉，避免找不到图标
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alipay App ID</TableHead>
                  <TableHead>WeChat App ID</TableHead>
                  <TableHead>Alipay Public Key</TableHead>
                  <TableHead>{t('Created At')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map(config => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium">{config.alipay_app_id}</TableCell>
                    <TableCell>{config.wechat_app_id}</TableCell>
                    <TableCell>{config.alipay_public_key}</TableCell>
                    <TableCell>{new Date(config.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/payment-config/edit/${config.id}`)}
                        className="mr-2"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                       onClick={() => setDeleteConfigId(config.id.toString())}
                      >
                        <TrashIcon className="w-4 h-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteConfigId}
        onOpenChange={(open) => !open && setDeleteConfigId(null)}
        onConfirm={handleDelete}
        title={t('paymentConfig.confirmDeleteTitle')}
        description={t('paymentConfig.confirmDeleteDescription')}
        confirmText={t('common.delete')}
        // isConfirming={isDeleting} // ConfirmDialog.tsx 已修改，不再需要此属性
      />
    </div>
  );
};

export default PaymentConfigListPage;
