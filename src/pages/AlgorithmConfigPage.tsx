import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'react-hot-toast';
import { SettingsIcon, RefreshCwIcon } from 'lucide-react';

// 假设开奖算法配置存储在某个配置表中，这里使用占位符
const AlgorithmConfigPage: React.FC = () => {
  const { t } = useTranslation();
  const [currentAlgorithm, setCurrentAlgorithm] = React.useState('SHA256_TIMESTAMP_MOD');
  const [algorithmSeed, setAlgorithmSeed] = React.useState('2025-11-20T10:00:00Z');
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = () => {
    setIsSaving(true);
    // 实际应调用 Supabase 函数或 API 来保存配置
    setTimeout(() => {
      toast.success(t('algorithmConfig.saveSuccess'));
      setIsSaving(false);
    }, 1500);
  };

  const handleTest = () => {
    // 实际应调用 Supabase 函数或 API 来测试算法
    toast.success(t('algorithmConfig.testSuccess'));
  };

  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <SettingsIcon className="w-5 h-5 mr-2" />
            {t('algorithmConfig.title')}
          </CardTitle>
          <Button onClick={handleTest} variant="outline">
            <RefreshCwIcon className="w-4 h-4 mr-2" />
            {t('algorithmConfig.testAlgorithm')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="currentAlgorithm">{t('algorithmConfig.currentAlgorithm')}</Label>
            <Input
              id="currentAlgorithm"
              value={currentAlgorithm}
              readOnly
              className="font-mono bg-gray-100"
            />
            <p className="text-sm text-gray-500">
              {t('algorithmConfig.algorithmDescription')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="algorithmSeed">{t('algorithmConfig.seed')}</Label>
            <Input
              id="algorithmSeed"
              value={algorithmSeed}
              onChange={(e) => setAlgorithmSeed(e.target.value)}
              placeholder={t('algorithmConfig.seedPlaceholder')}
            />
            <p className="text-sm text-gray-500">
              {t('algorithmConfig.seedDescription')}
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t('algorithmConfig.verificationTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            {t('algorithmConfig.verificationDescription')}
          </p>
          <Button variant="link" className="p-0 mt-2">
            {t('algorithmConfig.viewDocumentation')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AlgorithmConfigPage;
