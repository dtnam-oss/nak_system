'use client';

interface BaoCaoData {
  thang: number;
  so_nhan_vien: number;
  tong_luong_chuyen: number;
  tong_chi_phi_sua_chua: number;
  tong_hoan_coc: number;
  tong_chi_phi_do_dau_ngoai: number;
  tong_chi_phi_phat_sinh_new: number;
  tong_thuong: number;
  tong_truy_thu_dau: number;
  tong_truy_thu_ontime: number;
  tong_tru_coc: number;
  tong_tam_ung: number;
  tong_phat_che_tai: number;
  tong_truy_thu_vetc: number;
  tong_phat_nguoi: number;
  tong_tien_lam_the: number;
  tong_bhxh: number;
  tong_khac: number;
  tong_thu_nhap: number;
  tong_khau_tru: number;
  tong_luong_thuc_lanh: number;
}

interface BaoCaoTableProps {
  data: BaoCaoData | null;
  loading: boolean;
  month: number;
  year: number;
}

export function BaoCaoTable({ data, loading, month, year }: BaoCaoTableProps) {
  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Đang tải báo cáo...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Không có dữ liệu báo cáo cho tháng {month}/{year}
      </div>
    );
  }

  // Define categories
  const categories = [
    { key: 'so_nhan_vien', label: 'Số nhân viên', type: 'info' },
    { key: 'tong_luong_chuyen', label: 'Lương chuyến', type: 'income' },
    { key: 'tong_chi_phi_sua_chua', label: 'Chi phí sửa chữa', type: 'income' },
    { key: 'tong_hoan_coc', label: 'Hoàn cọc', type: 'income' },
    { key: 'tong_chi_phi_do_dau_ngoai', label: 'Chi phí đổ dầu ngoài', type: 'income' },
    { key: 'tong_chi_phi_phat_sinh_new', label: 'Chi phí phát sinh', type: 'income' },
    { key: 'tong_thuong', label: 'Thưởng', type: 'income' },
    { key: 'tong_truy_thu_dau', label: 'Truy thu dầu', type: 'deduction' },
    { key: 'tong_truy_thu_ontime', label: 'Truy thu ontime', type: 'deduction' },
    { key: 'tong_tru_coc', label: 'Trừ cọc', type: 'deduction' },
    { key: 'tong_tam_ung', label: 'Tạm ứng', type: 'deduction' },
    { key: 'tong_phat_che_tai', label: 'Phạt chế tài', type: 'deduction' },
    { key: 'tong_truy_thu_vetc', label: 'Truy thu VETC', type: 'deduction' },
    { key: 'tong_phat_nguoi', label: 'Phạt người', type: 'deduction' },
    { key: 'tong_tien_lam_the', label: 'Tiền làm thẻ', type: 'deduction' },
    { key: 'tong_bhxh', label: 'BHXH', type: 'deduction' },
    { key: 'tong_khac', label: 'Khác', type: 'deduction' },
    { key: 'tong_thu_nhap', label: 'Tổng thu nhập', type: 'summary' },
    { key: 'tong_khau_tru', label: 'Tổng khấu trừ', type: 'summary' },
    { key: 'tong_luong_thuc_lanh', label: 'Lương thực lãnh', type: 'summary' }
  ];

  const formatNumber = (value: number, isCount = false) => {
    if (isCount) return value.toString();
    return new Intl.NumberFormat('vi-VN').format(value);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-blue-600 text-white">
              <th className="h-12 px-4 text-left font-semibold min-w-[250px]">
                Hạng mục
              </th>
              <th className="h-12 px-4 text-right font-semibold min-w-[180px]">
                Tháng {month}/{year}
              </th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => {
              const value = parseFloat(data[category.key as keyof BaoCaoData] as any) || 0;
              const isCount = category.key === 'so_nhan_vien';
              
              let rowClass = 'border-b hover:bg-muted/50';
              if (category.type === 'info') {
                rowClass = 'border-b bg-gray-100 font-medium';
              } else if (category.type === 'summary') {
                rowClass = 'border-b bg-yellow-50 font-bold';
              }

              return (
                <tr key={category.key} className={rowClass}>
                  <td className="p-4 font-medium">
                    {category.label}
                  </td>
                  <td className="p-4 text-right font-medium">
                    {formatNumber(value, isCount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-sm text-muted-foreground">
        <p className="font-medium">Ghi chú:</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Báo cáo tổng hợp tất cả nhân viên cho tháng {month}/{year}</li>
          <li>Các số liệu được tự động tính toán từ bảng Lương tổng hợp</li>
          <li>Thu nhập = Lương chuyến + Chi phí sửa chữa + Hoàn cọc + Chi phí đổ dầu + Chi phí phát sinh + Thưởng</li>
          <li>Khấu trừ = Truy thu dầu + Truy thu ontime + Trừ cọc + Tạm ứng + Các khoản phạt + BHXH + Khác</li>
        </ul>
      </div>
    </div>
  );
}
