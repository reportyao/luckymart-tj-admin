import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Download, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface DownloadButtonProps {
  url: string;
  filename: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({
  url,
  filename,
  className = '',
  variant = 'outline',
  size = 'sm',
  showLabel = true,
}) => {
  const { t } = useTranslation();
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      setDownloaded(true);
      toast.success(t('common.downloaded'));
      setTimeout(() => setDownloaded(false), 2000);
    } catch (err) {
      // Fallback: open in new tab
      window.open(url, '_blank');
      toast.success(t('common.downloaded'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDownload}
      disabled={downloading}
      className={`gap-2 ${className}`}
    >
      {downloading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          {showLabel && <span>{t('common.loading')}</span>}
        </>
      ) : downloaded ? (
        <>
          <Check className="w-4 h-4 text-green-600" />
          {showLabel && <span className="text-green-600">{t('common.downloaded')}</span>}
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          {showLabel && <span>{t('common.download')}</span>}
        </>
      )}
    </Button>
  );
};
