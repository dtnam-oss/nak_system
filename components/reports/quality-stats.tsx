
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, AlertTriangle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface QualityStatsProps {
    stats: {
        totalOrders: number;
        qualityScore: number;
        errors: {
            missingRoute: number;
            missingWeight: number;
            missingMoney: number;
            missingPlate: number;
        };
    };
    isLoading: boolean;
    activeFilter: string;
    onFilterChange: (filter: string) => void;
}

export function DataQualityStats({ stats, isLoading, activeFilter, onFilterChange }: QualityStatsProps) {

    const cards = [
        {
            id: "all",
            label: "Tổng hồ sơ",
            value: stats.totalOrders,
            icon: FileText,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            border: "border-blue-200"
        },
        {
            id: "score",
            label: "Điểm chất lượng",
            value: `${stats.qualityScore}%`,
            icon: CheckCircle2,
            color: stats.qualityScore > 90 ? "text-green-500" : "text-yellow-500",
            bg: stats.qualityScore > 90 ? "bg-green-500/10" : "bg-yellow-500/10",
            border: stats.qualityScore > 90 ? "border-green-200" : "border-yellow-200"
        },
        {
            id: "missing_plate",
            label: "Thiếu Biển Số",
            value: stats.errors.missingPlate,
            icon: AlertTriangle,
            color: "text-orange-500",
            bg: "bg-orange-500/10",
            border: "border-orange-200",
            isError: true
        },
        {
            id: "missing_route",
            label: "Thiếu Tuyến",
            value: stats.errors.missingRoute,
            icon: AlertCircle,
            color: "text-red-500",
            bg: "bg-red-500/10",
            border: "border-red-200",
            isError: true
        }
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => {
                const isActive = activeFilter === card.id;
                return (
                    <Card
                        key={card.id}
                        className={cn(
                            "cursor-pointer transition-all hover:shadow-md border-2",
                            isActive ? card.border : "border-transparent",
                            isActive ? "bg-accent/40" : "glass-card"
                        )}
                        onClick={() => card.id !== 'score' && onFilterChange(isActive ? 'all' : card.id)}
                    >
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                                <div className="text-2xl font-bold mt-1">
                                    {isLoading ? "..." : card.value}
                                </div>
                            </div>
                            <div className={cn("p-2 rounded-full", card.bg)}>
                                <card.icon className={cn("h-5 w-5", card.color)} />
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
