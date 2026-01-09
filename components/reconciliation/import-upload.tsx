'use client';

/**
 * Reconciliation Upload Component
 *
 * Allows users to upload customer reconciliation Excel files
 * with automatic template detection.
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UploadResult {
  success: boolean;
  templateType?: string;
  rowCount?: number;
  rows?: any[];
  metadata?: any;
  error?: string;
}

export function ReconciliationUpload() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [templateType, setTemplateType] = useState<string>('auto');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null); // Clear previous result
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

        // Store parsed data in sessionStorage
        sessionStorage.setItem('customerRows', JSON.stringify(data.rows));
        sessionStorage.setItem('uploadMetadata', JSON.stringify({
          templateType: data.templateType,
          fileName: file.name,
          rowCount: data.rowCount,
        }));

        // Navigate to comparison page after short delay
        setTimeout(() => {
          router.push('/reconciliation/compare');
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
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload File Đối Soát Khách Hàng
        </CardTitle>
        <CardDescription>
          Chọn file Excel đối soát từ khách hàng để so sánh với dữ liệu NAK
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Template Selector */}
        <div className="space-y-2">
          <label htmlFor="template" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Loại mẫu đối soát</label>
          <Select value={templateType} onValueChange={setTemplateType}>
            <SelectTrigger id="template">
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
          <label htmlFor="file" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Chọn file Excel</label>
          <div className="flex items-center gap-2">
            <Input
              id="file"
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

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={!file || loading}
          className="w-full"
          size="lg"
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
        <div className="text-xs text-muted-foreground space-y-1 border-t pt-4">
          <p className="font-medium">📝 Lưu ý:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Chỉ chấp nhận file Excel (.xlsx, .xls)</li>
            <li>Kích thước tối đa: 50MB</li>
            <li>Hệ thống sẽ tự động nhận diện loại mẫu nếu chọn "Tự động"</li>
            <li>Đảm bảo file có đúng cấu trúc cột theo mẫu khách hàng</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
