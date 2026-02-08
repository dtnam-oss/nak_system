'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Users, TrendingUp, AlertCircle } from 'lucide-react';

interface SalaryStats {
  total_salary_month: number;
  total_employees: number;
  total_drivers: number;
  avg_salary: number;
  total_employee_salary: number;
  total_driver_salary: number;
  pending_count: number;
}

interface SalaryKPICardsProps {
  stats: SalaryStats | null;
  loading?: boolean;
}

export function SalaryKPICards({ stats, loading }: SalaryKPICardsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-32 bg-gray-200 rounded" />
              <div className="h-4 w-4 bg-gray-200 rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-40 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-24 bg-gray-200 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(num);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num);
  };

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {/* Card 1: Tổng lương tháng */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
          <CardTitle className="text-xs font-medium">
            Tổng lương tháng
          </CardTitle>
          <DollarSign className="h-3.5 w-3.5 text-green-500" />
        </CardHeader>
        <CardContent className="pt-1">
          <div className="space-y-1.5">
            <div className="text-lg font-bold">
              {formatCurrency(stats.total_salary_month)}
            </div>
            <p className="text-[10px] text-muted-foreground">
              NV: {formatCurrency(stats.total_employee_salary)} |
              TX: {formatCurrency(stats.total_driver_salary)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Số nhân viên */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
          <CardTitle className="text-xs font-medium">
            Tổng nhân viên
          </CardTitle>
          <Users className="h-3.5 w-3.5 text-blue-500" />
        </CardHeader>
        <CardContent className="pt-1">
          <div className="space-y-1.5">
            <div className="text-lg font-bold">
              {formatNumber(stats.total_employees + stats.total_drivers)}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Nhân viên: {stats.total_employees} | Tài xế: {stats.total_drivers}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Lương trung bình */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
          <CardTitle className="text-xs font-medium">
            Lương trung bình
          </CardTitle>
          <TrendingUp className="h-3.5 w-3.5 text-orange-500" />
        </CardHeader>
        <CardContent className="pt-1">
          <div className="space-y-1.5">
            <div className="text-lg font-bold">
              {formatCurrency(stats.avg_salary)}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Tính trên toàn bộ nhân sự
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card 4: Chưa thanh toán */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
          <CardTitle className="text-xs font-medium">
            Chưa thanh toán
          </CardTitle>
          <AlertCircle className={`h-3.5 w-3.5 ${stats.pending_count > 0 ? 'text-red-500' : 'text-gray-400'}`} />
        </CardHeader>
        <CardContent className="pt-1">
          <div className="space-y-1.5">
            <div className="text-lg font-bold">
              {formatNumber(stats.pending_count)} người
            </div>
            <p className="text-[10px] text-muted-foreground">
              {stats.pending_count > 0 ? 'Cần xử lý' : 'Đã thanh toán hết'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
