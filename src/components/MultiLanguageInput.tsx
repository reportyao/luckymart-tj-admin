import React, { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';

// 支持的语言列表
const SUPPORTED_LANGUAGES = [
  { code: 'zh', label: '中文' },
  { code: 'ru', label: 'Русский' },
  { code: 'tg', label: 'Тоҷикӣ' },
];

interface MultiLanguageInputProps {
  label?: string;
  value: Record<string, string> | null;
  onChange: (value: Record<string, string>) => void;
  type?: 'input' | 'textarea';
  className?: string;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
}

/**
 * 用于处理多语言 JSONB 字段输入的组件
 */
export const MultiLanguageInput: React.FC<MultiLanguageInputProps> = ({
  label,
  value,
  onChange,
  type = 'input',
  className,
  placeholder,
  multiline = false,
  rows = 3,
}) => {
  const [activeTab, setActiveTab] = useState(SUPPORTED_LANGUAGES[0]?.code || 'zh');
  const currentValues = value || {};

  const handleChange = useCallback(
    (langCode: string, newValue: string) => {
      const newValues = { ...currentValues, [langCode]: newValue };
      // 过滤掉空值，保持 JSONB 字段的整洁
      Object.keys(newValues).forEach(key => {
        if (!newValues[key]) {
          delete newValues[key];
        }
      });
      onChange(newValues);
    },
    [currentValues, onChange]
  );

  const InputComponent = (type === 'textarea' || multiline) ? Textarea : Input;

  return (
    <div className={className}>
      <Label className="mb-2 block">{label}</Label>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <TabsTrigger key={lang.code} value={lang.code}>
              {lang.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {SUPPORTED_LANGUAGES.map((lang) => (
          <TabsContent key={lang.code} value={lang.code} className="mt-4">
            <div className="space-y-2">
              <Label htmlFor={`${label}-${lang.code}`}>
                {label} ({lang.label})
              </Label>
              <InputComponent
                id={`${label}-${lang.code}`}
                value={currentValues[lang.code] || ''}
                onChange={(e) => handleChange(lang.code, e.target.value)}
                placeholder={placeholder || `输入 ${label} (${lang.label})`}
                {...(multiline || type === 'textarea' ? { rows } : {})}
              />
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
