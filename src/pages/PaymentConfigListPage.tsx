import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { PencilIcon, TrashIcon, PlusIcon } from 'lucide-react';
import { useSupabase } from '@/contexts/SupabaseContext';
import { PaymentConfig } from '@/types/supabase';
import { toast } from 'react-hot-toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';

// 假设 PaymentConfig 表结构如下 (来自 supabase.ts)
// id: string, provider: string, config: Json, is_active: boolean, created_at: string, updated_at: string

const PaymentConfigListPage: React.FC = () => {
  const { t } = useTranslation();
  const { supabase } = useSupabase();
  const [configs, setConfigs] = useState<PaymentConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfigId, setDeleteConfigId] = useState<string | null>(null);

  const fetchConfigs = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('payment_configs')
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

  const handleToggleActive = async (config: PaymentConfig) => {
    const newStatus = !config.is_active;
    const { error } = await supabase
      .from('payment_configs')
      .update({ is_active: newStatus })
      .eq('id', config.id);

    if (error) {
      toast.error(t('paymentConfig.updateError') + error.message);
    } else {
      setConfigs(prev =>
        prev.map(c => (c.id === config.id ? { ...c, is_active: newStatus } : c))
      );
      toast.success(t('paymentConfig.updateSuccess'));
    }
  };

  const handleDelete = async () => {
    if (!deleteConfigId) {return;}
    setIsDeleting(true);

    const { error } = await supabase
      .from('payment_configs')
      .delete()
      .eq('id', deleteConfigId);

    if (error) {
      toast.error(t('paymentConfig.deleteError') + error.message);
    } else {
      setConfigs(prev => prev.filter(c => c.id !== deleteConfigId));
      toast.success(t('paymentConfig.deleteSuccess'));
    }

    setIsDeleting(false);
    setDeleteConfigId(null);
  };

  const renderConfigValue = (config: PaymentConfig) => {
    // 假设 config.config 包含 bankName, accountNumber, recipientName
    const { bankName, accountNumber, recipientName } = config.config as {
      bankName?: string;
      accountNumber?: string;
      recipientName?: string;
    };

    return (
      <div className="text-sm text-gray-600 space-y-1">
        <p>
          <span className="font-medium">{t('paymentConfig.bankName')}:</span> {bankName || t('common.notSet')}
        </p>
        <p>
          <span className="font-medium">{t('paymentConfig.accountNumber')}:</span> {accountNumber || t('common.notSet')}
        </p>
        <p>
          <span className="font-medium">{t('paymentConfig.recipientName')}:</span> {recipientName || t('common.notSet')}
        </p>
      </div>
    );
  };

  const renderLoading = () => (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );

  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('paymentConfig.title')}</CardTitle>
          <Button onClick={() => toast.success(t('common.notImplemented'))}>
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
              description={t('paymentConfig.emptyDescription')}
              icon={BanknotesIcon}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('paymentConfig.provider')}</TableHead>
                  <TableHead>{t('paymentConfig.details')}</TableHead>
                  <TableHead className="text-center">{t('paymentConfig.status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(configs || []).map(config => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium">{config.provider}</TableCell>
                    <TableCell>{renderConfigValue(config)}</TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={config.is_active}
                        onCheckedChange={() => handleToggleActive(config)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toast.success(t('common.notImplemented'))}
                        className="mr-2"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfigId(config.id)}
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
        isOpen={!!deleteConfigId}
        onClose={() => setDeleteConfigId(null)}
        onConfirm={handleDelete}
        title={t('paymentConfig.confirmDeleteTitle')}
        description={t('paymentConfig.confirmDeleteDescription')}
        confirmText={t('common.delete')}
        isConfirming={isDeleting}
      />
    </div>
  );
};

export default PaymentConfigListPage;
