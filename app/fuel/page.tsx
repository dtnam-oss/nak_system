'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { FuelKPICards } from '@/components/fuel/fuel-kpi-cards';
import { FuelTransactionsTable } from '@/components/fuel/fuel-transactions-table';
import { FuelImportsTable } from '@/components/fuel/fuel-imports-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, BarChart3, Download, Calendar, X } from 'lucide-react';

interface FuelStats {
  total_import: number;
  total_export_internal: number;
  total_export_all: number;
  current_avg_price: number;
  current_inventory: number;
  inventory_value: number;
  monthly_consumption: number;
  tank_capacity: number;
  tank_percentage: number;
}

interface FuelTransaction {
  id: string;
  transaction_date: string;
  fuel_source: string;
  object: string;
  license_plate: string;
  driver_name: string;
  fuel_type: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  odo_number: number;
  status: string;
  category: string;
}

interface FuelImport {
  id: string;
  import_date: string;
  supplier: string;
  fuel_type: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  avg_price: number;
  created_by: string;
}

export default function FuelPage() {
  const [stats, setStats] = useState<FuelStats | null>(null);
  const [transactions, setTransactions] = useState<FuelTransaction[]>([]);
  const [imports, setImports] = useState<FuelImport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('transactions');
  const [fuelSourceTab, setFuelSourceTab] = useState<string>('all'); // all, internal, quangminh, vanglai
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [fromDate, toDate]);

  useEffect(() => {
    // Auto-refresh every 30 seconds for real-time fuel data (only if no date filter)
    if (!fromDate && !toDate) {
      const interval = setInterval(() => {
        fetchData();
      }, 30 * 1000);

      return () => clearInterval(interval);
    }
  }, [fromDate, toDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch stats
      const statsResponse = await fetch('/api/fuel/stats');
      const statsData = await statsResponse.json();
      
      console.log('Stats API Response:', statsData);
      
      if (!statsData.success) {
        throw new Error(statsData.message || statsData.error || 'Failed to fetch fuel stats');
      }
      setStats(statsData.data);

      // Fetch transactions with date filter
      const transactionsParams = new URLSearchParams();
      if (fromDate) transactionsParams.set('fromDate', fromDate);
      if (toDate) transactionsParams.set('toDate', toDate);

      const transactionsResponse = await fetch(`/api/fuel/transactions?${transactionsParams.toString()}`);
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData.data || []);
      }

      // Fetch imports
      const importsResponse = await fetch('/api/fuel/imports');
      if (importsResponse.ok) {
        const importsData = await importsResponse.json();
        setImports(importsData.data || []);
      }

    } catch (err: any) {
      console.error('Error fetching fuel data:', err);
      setError(err.message || 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);

      const params = new URLSearchParams();
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', toDate);

      const response = await fetch(`/api/fuel/transactions/export?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fuel_transactions${fromDate ? `_${fromDate}` : ''}${toDate ? `_to_${toDate}` : ''}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export error:', err);
      setError('Không thể xuất file Excel');
    } finally {
      setExporting(false);
    }
  };

  const clearDateFilter = () => {
    setFromDate('');
    setToDate('');
  };

  return (
    <DashboardLayout breadcrumbs={[{ label: 'Dashboard' }, { label: 'Nhiên liệu' }]}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quản lý Nhiên liệu</h1>
          <p className="text-muted-foreground mt-2">
            Theo dõi nhập xuất và tồn kho nhiên liệu
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* KPI Cards */}
        <FuelKPICards stats={stats} loading={loading} />

        {/* Date Filter and Export */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Bộ lọc và Xuất dữ liệu</CardTitle>
                <CardDescription>Lọc theo khoảng thời gian và xuất file Excel</CardDescription>
              </div>
              <Button
                onClick={handleExport}
                disabled={exporting || transactions.length === 0}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                {exporting ? 'Đang xuất...' : 'Xuất Excel'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="fromDate" className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4" />
                  Từ ngày
                </Label>
                <Input
                  id="fromDate"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  max={toDate || undefined}
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="toDate" className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4" />
                  Đến ngày
                </Label>
                <Input
                  id="toDate"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  min={fromDate || undefined}
                />
              </div>
              {(fromDate || toDate) && (
                <Button
                  variant="outline"
                  onClick={clearDateFilter}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Xóa bộ lọc
                </Button>
              )}
              {(fromDate || toDate) && (
                <div className="text-sm text-muted-foreground">
                  {transactions.length} bản ghi
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="transactions">
              Nhật ký cấp dầu
            </TabsTrigger>
            <TabsTrigger value="imports">
              Nhập kho
            </TabsTrigger>
            <TabsTrigger value="performance">
              Hiệu suất
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Fuel Transactions */}
          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Nhật ký cấp dầu</CardTitle>
                <CardDescription>
                  Danh sách các giao dịch xuất nhiên liệu cho xe
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Sub-tabs for Fuel Source */}
                <Tabs value={fuelSourceTab} onValueChange={setFuelSourceTab} className="mb-4">
                  <TabsList>
                    <TabsTrigger value="all">
                      Tất cả
                    </TabsTrigger>
                    <TabsTrigger value="internal">
                      Trụ nội bộ
                    </TabsTrigger>
                    <TabsTrigger value="quangminh">
                      Trụ Quang Minh
                    </TabsTrigger>
                    <TabsTrigger value="vanglai">
                      Trụ vãng lai
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="all" className="mt-4">
                    <FuelTransactionsTable 
                      transactions={transactions} 
                      loading={loading} 
                    />
                  </TabsContent>

                  <TabsContent value="internal" className="mt-4">
                    <FuelTransactionsTable 
                      transactions={transactions.filter(t => 
                        t.fuel_source?.toLowerCase().includes('nội bộ')
                      )} 
                      loading={loading} 
                    />
                  </TabsContent>

                  <TabsContent value="quangminh" className="mt-4">
                    <FuelTransactionsTable 
                      transactions={transactions.filter(t => 
                        t.fuel_source?.toLowerCase().includes('quang minh')
                      )} 
                      loading={loading} 
                    />
                  </TabsContent>

                  <TabsContent value="vanglai" className="mt-4">
                    <FuelTransactionsTable 
                      transactions={transactions.filter(t => {
                        const source = t.fuel_source?.toLowerCase() || '';
                        return !source.includes('nội bộ') && !source.includes('quang minh');
                      })} 
                      loading={loading} 
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Fuel Imports */}
          <TabsContent value="imports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Lịch sử nhập kho</CardTitle>
                <CardDescription>
                  Danh sách các phiếu nhập nhiên liệu vào bồn chứa
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FuelImportsTable 
                  imports={imports} 
                  loading={loading} 
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Performance (Placeholder) */}
          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Phân tích Hiệu suất</CardTitle>
                <CardDescription>
                  Biểu đồ và báo cáo tiêu thụ nhiên liệu theo xe, theo tài xế
                </CardDescription>
              </CardHeader>
              <CardContent className="h-96 flex items-center justify-center">
                <div className="text-center space-y-3">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground">
                    Tính năng đang được phát triển
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Sẽ có biểu đồ phân tích tiêu thụ nhiên liệu theo xe, tài xế, thời gian...
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

