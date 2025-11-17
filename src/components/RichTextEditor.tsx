import React, { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea'; // 暂时使用 Textarea 替代富文本编辑器

// 支持的语言列表 (与 MultiLanguageInput 保持一致)
const SUPPORTED_LANGUAGES = [
  { code: 'zh', label: '中文' },
  { code: 'ru', label: 'Русский' },
  { code: 'tg', label: 'Тоҷикӣ' },
];

interface RichTextEditorProps {
  label: string;
  value: Record<string, string> | null;
  onChange: (value: Record<string, string>) => void;
  className?: string;
}

/**
 * 用于处理多语言富文本输入的组件
 * 
 * 考虑到环境限制，这里暂时使用 Textarea 模拟富文本编辑器。
 * 实际项目中，这里应该集成如 TinyMCE 或 Quill 等编辑器。
 */
export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  label,
  value,
  onChange,
  className,
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

  return (
    <div className={className}>
      <Label className="mb-2 block">{label} (富文本)</Label>
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
              <Textarea
                id={`${label}-${lang.code}`}
                value={currentValues[lang.code] || ''}
                onChange={(e) => handleChange(lang.code, e.target.value)}
                placeholder={`输入 ${label} (${lang.label})`}
                rows={10}
              />
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
