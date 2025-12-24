import { ReconciliationSummary } from "@/types/reconciliation"
import { Card } from "@/components/ui/card"

interface SummaryBarProps {
  summary: ReconciliationSummary
}

export function SummaryBar({ summary }: SummaryBarProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("vi-VN").format(num)
  }

  const stats = [
    {
      label: "Tổng đơn hàng",
      value: formatNumber(summary.totalOrders),
      color: "text-foreground",
    },
    {
      label: "Tổng tiền",
      value: formatCurrency(summary.totalAmount),
      color: "text-primary",
    },
    {
      label: "Tổng quãng đường",
      value: `${formatNumber(summary.totalDistance)} km`,
      color: "text-foreground",
    },
    {
      label: "Đã duyệt",
      value: formatNumber(summary.approvedOrders),
      color: "text-emerald-600",
    },
    {
      label: "Chờ duyệt",
      value: formatNumber(summary.pendingOrders),
      color: "text-amber-600",
    },
  ]

  return (
    <Card className="mb-4 p-4">
      <div className="grid grid-cols-5 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="text-center">
            <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}
