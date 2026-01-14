"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, TrendingUp } from "lucide-react";

interface CustomerProps {
    data: {
        topList: Array<{ name: string; trips: number; revenue: number }>;
    };
}

export function CustomerInsightsCard({ data }: CustomerProps) {
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(val);

    return (
        <Card className="glass-card border-none h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-orange-500" />
                    Top Khách hàng Hôm nay
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {data.topList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                            <p className="text-sm">Chưa có dữ liệu đơn hàng</p>
                        </div>
                    ) : (
                        data.topList.map((customer, idx) => (
                            <div key={idx} className="group flex items-center justify-between border-b last:border-0 pb-3 last:pb-0 hover:bg-accent/30 p-2 rounded-md transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="bg-orange-100 dark:bg-orange-900/20 p-2 rounded-md group-hover:scale-110 transition-transform">
                                        <Building2 className="h-4 w-4 text-orange-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium leading-none">{customer.name}</p>
                                        <p className="text-xs text-muted-foreground mt-1">{customer.trips} chuyến</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold">{formatCurrency(customer.revenue)}</p>
                                    <div className="flex items-center justify-end gap-1 text-[10px] text-green-600">
                                        <TrendingUp className="h-2 w-2" />
                                        <span>Active</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
