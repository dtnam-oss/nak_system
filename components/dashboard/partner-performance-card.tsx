"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Truck } from "lucide-react";

interface PartnerProps {
    data: {
        nakTrips: number;
        vendorTrips: number;
        distribution: { nak: number; vendor: number };
        topPartners: Array<{ name: string; trips: number; revenue: number }>;
    };
}

export function PartnerPerformanceCard({ data }: PartnerProps) {
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(val);

    return (
        <Card className="glass-card border-none h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Hiệu suất Đối tác Vận chuyển
                </CardTitle>
            </CardHeader>
            <CardContent>
                {/* Distribution Bar */}
                <div className="mb-6">
                    <div className="flex justify-between text-sm mb-2 text-muted-foreground">
                        <span className="flex items-center gap-1"><Truck className="h-3 w-3 text-primary" /> Đội xe NAK ({data.nakTrips})</span>
                        <span className="flex items-center gap-1">Đối tác ngoài ({data.vendorTrips}) <Users className="h-3 w-3 text-purple-500" /></span>
                    </div>
                    <div className="w-full h-3 bg-secondary rounded-full overflow-hidden flex">
                        <div
                            className="bg-primary h-full transition-all duration-500"
                            style={{ width: `${data.distribution.nak}%` }}
                        />
                        <div
                            className="bg-purple-500 h-full transition-all duration-500"
                            style={{ width: `${data.distribution.vendor}%` }}
                        />
                    </div>
                </div>

                {/* Top Partners List */}
                <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Top Đối tác Hiệu quả</h4>
                    {data.topPartners.length === 0 ? (
                        <p className="text-sm text-center py-4 text-muted-foreground">Chưa có dữ liệu hôm nay</p>
                    ) : (
                        data.topPartners.map((partner, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors border border-border/50">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs ring-2 ring-background">
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{partner.name}</p>
                                        <p className="text-xs text-muted-foreground">{partner.trips} chuyến</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-primary">{formatCurrency(partner.revenue)}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
