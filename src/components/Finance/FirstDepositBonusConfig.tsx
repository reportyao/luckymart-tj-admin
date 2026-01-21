import React, { useEffect, useState } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { toast } from 'react-hot-toast';
import { Gift, Percent, DollarSign, AlertCircle } from 'lucide-react';

interface FirstDepositBonusConfig {
  enabled: boolean;
  bonus_percent: number;
  max_bonus_amount: number;
  min_deposit_amount: number;
}

export const FirstDepositBonusConfig: React.FC = () => {
  const { supabase } = useSupabase();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<FirstDepositBonusConfig>({
    enabled: true,
    bonus_percent: 10,
    max_bonus_amount: 100,
    min_deposit_amount: 10,
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'first_deposit_bonus')
        .single();

      if (error) {
        console.error('Error fetching config:', error);
        // 如果配置不存在，使用默认值
        return;
      }

      if (data?.value) {
        setConfig(data.value as FirstDepositBonusConfig);
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('加载配置失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    // 验证输入
    if (config.bonus_percent < 0 || config.bonus_percent > 100) {
      toast.error('奖励比例必须在 0-100% 之间');
      return;
    }
    if (config.max_bonus_amount < 0) {
      toast.error('最大奖励金额不能为负数');
      return;
    }
    if (config.min_deposit_amount < 0) {
      toast.error('最低充值金额不能为负数');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('system_config')
        .upsert({
          key: 'first_deposit_bonus',
          value: config,
          description: '首充奖励配置：bonus_percent为奖励百分比，max_bonus_amount为最大奖励金额，min_deposit_amount为最低充值金额',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'key'
        });

      if (error) {throw error;}

      toast.success('配置保存成功！');
    } catch (error: any) {
      console.error('Error saving config:', error);
      toast.error(`保存失败: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="text-center">加载中...</div>
        </CardContent>
      </Card>
    );
  }

  // 计算示例
  const exampleDeposit = 100;
  const exampleBonus = Math.min(
    exampleDeposit * (config.bonus_percent / 100),
    config.max_bonus_amount
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Gift className="h-6 w-6 text-primary" />
          <CardTitle>首充奖励配置</CardTitle>
        </div>
        <CardDescription>
          配置用户首次充值时获得的额外奖励比例
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 启用开关 */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="space-y-0.5">
            <Label className="text-base font-medium">启用首充奖励</Label>
            <p className="text-sm text-gray-500">
              开启后，用户首次充值将获得额外奖励
            </p>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
          />
        </div>

        {/* 配置项 */}
        <div className={`space-y-4 ${!config.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
          {/* 奖励比例 */}
          <div className="space-y-2">
            <Label htmlFor="bonus_percent" className="flex items-center space-x-2">
              <Percent className="h-4 w-4" />
              <span>奖励比例 (%)</span>
            </Label>
            <div className="flex items-center space-x-2">
              <Input
                id="bonus_percent"
                type="number"
                min="0"
                max="100"
                step="1"
                value={config.bonus_percent}
                onChange={(e) => setConfig({ ...config, bonus_percent: Number(e.target.value) })}
                className="w-32"
              />
              <span className="text-gray-500">%</span>
            </div>
            <p className="text-sm text-gray-500">
              用户首充金额的奖励百分比，例如：10% 表示充值 100 TJS 可获得 10 TJS 奖励
            </p>
          </div>

          {/* 最大奖励金额 */}
          <div className="space-y-2">
            <Label htmlFor="max_bonus_amount" className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4" />
              <span>最大奖励金额 (TJS)</span>
            </Label>
            <div className="flex items-center space-x-2">
              <Input
                id="max_bonus_amount"
                type="number"
                min="0"
                step="1"
                value={config.max_bonus_amount}
                onChange={(e) => setConfig({ ...config, max_bonus_amount: Number(e.target.value) })}
                className="w-32"
              />
              <span className="text-gray-500">TJS</span>
            </div>
            <p className="text-sm text-gray-500">
              单次首充奖励的上限金额，防止大额充值获得过多奖励
            </p>
          </div>

          {/* 最低充值金额 */}
          <div className="space-y-2">
            <Label htmlFor="min_deposit_amount" className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4" />
              <span>最低充值金额 (TJS)</span>
            </Label>
            <div className="flex items-center space-x-2">
              <Input
                id="min_deposit_amount"
                type="number"
                min="0"
                step="1"
                value={config.min_deposit_amount}
                onChange={(e) => setConfig({ ...config, min_deposit_amount: Number(e.target.value) })}
                className="w-32"
              />
              <span className="text-gray-500">TJS</span>
            </div>
            <p className="text-sm text-gray-500">
              只有首充金额达到此门槛才能获得奖励
            </p>
          </div>
        </div>

        {/* 示例计算 */}
        {config.enabled && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium text-blue-700">示例计算</p>
                <p className="text-sm text-blue-600 mt-1">
                  用户首次充值 {exampleDeposit} TJS：
                </p>
                <ul className="text-sm text-blue-600 mt-1 list-disc list-inside">
                  <li>计算奖励: {exampleDeposit} × {config.bonus_percent}% = {exampleDeposit * config.bonus_percent / 100} TJS</li>
                  <li>实际奖励: {exampleBonus} TJS {exampleBonus < exampleDeposit * config.bonus_percent / 100 ? '(受最大奖励限制)' : ''}</li>
                  <li>用户实际到账: {exampleDeposit + exampleBonus} TJS</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* 保存按钮 */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? '保存中...' : '保存配置'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FirstDepositBonusConfig;
