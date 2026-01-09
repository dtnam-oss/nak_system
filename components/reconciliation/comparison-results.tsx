'use client';

/**
 * Comparison Results Component
 *
 * Displays results of comparing customer reconciliation file with NAK database.
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, AlertTriangle, XCircle, Download, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ComparisonResult } from '@/lib/reconciliation/comparison/types';

export function ComparisonResults() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ComparisonResult | null>(null);

  useEffect(() => {
    performComparison();
  }, []);

  const performComparison = async () => {
    try {
      // Get stored customer rows
      const customerRowsStr = sessionStorage.getItem('customerRows');
      if (!customerRowsStr) {
        throw new Error('No customer data found. Please upload a file first.');
      }

      const customerRows = JSON.parse(customerRowsStr);

      // Determine date range from customer rows
      const dates = customerRows.map((r: any) => r.date).filter(Boolean);
      const dateRange = {
        from: dates.length > 0 ? dates.sort()[0] : '2026-01-01',
        to: dates.length > 0 ? dates.sort()[dates.length - 1] : '2026-12-31',
      };

      console.log('Comparing with date range:', dateRange);

      // Call compare API
      const response = await fetch('/api/reconciliation/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerRows,
          dateRange,
        }),
      });

      const data = await response.json();

      if (data.success && data.result) {
        setResult(data.result);
      } else {
        throw new Error(data.error || 'Comparison failed');
      }
    } catch (err) {
      console.error('Comparison error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/reconciliation/upload');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-lg font-medium">Đang so sánh dữ liệu...</p>
          <p className="text-sm text-muted-foreground">Vui lòng đợi trong giây lát</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium">Lỗi khi so sánh dữ liệu</p>
            <p className="text-sm mt-1">{error}</p>
          </AlertDescription>
        </Alert>
        <Button onClick={handleBack} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại Upload
        </Button>
      </div>
    );
  }

  if (!result) return null;

  const { summary, details, metadata } = result;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Kết Quả So Sánh</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Template: <span className="font-medium">{metadata.templateType}</span> •
            Thời gian: {new Date(metadata.comparedAt).toLocaleString('vi-VN')}
          </p>
        </div>
        <Button onClick={handleBack} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Upload mới
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Khớp hoàn toàn"
          count={summary.matched}
          icon={<CheckCircle2 className="h-5 w-5" />}
          variant="success"
          description="Dữ liệu khớp 100%"
        />
        <SummaryCard
          title="Khớp có khác biệt"
          count={summary.mismatched}
          icon={<AlertTriangle className="h-5 w-5" />}
          variant="warning"
          description="Cần review"
        />
        <SummaryCard
          title="Thiếu ở Khách hàng"
          count={summary.missingInCustomer}
          icon={<XCircle className="h-5 w-5" />}
          variant="error"
          description="NAK có, KH không có"
        />
        <SummaryCard
          title="Thiếu ở NAK"
          count={summary.missingInNak}
          icon={<XCircle className="h-5 w-5" />}
          variant="error"
          description="KH có, NAK không có"
        />
      </div>

      {/* Match Rate */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tỷ Lệ Khớp</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="h-4 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${summary.matchRate}%` }}
                />
              </div>
            </div>
            <div className="text-2xl font-bold">{summary.matchRate.toFixed(1)}%</div>
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            {summary.matched} / {summary.totalCustomerRows} dòng khớp
          </div>
        </CardContent>
      </Card>

      {/* Detail Tables */}
      <Card>
        <CardHeader>
          <CardTitle>Chi Tiết So Sánh</CardTitle>
          <CardDescription>
            Xem chi tiết từng loại kết quả so sánh
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="matched" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="matched" className="relative">
                Khớp
                <Badge variant="secondary" className="ml-2">{summary.matched}</Badge>
              </TabsTrigger>
              <TabsTrigger value="mismatched" className="relative">
                Khác biệt
                <Badge variant="secondary" className="ml-2">{summary.mismatched}</Badge>
              </TabsTrigger>
              <TabsTrigger value="missing-customer" className="relative">
                Thiếu KH
                <Badge variant="secondary" className="ml-2">{summary.missingInCustomer}</Badge>
              </TabsTrigger>
              <TabsTrigger value="missing-nak" className="relative">
                Thiếu NAK
                <Badge variant="secondary" className="ml-2">{summary.missingInNak}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="matched" className="mt-4">
              <MatchedTable data={details.matched} />
            </TabsContent>

            <TabsContent value="mismatched" className="mt-4">
              <MismatchedTable data={details.mismatched} />
            </TabsContent>

            <TabsContent value="missing-customer" className="mt-4">
              <MissingCustomerTable data={details.missingInCustomer} />
            </TabsContent>

            <TabsContent value="missing-nak" className="mt-4">
              <MissingNakTable data={details.missingInNak} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// Summary Card Component
