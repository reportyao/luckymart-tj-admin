import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { PaymentConfigService } from '@/services/PaymentConfigService'
import { Database } from '../../database.types'
import { useToast } from '@/components/ui/use-toast'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

type PaymentConfig = Database['public']['Tables']['payment_config']['Row']
type PaymentConfigInsert = Database['public']['Tables']['payment_config']['Insert']

const initialFormState: PaymentConfigInsert = {
  name: '',
  config: {},
  is_active: true,
}

export const PaymentConfigPage: React.FC = () => {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [configs, setConfigs] = useState<PaymentConfig[]>([])
  const [form, setForm] = useState<PaymentConfigInsert>(initialFormState)
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
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    try {
      // 尝试解析 JSON，如果失败则保持原样
      const jsonValue = JSON.parse(value)
      setForm((prev) => ({
        ...prev,
        config: { ...prev.config, [name]: jsonValue },
      }))
    } catch (error) {
      // 如果不是有效的 JSON，则作为字符串处理
      setForm((prev) => ({
        ...prev,
        config: { ...prev.config, [name]: value },
      }))
    }
  }

  const handleSwitchChange = (checked: boolean) => {
    setForm((prev) => ({ ...prev, is_active: checked }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (isEditing && form.id) {
        // Update
        const updatedConfig = await PaymentConfigService.update(form.id, form)
        setConfigs((prev) =>
          prev.map((c) => (c.id === updatedConfig.id ? updatedConfig : c))
        )
        toast({
          title: t('Success'),
          description: t('Payment configuration updated successfully.'),
        })
      } else {
        // Create
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
    setForm(config)
    setIsEditing(true)
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
      setConfigs((prev) => prev.filter((c) => c.id !== configToDelete))
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
          <CardTitle>{isEditing ? t('Edit Configuration') : t('Create New Configuration')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('Configuration Name')}</Label>
                <Input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  id="is_active"
                  checked={form.is_active}
                  onCheckedChange={handleSwitchChange}
                />
                <Label htmlFor="is_active">{t('Is Active')}</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('Configuration Details (JSON)')}</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 简化配置输入，只展示 key-value 对 */}
                {Object.entries(form.config || {}).map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={key}>{key}</Label>
                    <Input
                      id={key}
                      name={key}
                      value={typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      onChange={handleConfigChange}
                    />
                  </div>
                ))}
                {/* 允许添加新的配置项 */}
                <div className="space-y-2">
                  <Label htmlFor="new_key">{t('New Key')}</Label>
                  <Input
                    id="new_key"
                    name="new_key"
                    placeholder={t('Enter new key')}
                    onBlur={(e) => {
                      if (e.target.value && !(e.target.value in (form.config || {}))) {
                        setForm((prev) => ({
                          ...prev,
                          config: { ...prev.config, [e.target.value]: '' },
                        }))
                        e.target.value = '' // 清空输入框
                      }
                    }}
                  />
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
                  <TableHead>{t('Name')}</TableHead>
                  <TableHead>{t('Active')}</TableHead>
                  <TableHead>{t('Configuration')}</TableHead>
                  <TableHead>{t('Created At')}</TableHead>
                  <TableHead>{t('Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium">{config.name}</TableCell>
                    <TableCell>
                      <Switch checked={config.is_active} disabled />
                    </TableCell>
                    <TableCell className="text-xs max-w-xs truncate">
                      {JSON.stringify(config.config)}
                    </TableCell>
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
                        onClick={() => handleDeleteClick(config.id)}
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
