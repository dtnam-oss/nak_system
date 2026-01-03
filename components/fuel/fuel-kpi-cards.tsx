'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Fuel, DollarSign, TrendingDown, AlertTriangle } from 'lucide-react';

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

interface FuelKPICardsProps {
  stats: FuelStats | null;
  loading?: boolean;
}

export function FuelKPICards({ stats, loading }: FuelKPICardsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
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
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Không có dữ liệu</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const {
    current_inventory,
    inventory_value,
    monthly_consumption,
    tank_capacity,
    tank_percentage,
  } = stats;

  // Xác định màu sắc cho Tank Level
  const isLowFuel = tank_percentage < 20;
  const progressColor = isLowFuel ? 'bg-red-500' : 'bg-green-500';
  const tankStatusText = isLowFuel ? 'Cảnh báo: Mức dầu thấp' : 'Bình thường';
  const tankStatusColor = isLowFuel ? 'text-red-600' : 'text-green-600';

  // Format số
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('vi-VN', {
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(num);
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Card 1: Tồn kho Bồn dầu */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
          <CardTitle className="text-xs font-medium">
            Tồn kho Bồn dầu
          </CardTitle>
          <Fuel className={`h-3.5 w-3.5 ${isLowFuel ? 'text-red-500' : 'text-green-500'}`} />
        </CardHeader>
        <CardContent className="pt-1">
          <div className="space-y-2">
            <div>
              <div className="text-lg font-bold">
                {formatNumber(current_inventory)} L
              </div>
              <p className="text-[10px] text-muted-foreground">
                / {formatNumber(tank_capacity)} Lít
              </p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className={`font-medium ${tankStatusColor}`}>
                  {tankStatusText}
                </span>
                <span className="text-muted-foreground">
                  {tank_percentage.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={tank_percentage} 
                className="h-1.5"
                indicatorClassName={progressColor}
              />
            </div>

            {isLowFuel && (
              <div className="flex items-center gap-1 text-[10px] text-red-600 bg-red-50 p-1.5 rounded">
                <AlertTriangle className="h-3 w-3" />
                <span>Cần nhập thêm nhiên liệu</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Giá trị Tồn kho */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
          <CardTitle className="text-xs font-medium">
            Giá trị Tồn kho
          </CardTitle>
          <DollarSign className="h-3.5 w-3.5 text-blue-500" />
        </CardHeader>
        <CardContent className="pt-1">
          <div className="space-y-1.5">
            <div className="text-lg font-bold">
              {formatCurrency(inventory_value)}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Tính theo giá bình quân
            </p>
            <div className="text-[10px] text-muted-foreground pt-1.5 border-t">
              <div className="flex justify-between">
                <span>Tồn kho:</span>
                <span className="font-medium">{formatNumber(current_inventory)} L</span>
              </div>
              <div className="flex justify-between mt-0.5">
                <span>Giá TB:</span>
                <span className="font-medium">{formatNumber(stats.current_avg_price)} đ/L</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Tiêu thụ trong tháng */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
          <CardTitle className="text-xs font-medium">
            Tiêu thụ tháng này
          </CardTitle>
          <TrendingDown className="h-3.5 w-3.5 text-orange-500" />
        </CardHeader>
        <CardContent className="pt-1">
          <div className="space-y-1.5">
            <div className="text-lg font-bold">
              {formatNumber(monthly_consumption)} L
            </div>
            <p className="text-[10px] text-muted-foreground">
              Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}
            </p>
            
            {monthly_consumption > 0 && current_inventory > 0 && (
              <div className="text-[10px] text-muted-foreground pt-1.5 border-t">
                <div className="flex justify-between">
                  <span>Dự kiến còn:</span>
                  <span className="font-medium">
                    ~{Math.floor(current_inventory / (monthly_consumption / new Date().getDate()))} ngày
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
