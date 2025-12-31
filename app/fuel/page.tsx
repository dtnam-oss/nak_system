'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { FuelKPICards } from '@/components/fuel/fuel-kpi-cards';
import { FuelTransactionsTable } from '@/components/fuel/fuel-transactions-table';
import { FuelImportsTable } from '@/components/fuel/fuel-imports-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, BarChart3 } from 'lucide-react';

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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch stats
      const statsResponse = await fetch('/api/fuel/stats');
      if (!statsResponse.ok) {
        throw new Error('Failed to fetch fuel stats');
      }
      const statsData = await statsResponse.json();
      setStats(statsData.data);

      // Fetch transactions
      const transactionsResponse = await fetch('/api/fuel/transactions');
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
                <FuelTransactionsTable 
                  transactions={transactions} 
                  loading={loading} 
                />
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

