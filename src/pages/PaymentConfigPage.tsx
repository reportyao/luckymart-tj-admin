import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { PaymentConfigService } from '@/services/PaymentConfigService'
import { Tables, TablesInsert, TablesUpdate } from '@/types/supabase'
import { useToast } from '@/components/ui/use-toast'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

type PaymentConfig = Tables<'payment_config'>
type PaymentConfigInsert = TablesInsert<'payment_config'>

const initialFormState: PaymentConfigInsert = {
  alipay_app_id: null,
  alipay_private_key: null,
  alipay_public_key: null,
  wechat_app_id: null,
  wechat_mch_id: null,
  wechat_api_key: null,
  wechat_cert_path: null,
  wechat_key_path: null,
}

export const PaymentConfigPage: React.FC = () => {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [configs, setConfigs] = useState<PaymentConfig[]>([])
  const [form, setForm] = useState<any>(initialFormState)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [configToDelete, setConfigToDelete] = useState<string | null>(null)

  const fetchConfigs = useCallback(async () => {
    setLoading(true)
    try {
      const data = await PaymentConfigService.getAll()
      setConfigs(data)
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to fetch payment configurations.'),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [t, toast])

  useEffect(() => {
    fetchConfigs()
  }, [fetchConfigs])

  

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((prev: any) => ({ ...prev, [name]: value }))
  }

  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (isEditing && form.id) {
        const updateData: TablesUpdate<'payment_config'> = {
          alipay_app_id: form.alipay_app_id,
          alipay_private_key: form.alipay_private_key,
          alipay_public_key: form.alipay_public_key,
          wechat_app_id: form.wechat_app_id,
          wechat_mch_id: form.wechat_mch_id,
          wechat_api_key: form.wechat_api_key,
          wechat_cert_path: form.wechat_cert_path,
          wechat_key_path: form.wechat_key_path,
          updated_at: new Date().toISOString(),
        }
        const updatedConfig = await PaymentConfigService.update(form.id, updateData as any)
        setConfigs((prev) =>
          prev.map((c) => (c.id === updatedConfig.id ? updatedConfig : c))
        )
        toast({
          title: t('Success'),
          description: t('Payment configuration updated successfully.'),
        })
      } else {
       const newConfig = await PaymentConfigService.create(form)
        setConfigs((prev) => [newConfig, ...prev])
        toast({
          title: t('Success'),
          description: t('Payment configuration created successfully.'),
        })
      }
      resetForm()
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to save payment configuration.'),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

const handleEdit = (config: PaymentConfig) => {
    setForm(config as any);
    setIsEditing(true);
  }

  const handleDeleteClick = (id: string) => {
    setConfigToDelete(id)
    setIsConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!configToDelete) {return}
    setLoading(true)
    try {
      await PaymentConfigService.delete(configToDelete)
      setConfigs((prev) => prev.filter((c) => c.id.toString() !== configToDelete))
      toast({
        title: t('Success'),
        description: t('Payment configuration deleted successfully.'),
      })
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to delete payment configuration.'),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      setIsConfirmOpen(false)
      setConfigToDelete(null)
    }
  }

  const resetForm = () => {
    setForm(initialFormState)
    setIsEditing(false)
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">{t('Payment Configuration Management')}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? t('Edit Payment Configuration') : t('Create New Payment Configuration')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            

            <div className="space-y-2">
              <Label>{t('Configuration Details')}</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="alipay_app_id">Alipay App ID</Label>
                  <Input id="alipay_app_id" name="alipay_app_id" value={form.alipay_app_id || ''} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="alipay_private_key">Alipay Private Key</Label>
                  <Input id="alipay_private_key" name="alipay_private_key" value={form.alipay_private_key || ''} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="alipay_public_key">Alipay Public Key</Label>
                  <Input id="alipay_public_key" name="alipay_public_key" value={form.alipay_public_key || ''} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wechat_app_id">WeChat App ID</Label>
                  <Input id="wechat_app_id" name="wechat_app_id" value={form.wechat_app_id || ''} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wechat_mch_id">WeChat MCH ID</Label>
                  <Input id="wechat_mch_id" name="wechat_mch_id" value={form.wechat_mch_id || ''} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wechat_api_key">WeChat API Key</Label>
                  <Input id="wechat_api_key" name="wechat_api_key" value={form.wechat_api_key || ''} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wechat_cert_path">WeChat Cert Path</Label>
                  <Input id="wechat_cert_path" name="wechat_cert_path" value={form.wechat_cert_path || ''} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wechat_key_path">WeChat Key Path</Label>
                  <Input id="wechat_key_path" name="wechat_key_path" value={form.wechat_key_path || ''} onChange={handleInputChange} />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={resetForm} disabled={loading}>
                {t('Cancel')}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? t('Saving...') : isEditing ? t('Update Configuration') : t('Create Configuration')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('Existing Configurations')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alipay App ID</TableHead>
                  <TableHead>WeChat App ID</TableHead>
                  <TableHead>Alipay Public Key</TableHead>
                  <TableHead>{t('Created At')}</TableHead>
                  <TableHead>{t('Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium">{config.alipay_app_id}</TableCell>
                    <TableCell>{config.wechat_app_id}</TableCell>
                    <TableCell className="text-xs max-w-xs truncate">{config.alipay_public_key}</TableCell>
                    <TableCell>
                      {new Date(config.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(config)}
                      >
                        {t('Edit')}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(config.id.toString())}
                      >
                        {t('Delete')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {configs.length === 0 && !loading && (
            <p className="text-center py-4 text-muted-foreground">
              {t('No payment configurations found.')}
            </p>
          )}
          {loading && (
            <p className="text-center py-4 text-muted-foreground">
              {t('Loading...')}
            </p>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={handleConfirmDelete}
        title={t('Confirm Deletion')}
        description={t('Are you sure you want to delete this payment configuration? This action cannot be undone.')}
        confirmText={t('Delete')}
      />
    </div>
  )
}

export default PaymentConfigPage
