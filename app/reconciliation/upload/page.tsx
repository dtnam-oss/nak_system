import { ReconciliationUpload } from '@/components/reconciliation/import-upload';

export default function ReconciliationUploadPage() {
  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Import File Đối Soát</h1>
        <p className="text-muted-foreground mt-2">
          Upload file Excel đối soát từ khách hàng để so sánh với dữ liệu trong hệ thống
        </p>
      </div>

      <ReconciliationUpload />
    </div>
  );
}