interface SummaryCardProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  variant: 'success' | 'warning' | 'error';
  description: string;
}

function SummaryCard({ title, count, icon, variant, description }: SummaryCardProps) {
  const colors = {
    success: 'text-green-600 bg-green-50 border-green-200',
    warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    error: 'text-red-600 bg-red-50 border-red-200',
  };

  return (
    <Card className={`border-2 ${colors[variant]}`}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{count}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className={colors[variant]}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// Matched Table
function MatchedTable({ data }: { data: any[] }) {
  if (data.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">Không có dữ liệu</div>;
  }

  return (
    <div className="border rounded-lg">
      <table className="w-full">
        <thead className="bg-muted">
          <tr>
            <th className="text-left p-3 text-sm font-medium">Mã Chuyến NAK</th>
            <th className="text-left p-3 text-sm font-medium">Ngày</th>
            <th className="text-left p-3 text-sm font-medium">Biển Số</th>
            <th className="text-left p-3 text-sm font-medium">Tên Tuyến</th>
            <th className="text-center p-3 text-sm font-medium">Độ Tin Cậy</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index} className="border-t hover:bg-muted/50">
              <td className="p-3 text-sm font-mono">{item.nakOrderId}</td>
              <td className="p-3 text-sm">{item.customerRow.date}</td>
              <td className="p-3 text-sm">{item.customerRow.licensePlate || '-'}</td>
              <td className="p-3 text-sm">{item.customerRow.routeName || '-'}</td>
              <td className="p-3 text-center">
                <Badge variant="secondary">{item.confidence}%</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Mismatched Table
function MismatchedTable({ data }: { data: any[] }) {
  if (data.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">Không có dữ liệu</div>;
  }

  return (
    <div className="space-y-4">
      {data.map((item, index) => (
        <Card key={index} className="border-yellow-200">
          <CardContent className="pt-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-mono text-sm font-medium">{item.nakOrderId}</p>
                <p className="text-xs text-muted-foreground">{item.customerRow.date}</p>
              </div>
              <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                {item.severity}
              </Badge>
            </div>

            <div className="space-y-2">
              {item.differences.map((diff: any, i: number) => (
                <div key={i} className="text-sm bg-muted p-2 rounded">
                  <p className="font-medium">{diff.field}</p>
                  <div className="flex gap-2 text-xs mt-1">
                    <span className="text-muted-foreground">NAK:</span>
                    <span>{diff.nakValue}</span>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="text-muted-foreground">KH:</span>
                    <span>{diff.customerValue}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Missing Customer Table
function MissingCustomerTable({ data }: { data: any[] }) {
  if (data.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">Không có dữ liệu</div>;
  }

  return (
    <div className="border rounded-lg">
      <table className="w-full">
        <thead className="bg-muted">
          <tr>
            <th className="text-left p-3 text-sm font-medium">Mã Chuyến</th>
            <th className="text-left p-3 text-sm font-medium">Ngày</th>
            <th className="text-left p-3 text-sm font-medium">Khách Hàng</th>
            <th className="text-left p-3 text-sm font-medium">Tên Tuyến</th>
            <th className="text-left p-3 text-sm font-medium">Lý Do</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index} className="border-t hover:bg-muted/50">
              <td className="p-3 text-sm font-mono">{item.order.order_id}</td>
              <td className="p-3 text-sm">{new Date(item.order.date).toLocaleDateString('vi-VN')}</td>
              <td className="p-3 text-sm">{item.order.customer}</td>
              <td className="p-3 text-sm">{item.order.route_name || '-'}</td>
              <td className="p-3 text-sm text-red-600">{item.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Missing NAK Table
function MissingNakTable({ data }: { data: any[] }) {
  if (data.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">Không có dữ liệu</div>;
  }

  return (
    <div className="border rounded-lg">
      <table className="w-full">
        <thead className="bg-muted">
          <tr>
            <th className="text-left p-3 text-sm font-medium">Dòng Excel</th>
            <th className="text-left p-3 text-sm font-medium">Ngày</th>
            <th className="text-left p-3 text-sm font-medium">Biển Số</th>
            <th className="text-left p-3 text-sm font-medium">Tên Tuyến</th>
            <th className="text-left p-3 text-sm font-medium">Lý Do</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index} className="border-t hover:bg-muted/50">
              <td className="p-3 text-sm">{item.row.rowNumber}</td>
              <td className="p-3 text-sm">{item.row.date}</td>
              <td className="p-3 text-sm">{item.row.licensePlate || '-'}</td>
              <td className="p-3 text-sm">{item.row.routeName || '-'}</td>
              <td className="p-3 text-sm text-red-600">{item.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
