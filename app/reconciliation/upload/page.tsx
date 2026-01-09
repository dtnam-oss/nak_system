import { DashboardLayout } from '@/components/dashboard-layout';
import { ReconciliationUpload } from '@/components/reconciliation/import-upload';

export default function ReconciliationUploadPage() {
  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Đối soát", href: "/reconciliation" },
        { label: "Import & So sánh" },
      ]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Import File Đối Soát</h1>
          <p className="text-muted-foreground mt-2">
            Upload file Excel đối soát từ khách hàng để so sánh với dữ liệu trong hệ thống
          </p>
        </div>

        <ReconciliationUpload />
      </div>
    </DashboardLayout>
  );
}
