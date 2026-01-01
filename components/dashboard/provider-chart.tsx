'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface ProviderChartProps {
  data: {
    nak: number;
    vendor: number;
  };
}

const COLORS = {
  nak: '#3b82f6',
  vendor: '#f59e0b',
};

export function ProviderChart({ data }: ProviderChartProps) {
  const chartData = [
    { name: 'NAK (Nội bộ)', value: data.nak, color: COLORS.nak },
    { name: 'VENDOR (Thuê ngoài)', value: data.vendor, color: COLORS.vendor },
  ];

  const total = data.nak + data.vendor;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tỷ trọng vận tải</CardTitle>
        <p className="text-sm text-muted-foreground">Tháng này</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              fill="#8884d8"
              paddingAngle={5}
              dataKey="value"
              label={({ percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number | undefined) => [value || 0, 'Số đơn']}
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
              }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value, entry: any) => {
                const percentage = total > 0 ? ((entry.payload.value / total) * 100).toFixed(1) : 0;
                return `${value}: ${entry.payload.value} (${percentage}%)`;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
