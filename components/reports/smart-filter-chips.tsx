
"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface FilterChipsProps {
    activeFilter: string;
    onFilterChange: (filter: string) => void;
    stats: {
        missingRoute: number;
        missingWeight: number;
        missingMoney: number;
        missingPlate: number;
    };
}

export function SmartFilterChips({ activeFilter, onFilterChange, stats }: FilterChipsProps) {

    const filters = [
        { id: 'missing_plate', label: 'Thiếu Biển Số', count: stats.missingPlate, color: 'destructive' },
        { id: 'missing_route', label: 'Thiếu Tuyến', count: stats.missingRoute, color: 'destructive' },
        { id: 'missing_weight', label: 'Thiếu Tải Trọng', count: stats.missingWeight, color: 'warning' }, // custom warning variant if exists, else destructive/secondary
        { id: 'missing_money', label: 'Thiếu Doanh Thu', count: stats.missingMoney, color: 'secondary' },
    ];

    // Only show filters that have counts > 0
    const activeFilters = filters.filter(f => f.count > 0);

    if (activeFilters.length === 0 && activeFilter === 'all') return null;

    return (
        <div className="flex flex-wrap items-center gap-2 py-2 overflow-x-auto scrollbar-hide">
            <span className="text-xs font-semibold text-muted-foreground mr-2">Lọc nhanh lỗi:</span>

            {activeFilters.map(filter => (
                <Badge
                    key={filter.id}
                    variant={activeFilter === filter.id ? "default" : "outline"}
                    className={cn(
                        "cursor-pointer px-3 py-1 text-xs gap-2 transition-all hover:bg-opacity-80",
                        activeFilter === filter.id ? "ring-2 ring-offset-1 ring-primary" : "opacity-80 hover:opacity-100",
                        // Styling based on error type
                        filter.id.includes('missing') && activeFilter !== filter.id && "border-destructive/50 text-destructive"
                    )}
                    onClick={() => onFilterChange(activeFilter === filter.id ? 'all' : filter.id)}
                >
                    {filter.label}
                    <span className="bg-background/20 px-1.5 rounded-full text-[10px] ml-1">
                        {filter.count}
                    </span>
                </Badge>
            ))}

            {activeFilter !== 'all' && (
                <ButtonVariant
                    onClick={() => onFilterChange('all')}
                    className="text-xs h-6 px-2 ml-2 text-muted-foreground hover:text-foreground"
                >
                    Xóa bộ lọc <X className="h-3 w-3 ml-1" />
                </ButtonVariant>
            )}
        </div>
    );
}

// Minimal button helper to avoid circular deps or heavy imports if not needed
function ButtonVariant({ onClick, className, children }: any) {
    return (
        <button onClick={onClick} className={cn("flex items-center rounded-md transition-colors", className)}>
            {children}
        </button>
    )
}
