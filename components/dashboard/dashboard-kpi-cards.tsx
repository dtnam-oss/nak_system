'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, AlertCircle, Truck, Droplet, FileText, Wallet, Clock } from 'lucide-react';
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
      <Card className="glass-card border-none relative overflow-hidden group">
        <div className="absolute right-[-20px] top-[-20px] opacity-5 transform rotate-12 transition-transform group-hover:scale-110 duration-500">
          <Wallet className="w-32 h-32 text-primary" />
        </div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 relative z-10">
          <CardTitle className="text-sm font-medium text-muted-foreground">Doanh thu tháng này</CardTitle>
          <div className="p-2 bg-primary/10 rounded-full">
            <FileText className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent className="pt-1 relative z-10">
          <div className="text-2xl font-bold text-foreground">{formatCurrency(revenue.current)}</div>
          <div className="flex items-center gap-1 text-xs mt-1">
            <span className={cn(
              "flex items-center font-medium",
              isRevenueUp ? "text-emerald-500" : "text-rose-500"
            )}>
              {isRevenueUp ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              {Math.abs(revenue.percentageChange)}%
            </span>
            <span className="text-muted-foreground">so với tháng trước</span>
          </div>
        </CardContent>
      </Card>

      {/* Pending Orders Card */}
      <Card className={cn(
        "glass-card border-none relative overflow-hidden group transition-all duration-300",
        isPendingCritical && "shadow-orange-500/20" // colored shadow if critical
      )}>
        <div className="absolute right-[-20px] top-[-20px] opacity-5 transform rotate-12 transition-transform group-hover:scale-110 duration-500">
          <Clock className={cn("w-32 h-32", isPendingCritical ? "text-orange-500" : "text-primary")} />
        </div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 relative z-10">
          <CardTitle className="text-sm font-medium text-muted-foreground">Đơn cần đối soát</CardTitle>
          <div className={cn("p-2 rounded-full", isPendingCritical ? "bg-orange-500/10" : "bg-primary/10")}>
            <AlertCircle className={cn(
              "h-4 w-4",
              isPendingCritical ? "text-orange-600" : "text-primary"
            )} />
          </div>
        </CardHeader>
        <CardContent className="pt-1 relative z-10">
          <div className={cn(
            "text-2xl font-bold",
            isPendingCritical ? "text-orange-600" : "text-foreground"
          )}>
            {pendingOrders}
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            {isPendingCritical ? "Cần xử lý ngay" : "Không có đơn chờ"}
          </p>
        </CardContent>
      </Card>

      {/* Vehicles Card */}
      <Card className="glass-card border-none relative overflow-hidden group">
        <div className="absolute right-[-20px] top-[-20px] opacity-5 transform rotate-12 transition-transform group-hover:scale-110 duration-500">
          <Truck className="w-32 h-32 text-blue-500" />
        </div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 relative z-10">
          <CardTitle className="text-sm font-medium text-muted-foreground">Tình trạng đội xe</CardTitle>
          <div className="p-2 bg-blue-500/10 rounded-full">
            <Truck className="h-4 w-4 text-blue-600" />
          </div>
        </CardHeader>
        <CardContent className="pt-1 relative z-10">
          <div className="text-2xl font-bold text-foreground">
            {vehicles.active}<span className="text-lg text-muted-foreground font-normal">/{vehicles.total}</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${(vehicles.active / (vehicles.total || 1)) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground whitespace-nowrap">
              {vehicles.active} xe chạy
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Fuel Tank Card */}
      <Card className={cn(
        "glass-card border-none relative overflow-hidden group",
        isFuelLow && "shadow-red-500/20"
      )}>
        <div className="absolute right-[-20px] top-[-20px] opacity-5 transform rotate-12 transition-transform group-hover:scale-110 duration-500">
          <Droplet className={cn("w-32 h-32", isFuelLow ? "text-red-500" : "text-cyan-500")} />
        </div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 relative z-10">
          <CardTitle className="text-sm font-medium text-muted-foreground">Kho nhiên liệu</CardTitle>
          <div className={cn("p-2 rounded-full", isFuelLow ? "bg-red-500/10" : "bg-cyan-500/10")}>
            <Droplet className={cn(
              "h-4 w-4",
              isFuelLow ? "text-red-600" : "text-cyan-600"
            )} />
          </div>
        </CardHeader>
        <CardContent className="pt-1 relative z-10">
          <div className="text-2xl font-bold text-foreground">
            {Math.round(fuelTank.currentLevel).toLocaleString('vi-VN')} <span className="text-sm font-normal text-muted-foreground">L</span>
          </div>
          <div className="mt-2 space-y-1">
            <Progress
              value={fuelTank.percentage}
              className="h-1.5 bg-secondary"
              indicatorClassName={cn(
                "transition-all duration-500",
                isFuelLow ? "bg-red-600" : "bg-gradient-to-r from-cyan-500 to-blue-500"
              )}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{fuelTank.percentage.toFixed(1)}%</span>
              <span>{fuelTank.capacity.toLocaleString('vi-VN')}L</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
