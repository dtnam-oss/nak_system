'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, AlertCircle, Truck, Droplet, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardsProps {
  revenue: {
    current: number;
    percentageChange: number;
  };
  pendingOrders: number;
  vehicles: {
    total: number;
    active: number;
  };
  fuelTank: {
    currentLevel: number;
    capacity: number;
    percentage: number;
  };
}

export function DashboardKpiCards({ revenue, pendingOrders, vehicles, fuelTank }: KPICardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const isRevenueUp = revenue.percentageChange >= 0;
  const isPendingCritical = pendingOrders > 0;
  const isFuelLow = fuelTank.percentage < 20;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Revenue Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Doanh thu tháng này</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(revenue.current)}</div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            {isRevenueUp ? (
              <TrendingUp className="h-3 w-3 text-green-600" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-600" />
            )}
            <span className={cn(
              isRevenueUp ? "text-green-600" : "text-red-600"
            )}>
              {Math.abs(revenue.percentageChange)}%
            </span>
            <span>so với tháng trước</span>
          </div>
        </CardContent>
      </Card>

      {/* Pending Orders Card */}
      <Card className={cn(
        isPendingCritical && "border-orange-500 bg-orange-50/50"
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Đơn cần đối soát</CardTitle>
          <AlertCircle className={cn(
            "h-4 w-4",
            isPendingCritical ? "text-orange-600" : "text-muted-foreground"
          )} />
        </CardHeader>
        <CardContent>
          <div className={cn(
            "text-2xl font-bold",
            isPendingCritical && "text-orange-600"
          )}>
            {pendingOrders}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {isPendingCritical ? "Cần xử lý ngay" : "Không có đơn chờ"}
          </p>
        </CardContent>
      </Card>

      {/* Vehicles Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tình trạng đội xe</CardTitle>
          <Truck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {vehicles.active}/{vehicles.total}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {vehicles.active} xe đang hoạt động
          </p>
        </CardContent>
      </Card>

      {/* Fuel Tank Card */}
      <Card className={cn(
        isFuelLow && "border-red-500 bg-red-50/50"
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Mức nhiên liệu</CardTitle>
          <Droplet className={cn(
            "h-4 w-4",
            isFuelLow ? "text-red-600" : "text-blue-600"
          )} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {Math.round(fuelTank.currentLevel).toLocaleString('vi-VN')} L
          </div>
          <div className="mt-2 space-y-1">
            <Progress 
              value={fuelTank.percentage} 
              indicatorClassName={cn(
                isFuelLow ? "bg-red-600" : "bg-blue-600"
              )}
            />
            <p className="text-xs text-muted-foreground">
              {fuelTank.percentage.toFixed(1)}% / {fuelTank.capacity.toLocaleString('vi-VN')}L
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
