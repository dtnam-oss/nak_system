import { DashboardLayout } from '@/components/dashboard-layout';
import { ComparisonResults } from '@/components/reconciliation/comparison-results';

export default function ReconciliationComparePage() {
  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Đối soát", href: "/reconciliation" },
        { label: "Kết quả so sánh" },
      ]}
    >
      <ComparisonResults />
    </DashboardLayout>
  );
}
