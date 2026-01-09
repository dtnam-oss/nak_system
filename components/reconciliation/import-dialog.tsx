'use client';

/**
 * Reconciliation Import Dialog Component
 *
 * Modal dialog for uploading customer reconciliation files
 * without navigating to a new page.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (data: any) => void;
}

interface UploadResult {
  success: boolean;
  templateType?: string;
  rowCount?: number;
  rows?: any[];
  metadata?: any;
  error?: string;
}

export function ImportDialog({ open, onOpenChange, onSuccess }: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [templateType, setTemplateType] = useState<string>('auto');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    if (templateType !== 'auto') {
      formData.append('templateType', templateType);
    }

    try {
      const response = await fetch('/api/reconciliation/upload', {
        method: 'POST',
        body: formData,
      });

      const data: UploadResult = await response.json();

      if (data.success && data.rows) {
        setResult(data);

        // Store in sessionStorage for comparison
        sessionStorage.setItem('customerRows', JSON.stringify(data.rows));
        sessionStorage.setItem('uploadMetadata', JSON.stringify({
          templateType: data.templateType,
          fileName: file.name,
          rowCount: data.rowCount,
        }));

        // Callback to parent
        if (onSuccess) {
          onSuccess(data);
        }

        // Auto close after success
        setTimeout(() => {
          onOpenChange(false);
          // Navigate to comparison page
          window.location.href = '/reconciliation/compare';
        }, 1500);
      } else {
        setResult({
          success: false,
          error: data.error || 'Upload failed',
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFile(null);
      setTemplateType('auto');
      setResult(null);
      onOpenChange(false);
    }
  };

  const getTemplateName = (type: string) => {
    const names: Record<string, string> = {
      jnt_route: 'J&T - Theo Tuyến',
      jnt_shift: 'J&T - Theo Ca',
      ghn: 'GHN',
      auto: 'Tự động nhận diện',
    };
    return names[type] || type;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload File Đối Soát Khách Hàng
          </DialogTitle>
          <DialogDescription>
            Chọn file Excel đối soát từ khách hàng để so sánh với dữ liệu NAK
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template Selector */}
          <div className="space-y-2">
            <label htmlFor="dialog-template" className="text-sm font-medium">
              Loại mẫu đối soát
            </label>
            <Select value={templateType} onValueChange={setTemplateType} disabled={loading}>
              <SelectTrigger id="dialog-template">
                <SelectValue placeholder="Chọn loại mẫu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  🔍 Tự động nhận diện
                </SelectItem>
                <SelectItem value="jnt_route">
                  📋 J&T - Theo Tuyến
                </SelectItem>
                <SelectItem value="jnt_shift">
                  📋 J&T - Theo Ca
                </SelectItem>
                <SelectItem value="ghn">
                  📋 GHN
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Để "Tự động nhận diện" nếu không chắc chắn loại mẫu
            </p>
          </div>

          {/* File Input */}
          <div className="space-y-2">
            <label htmlFor="dialog-file" className="text-sm font-medium">
              Chọn file Excel
            </label>
            <div className="flex items-center gap-2">
              <Input
                id="dialog-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={loading}
                className="cursor-pointer"
              />
              {file && (
                <FileSpreadsheet className="h-5 w-5 text-green-600 flex-shrink-0" />
              )}
            </div>
            {file && (
              <p className="text-xs text-muted-foreground">
                📄 {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          {/* Result Message */}
          {result && (
            <Alert variant={result.success ? 'default' : 'destructive'}>
              {result.success ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {result.success ? (
                  <div className="space-y-1">
                    <p className="font-medium">✓ Upload thành công!</p>
                    <p className="text-sm">
                      Loại mẫu: <span className="font-semibold">{getTemplateName(result.templateType || '')}</span>
                    </p>
                    <p className="text-sm">
                      Số dòng: <span className="font-semibold">{result.rowCount}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Đang chuyển đến trang so sánh...
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium">Upload thất bại</p>
                    <p className="text-sm mt-1">{result.error}</p>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Help Text */}
          <div className="text-xs text-muted-foreground space-y-1 border-t pt-3">
            <p className="font-medium">📝 Lưu ý:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Chỉ chấp nhận file Excel (.xlsx, .xls)</li>
              <li>Kích thước tối đa: 50MB</li>
              <li>Hệ thống sẽ tự động nhận diện loại mẫu</li>
            </ul>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Hủy
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload & Parse
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
