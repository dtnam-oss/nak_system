'use client';

interface TienThuongRecord {
  id: string;
  ma_nhan_vien: string;
  ho_va_ten: string;
  email: string;
  hang_muc: string;
  tien_thuong: number;
  thang: number;
  nam: number;
}

interface TienThuongTableProps {
  data: TienThuongRecord[];
  loading: boolean;
}

export function TienThuongTable({ data, loading }: TienThuongTableProps) {
  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Đang tải dữ liệu tiền thưởng...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Không có dữ liệu tiền thưởng cho tháng này
      </div>
    );
  }

  // Calculate totals
  const totalTienThuong = data.reduce((sum, record) => {
    return sum + (parseFloat(record.tien_thuong as any) || 0);
  }, 0);

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="h-10 px-4 text-left font-medium">STT</th>
              <th className="h-10 px-4 text-left font-medium">Mã NV</th>
              <th className="h-10 px-4 text-left font-medium">Họ và tên</th>
              <th className="h-10 px-4 text-left font-medium">Email</th>
              <th className="h-10 px-4 text-left font-medium">Hạng mục</th>
              <th className="h-10 px-4 text-right font-medium">Tiền thưởng</th>
            </tr>
          </thead>
          <tbody>
            {data.map((record, index) => (
              <tr key={record.id} className="border-b hover:bg-muted/50">
                <td className="p-4">{index + 1}</td>
                <td className="p-4 font-medium">{record.ma_nhan_vien}</td>
                <td className="p-4">{record.ho_va_ten}</td>
                <td className="p-4 text-muted-foreground">{record.email}</td>
                <td className="p-4">{record.hang_muc}</td>
                <td className="p-4 text-right font-medium">
                  {new Intl.NumberFormat('vi-VN').format(
                    parseFloat(record.tien_thuong as any) || 0
                  )}{' '}
                  VNĐ
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-blue-50 border-t-2 border-blue-200">
              <td colSpan={5} className="p-4 font-bold text-right">
                TỔNG CỘNG ({data.length} hạng mục):
              </td>
              <td className="p-4 text-right font-bold text-blue-700">
                {new Intl.NumberFormat('vi-VN').format(totalTienThuong)} VNĐ
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
