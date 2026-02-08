'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { SalaryKPICards } from '@/components/salary/salary-kpi-cards';
import { SalaryTable } from '@/components/salary/salary-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertCircle, Download, Calculator, Calendar } from 'lucide-react';

interface SalaryStats {
  total_salary_month: number;
  total_employees: number;
  avg_salary: number;
  total_drivers: number;
  total_driver_salary: number;
  total_employee_salary: number;
  pending_count: number;
}

interface SalaryRecord {
  id: number;
  ma_nhan_vien: string;
  ho_va_ten: string;
  phong_ban: string;
  chuc_vu: string;
  loai_nhan_vien: string;
  thang: number;
  nam: number;
  luong_co_ban: number;
  so_chuyen_di: number;
  tong_doanh_thu: number;
  luong_theo_chuyen: number;
  phu_cap: number;
  thuong: number;
  tong_thu_nhap: number;
  tong_khau_tru: number;
  thuc_lanh: number;
  trang_thai: string;
  ngay_thanh_toan: string;
}

export default function SalaryPage() {
  const [stats, setStats] = useState<SalaryStats | null>(null);
  const [employeeSalaries, setEmployeeSalaries] = useState<SalaryRecord[]>([]);
  const [driverSalaries, setDriverSalaries] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('employees');

  // Filters
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const [exporting, setExporting] = useState(false);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear, selectedDepartment, selectedStatus]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch stats
      const statsResponse = await fetch(
        `/api/salary/stats?month=${selectedMonth}&year=${selectedYear}`
      );
      const statsData = await statsResponse.json();

      if (!statsData.success) {
        throw new Error(statsData.error || 'Failed to fetch salary stats');
      }
      setStats(statsData.data);

      // Fetch employee salaries
      const employeeParams = new URLSearchParams({
        month: selectedMonth.toString(),
        year: selectedYear.toString(),
        type: 'nhan_vien',
      });
      if (selectedDepartment !== 'all') employeeParams.set('department', selectedDepartment);
      if (selectedStatus !== 'all') employeeParams.set('status', selectedStatus);

      const employeeResponse = await fetch(`/api/salary/list?${employeeParams.toString()}`);
      if (employeeResponse.ok) {
        const employeeData = await employeeResponse.json();
        setEmployeeSalaries(employeeData.data || []);
      }

      // Fetch driver salaries
      const driverParams = new URLSearchParams({
        month: selectedMonth.toString(),
        year: selectedYear.toString(),
        type: 'tai_xe',
      });
      if (selectedStatus !== 'all') driverParams.set('status', selectedStatus);

      const driverResponse = await fetch(`/api/salary/list?${driverParams.toString()}`);
      if (driverResponse.ok) {
        const driverData = await driverResponse.json();
        setDriverSalaries(driverData.data || []);
      }

    } catch (err: any) {
      console.error('Error fetching salary data:', err);
      setError(err.message || 'Không thể tải dữ liệu lương');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateSalary = async () => {
    try {
      setCalculating(true);
      setError(null);

      const response = await fetch('/api/salary/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: selectedMonth, year: selectedYear }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Tính lương thất bại');
      }

      alert(`✅ ${result.message}`);
      fetchData(); // Refresh data
    } catch (err: any) {
      console.error('Error calculating salary:', err);
      setError(err.message || 'Không thể tính lương');
    } finally {
      setCalculating(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);

      const params = new URLSearchParams({
        month: selectedMonth.toString(),
        year: selectedYear.toString(),
      });
      if (activeTab === 'employees') params.set('type', 'nhan_vien');
      if (activeTab === 'drivers') params.set('type', 'tai_xe');

      const response = await fetch(`/api/salary/export?${params.toString()}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bang_luong_${selectedMonth}_${selectedYear}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Export error:', err);
      setError(err.message || 'Không thể xuất file Excel');
    } finally {
      setExporting(false);
    }
  };

  return (
    <DashboardLayout breadcrumbs={[{ label: 'Dashboard' }, { label: 'Data lương' }]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Quản lý Data lương</h1>
            <p className="text-muted-foreground mt-2">
              Tính toán và quản lý lương nhân viên & tài xế tháng {selectedMonth}/{selectedYear}
            </p>
          </div>
          <Button
            onClick={handleCalculateSalary}
            disabled={calculating}
            className="gap-2"
            variant="default"
          >
            <Calculator className="h-4 w-4" />
            {calculating ? 'Đang tính...' : 'Tính lương tháng này'}
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* KPI Cards */}
        <SalaryKPICards stats={stats} loading={loading} />

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Bộ lọc và Xuất dữ liệu</CardTitle>
                <CardDescription>Lọc theo tháng, phòng ban, trạng thái</CardDescription>
              </div>
              <Button
                onClick={handleExport}
                disabled={exporting}
                className="gap-2"
                variant="outline"
              >
                <Download className="h-4 w-4" />
                {exporting ? 'Đang xuất...' : 'Xuất Excel'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              {/* Month Filter */}
              <div className="flex-1 min-w-[150px]">
                <Label className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4" />
                  Tháng
                </Label>
                <Select
                  value={selectedMonth.toString()}
                  onValueChange={(v) => setSelectedMonth(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <SelectItem key={m} value={m.toString()}>
                        Tháng {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Year Filter */}
              <div className="flex-1 min-w-[150px]">
                <Label className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4" />
                  Năm
                </Label>
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(v) => setSelectedYear(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => currentYear - i).map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Department Filter (only for employees tab) */}
              {activeTab === 'employees' && (
                <div className="flex-1 min-w-[150px]">
                  <Label className="mb-2">Phòng ban</Label>
                  <Select
                    value={selectedDepartment}
                    onValueChange={setSelectedDepartment}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="Van phong">Văn phòng</SelectItem>
                      <SelectItem value="Tai chinh">Tài chính</SelectItem>
                      <SelectItem value="Van hanh">Vận hành</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Status Filter */}
              <div className="flex-1 min-w-[150px]">
                <Label className="mb-2">Trạng thái</Label>
                <Select
                  value={selectedStatus}
                  onValueChange={setSelectedStatus}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="chua_thanh_toan">Chưa thanh toán</SelectItem>
                    <SelectItem value="da_xac_nhan">Đã xác nhận</SelectItem>
                    <SelectItem value="da_thanh_toan">Đã thanh toán</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="employees">
              Lương nhân viên ({employeeSalaries.length})
            </TabsTrigger>
            <TabsTrigger value="drivers">
              Lương tài xế ({driverSalaries.length})
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Employee Salaries */}
          <TabsContent value="employees" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Bảng lương nhân viên</CardTitle>
                <CardDescription>
                  Lương cố định theo hợp đồng - Tháng {selectedMonth}/{selectedYear}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SalaryTable
                  salaries={employeeSalaries}
                  loading={loading}
                  type="nhan_vien"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Driver Salaries */}
          <TabsContent value="drivers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Bảng lương tài xế</CardTitle>
                <CardDescription>
                  Lương tính theo doanh thu chuyến đi (15%) - Tháng {selectedMonth}/{selectedYear}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SalaryTable
                  salaries={driverSalaries}
                  loading={loading}
                  type="tai_xe"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
