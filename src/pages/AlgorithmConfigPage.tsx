import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'react-hot-toast';
import { AlgorithmConfigService } from '@/services/AlgorithmConfigService';
import { useSupabase } from '@/contexts/SupabaseContext';
import { SettingsIcon, RefreshCwIcon } from 'lucide-react';

const AlgorithmConfigPage: React.FC = () => {
  const { t } = useTranslation();
  const { supabase } = useSupabase();
  const [currentAlgorithm, setCurrentAlgorithm] = useState('SHA256_TIMESTAMP_MOD');
  const [algorithmSeed, setAlgorithmSeed] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [testResult, setTestResult] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const config = await AlgorithmConfigService.getConfig();
      if (config) {
        setCurrentAlgorithm(config.algorithm_name);
        setAlgorithmSeed(config.seed || '');
      }
    } catch (error) {
      toast.error(t('algorithmConfig.fetchError'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await AlgorithmConfigService.saveConfig(algorithmSeed);
      toast.success(t('algorithmConfig.saveSuccess'));
    } catch (error) {
      toast.error(t('algorithmConfig.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsSaving(true); // 使用 isSaving 状态来禁用按钮
    setTestResult(null);
    try {
      const result = await AlgorithmConfigService.testAlgorithm(algorithmSeed);
      setTestResult(result.result);
      toast.success(t('algorithmConfig.testSuccess'));
    } catch (error) {
      toast.error(t('algorithmConfig.testError'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <SettingsIcon className="w-5 h-5 mr-2" />
            {t('algorithmConfig.title')}
          </CardTitle>
	          <Button onClick={handleTest} variant="outline" disabled={isSaving}>
	            <RefreshCwIcon className="w-4 h-4 mr-2" />
	            {isSaving ? t('common.testing') : t('algorithmConfig.testAlgorithm')}
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
	          {testResult && (
	            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
	              <p className="text-sm font-medium text-green-700 mb-1">测试结果:</p>
	              <pre className="text-xs font-mono whitespace-pre-wrap break-all">{testResult}</pre>
	            </div>
	          )}
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
