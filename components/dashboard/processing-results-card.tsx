"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, CircleDashed, TrendingUp, Wallet } from "lucide-react";

interface ProcessingResultProps {
    data: {
        totalTrips: number;
        totalRevenue: number;
        processed: number;
        pending: number;
        processingRate: number;
        breakdown: Record<string, number>;
    };
    mode: "morning" | "evening";
}

export function ProcessingResultsCard({ data, mode }: ProcessingResultProps) {
    const isMorning = mode === "morning";

    // Formatter
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Total Trips (Plan vs Result) */}
            <Card className="glass-card border-none relative overflow-hidden group">
                <div className="absolute right-[-20px] top-[-20px] opacity-5 transform rotate-12 transition-transform group-hover:scale-110 duration-500">
                    <CircleDashed className="w-32 h-32 text-primary" />
                </div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 relative z-10">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        {isMorning ? "Kế hoạch chuyến đi" : "Tổng chuyến hôm nay"}
                    </CardTitle>
                    <div className="p-2 bg-primary/10 rounded-full">
                        <TrendingUp className="h-4 w-4 text-primary" />
                    </div>
                </CardHeader>
                <CardContent className="pt-1 relative z-10">
                    <div className="text-2xl font-bold text-foreground">{data.totalTrips}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                        {isMorning ? "Dự kiến triển khai" : "Đã ghi nhận trên hệ thống"}
                    </p>
                </CardContent>
            </Card>

            {/* Logic: Revenue (Realtime) */}
            <Card className="glass-card border-none relative overflow-hidden group">
                <div className="absolute right-[-20px] top-[-20px] opacity-5 transform rotate-12 transition-transform group-hover:scale-110 duration-500">
                    <Wallet className="w-32 h-32 text-emerald-500" />
                </div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 relative z-10">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Doanh thu tạm tính</CardTitle>
                    <div className="p-2 bg-emerald-500/10 rounded-full">
                        <Wallet className="h-4 w-4 text-emerald-600" />
                    </div>
                </CardHeader>
                <CardContent className="pt-1 relative z-10">
                    <div className="text-2xl font-bold text-foreground">{formatCurrency(data.totalRevenue)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Cập nhật theo thời gian thực
                    </p>
                </CardContent>
            </Card>

            {/* Logic: Process Rate */}
            <Card className="glass-card border-none relative overflow-hidden group">
                <div className="absolute right-[-20px] top-[-20px] opacity-5 transform rotate-12 transition-transform group-hover:scale-110 duration-500">
                    <CheckCircle2 className="w-32 h-32 text-blue-500" />
                </div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 relative z-10">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Tỷ lệ hoàn thành</CardTitle>
                    <div className="p-2 bg-blue-500/10 rounded-full">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                    </div>
                </CardHeader>
                <CardContent className="pt-1 relative z-10">
                    <div className="text-2xl font-bold text-foreground">{data.processingRate.toFixed(1)}%</div>
                    <div className="w-full bg-secondary h-1.5 rounded-full mt-2 overflow-hidden">
                        <div
                            className="bg-blue-500 h-full transition-all duration-500"
                            style={{ width: `${data.processingRate}%` }}
                        />
                    </div>
                    <div className="flex text-xs text-muted-foreground mt-1 justify-between">
                        <span>{data.processed} Hoàn thành</span>
                        <span>{data.totalTrips} Tổng</span>
                    </div>
                </CardContent>
            </Card>

            {/* Logic: Pending/Issue */}
            <Card className={cn(
                "glass-card border-none relative overflow-hidden group",
                data.pending > 0 && "shadow-orange-500/20"
            )}>
                <div className="absolute right-[-20px] top-[-20px] opacity-5 transform rotate-12 transition-transform group-hover:scale-110 duration-500">
                    <AlertCircle className={cn("w-32 h-32", data.pending > 0 ? "text-orange-500" : "text-gray-400")} />
                </div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 relative z-10">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Đang xử lý / Chờ d.</CardTitle>
                    <div className={cn("p-2 rounded-full", data.pending > 0 ? "bg-orange-500/10" : "bg-gray-100")}>
                        <AlertCircle className={cn("h-4 w-4", data.pending > 0 ? "text-orange-600" : "text-gray-500")} />
                    </div>
                </CardHeader>
                <CardContent className="pt-1 relative z-10">
                    <div className={cn("text-2xl font-bold", data.pending > 0 ? "text-orange-600" : "text-foreground")}>
                        {data.pending}
                    </div>
                    <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                        <span>Mới: {data.breakdown['new'] || 0}</span>
                        <span>•</span>
                        <span>Pending: {data.breakdown['pending'] || 0}</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
