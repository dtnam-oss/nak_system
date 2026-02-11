'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { SalaryTable } from '@/components/salary/salary-table';
import { LuongChuyenTable } from '@/components/salary/luong-chuyen-table';
import { LuongTongHopTable } from '@/components/salary/luong-tong-hop-table';
import { MaintenanceTable } from '@/components/maintenance/maintenance-table';
import { TienCocTable } from '@/components/salary/tien-coc-table';
import { TienThuongTable } from '@/components/salary/tien-thuong-table';
import { BHXHTable } from '@/components/salary/bhxh-table';
import { BaoCaoTable } from '@/components/salary/bao-cao-table';
import { CreateSalarySlipDialog } from '@/components/salary/create-salary-slip-dialog';
import { EditSalaryDialog } from '@/components/salary/edit-salary-dialog';
import { DeleteSalaryDialog } from '@/components/salary/delete-salary-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertCircle, Download, Calendar, FilePlus, Mail } from 'lucide-react';

interface SalaryRecord {
  id: number;
  ma_nhan_vien: string;
  ho_va_ten: string;
  phong_ban: string;
  chuc_vu: string;
  loai_nhan_vien: string;
  thang: number;
  nam: number;
  luong_co_ban: number;
  so_chuyen_di: number;
  tong_doanh_thu: number;
  luong_theo_chuyen: number;
  phu_cap: number;
  thuong: number;
  tong_thu_nhap: number;
  tong_khau_tru: number;
  thuc_lanh: number;
  trang_thai: string;
  ngay_thanh_toan: string;
}

interface LuongChuyenRecord {
  id: string;
  ma_chuyen: string;
  ngay_tao: string;
  nam: number;
  thang: number;
  ten_khach_hang: string;
  loai_chuyen: string;
  ten_tuyen: string;
  ma_tuyen: string;
  luong_tai_xe: number;
  ten_tai_xe: string;
  don_vi_van_chuyen: string;
  ma_tai_xe: string;
  email_tai_xe: string;
}

interface MaintenanceRecord {
  id: string;
  ngay: string;
  loai_xe: string | null;
  bien_so_xe: string;
  loai_phu_tung: string | null;
  ma_phu_tung: string | null;
  ten_phu_tung: string | null;
  so_luong: number;
  don_gia: number;
  thanh_tien: number;
  km_sua_chua: number;
  so_tien: number;
  ca_nhan_thanh_toan: string | null;
  dia_chi_sua_chua: string | null;
  ma_nhan_vien: string | null;
  ten_nhan_vien: string | null;
}

interface LuongTongHopRecord {
  id: string;
  ma_nhan_vien: string;
  ten_nhan_vien: string;
  chuc_vu: string;
  email: string;
  thang: number;
  nam: number;
  
  // Thu nhập (Income items)
  luong_bat_dau: number;
  tong_chi_phi_sua_chua: number;
  hoan_coc: number;
  chi_phi_do_dau_ngoai: number;
  chi_phi_phat_sinh_new: number;
  thuong: number;
  
  // Khấu trừ (Deduction items)
  truy_thu_dau: number;
  truy_thu_ontime: number;
  tru_coc: number;
  tam_ung: number;
  phat_che_tai: number;
  truy_thu_vetc: number;
  phat_nguoi: number;
  tien_lam_the: number;
  bhxh: number;
  khac: number;
  
  // Calculated fields
  tong_thu_nhap: number;
  tong_khau_tru: number;
  luong_thuc_lanh: number;
}

interface TienCocRecord {
  id: string;
  ma_tai_xe: string;
  ten_tai_xe: string;
  email: string;
  tien_thu_coc: number;
  thang: number;
  nam: number;
}

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

interface BHXHRecord {
  id: string;
  ma_tai_xe: string;
  ten_tai_xe: string;
  email: string;
  hang_muc: string;
  so_tien: number;
  thang: number;
  nam: number;
}

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

export default function SalaryPage() {
  // Tab states - 8 tabs
  const [activeTab, setActiveTab] = useState('bao-cao');

  // Data states cho 8 tabs
  const [baoCaoData, setBaoCaoData] = useState<BaoCaoData | null>(null);
  const [tongHopData, setTongHopData] = useState<LuongTongHopRecord[]>([]);
  const [luongChuyenData, setLuongChuyenData] = useState<LuongChuyenRecord[]>([]);
  const [suaChuaData, setSuaChuaData] = useState<MaintenanceRecord[]>([]);
  const [vetcData, setVetcData] = useState<any[]>([]);
  const [truyThuData, setTruyThuData] = useState<any[]>([]);
  const [tienCocData, setTienCocData] = useState<TienCocRecord[]>([]);
  const [tienThuongData, setTienThuongData] = useState<TienThuongRecord[]>([]);
  const [bhxhData, setBhxhData] = useState<BHXHRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [emailProgress, setEmailProgress] = useState({ current: 0, total: 0, logs: [] as any[] });
  const [showEmailProgress, setShowEmailProgress] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<LuongTongHopRecord | null>(null);

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear, activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeTab === 'bao-cao') {
        // Báo cáo - Lấy dữ liệu tổng hợp theo tháng
        console.log(`📊 Fetching bao-cao data for month=${selectedMonth}, year=${selectedYear}`);
        const response = await fetch(
          `/api/salary/bao-cao?month=${selectedMonth}&year=${selectedYear}`
        );
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ API Error:', errorData);
          throw new Error(errorData.error || 'Không thể tải dữ liệu báo cáo');
        }
        const data = await response.json();
        console.log('✅ Bao-cao data received:', data);
        setBaoCaoData(data.data || null);
      } else if (activeTab === 'tong-hop') {
        // Lương tổng hợp - Lấy dữ liệu từ bảng luong_tong_hop
        console.log(`📊 Fetching luong-tong-hop data for month=${selectedMonth}, year=${selectedYear}`);
        const response = await fetch(
          `/api/salary/luong-tong-hop?month=${selectedMonth}&year=${selectedYear}`
        );
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ API Error:', errorData);
          throw new Error(errorData.error || 'Không thể tải dữ liệu lương tổng hợp');
        }
        const data = await response.json();
        console.log('✅ Luong-tong-hop data received:', data);
        setTongHopData(data.data || []);
      } else if (activeTab === 'luong-chuyen') {
        // Lương chuyến - Lấy dữ liệu từ bảng luong_tai_xe
        console.log(`📊 Fetching luong-chuyen data for month=${selectedMonth}, year=${selectedYear}`);
        const response = await fetch(
          `/api/salary/luong-chuyen?month=${selectedMonth}&year=${selectedYear}`
        );
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ API Error:', errorData);
          throw new Error(errorData.error || 'Không thể tải dữ liệu lương chuyến');
        }
        const data = await response.json();
        console.log('✅ Luong-chuyen data received:', data);
        setLuongChuyenData(data.data || []);
      } else if (activeTab === 'sua-chua') {
        // Chi phí sửa chữa - Lấy từ API maintenance
        console.log(`📊 Fetching maintenance data for month=${selectedMonth}, year=${selectedYear}`);
        
        // Calculate date range for the month
        const fromDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
        const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
        const toDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        
        const response = await fetch(
          `/api/maintenance?from_date=${fromDate}&to_date=${toDate}&limit=1000`
        );
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ API Error:', errorData);
          throw new Error(errorData.error || 'Không thể tải dữ liệu chi phí sửa chữa');
        }
        const data = await response.json();
        console.log('✅ Maintenance data received:', data);
        setSuaChuaData(data.data || []);
      } else if (activeTab === 'vetc') {
        // Chi phí VETC - Empty state (chưa có data)
        setVetcData([]);
      } else if (activeTab === 'truy-thu') {
        // Truy thu - Empty state (chưa có data)
        setTruyThuData([]);
      } else if (activeTab === 'tien-coc') {
        // Tiền cọc - Lấy từ API tien-coc
        console.log(`📊 Fetching tien-coc data for month=${selectedMonth}, year=${selectedYear}`);
        const response = await fetch(
          `/api/salary/tien-coc?month=${selectedMonth}&year=${selectedYear}`
        );
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ API Error:', errorData);
          throw new Error(errorData.error || 'Không thể tải dữ liệu tiền cọc');
        }
        const data = await response.json();
        console.log('✅ Tien-coc data received:', data);
        setTienCocData(data.data || []);
      } else if (activeTab === 'tien-thuong') {
        // Tiền thưởng - Lấy từ API tien-thuong
        console.log(`📊 Fetching tien-thuong data for month=${selectedMonth}, year=${selectedYear}`);
        const response = await fetch(
          `/api/salary/tien-thuong?month=${selectedMonth}&year=${selectedYear}`
        );
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ API Error:', errorData);
          throw new Error(errorData.error || 'Không thể tải dữ liệu tiền thưởng');
        }
        const data = await response.json();
        console.log('✅ Tien-thuong data received:', data);
        setTienThuongData(data.data || []);
      } else if (activeTab === 'bhxh') {
        // BHXH - Lấy từ API bhxh
        console.log(`📊 Fetching bhxh data for month=${selectedMonth}, year=${selectedYear}`);
        const response = await fetch(
          `/api/salary/bhxh?month=${selectedMonth}&year=${selectedYear}`
        );
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ API Error:', errorData);
          throw new Error(errorData.error || 'Không thể tải dữ liệu BHXH');
        }
        const data = await response.json();
        console.log('✅ BHXH data received:', data);
        setBhxhData(data || []);
      }

    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);

      let endpoint = '';
      let filename = '';

      if (activeTab === 'bao-cao') {
        endpoint = `/api/salary/bao-cao/export?month=${selectedMonth}&year=${selectedYear}`;
        filename = `bao_cao_luong_${selectedMonth}_${selectedYear}.xlsx`;
      } else if (activeTab === 'tong-hop') {
        endpoint = `/api/salary/luong-tong-hop/export?month=${selectedMonth}&year=${selectedYear}`;
        filename = `luong_tong_hop_${selectedMonth}_${selectedYear}.xlsx`;
      } else if (activeTab === 'luong-chuyen') {
        endpoint = `/api/salary/luong-chuyen/export?month=${selectedMonth}&year=${selectedYear}`;
        filename = `luong_chuyen_${selectedMonth}_${selectedYear}.xlsx`;
      } else if (activeTab === 'tien-coc') {
        endpoint = `/api/salary/tien-coc/export?month=${selectedMonth}&year=${selectedYear}`;
        filename = `tien_coc_${selectedMonth}_${selectedYear}.xlsx`;
      } else if (activeTab === 'tien-thuong') {
        endpoint = `/api/salary/tien-thuong/export?month=${selectedMonth}&year=${selectedYear}`;
        filename = `tien_thuong_${selectedMonth}_${selectedYear}.xlsx`;
      } else if (activeTab === 'bhxh') {
        endpoint = `/api/salary/bhxh/export?month=${selectedMonth}&year=${selectedYear}`;
        filename = `bhxh_${selectedMonth}_${selectedYear}.xlsx`;
      } else {
        // Các tabs khác chưa có export
        alert('Chức năng export cho tab này chưa có dữ liệu');
        return;
      }

      const response = await fetch(endpoint);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Export error:', err);
      setError(err.message || 'Không thể xuất file Excel');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      setExportingPdf(true);

      let endpoint = '';
      let filename = '';

      if (activeTab === 'bao-cao') {
        endpoint = `/api/salary/bao-cao/export-pdf?month=${selectedMonth}&year=${selectedYear}`;
        filename = `bao_cao_luong_${selectedMonth}_${selectedYear}.pdf`;
      } else if (activeTab === 'tong-hop') {
        endpoint = `/api/salary/luong-tong-hop/export-pdf?month=${selectedMonth}&year=${selectedYear}`;
        filename = `luong_tong_hop_${selectedMonth}_${selectedYear}.pdf`;
      } else if (activeTab === 'luong-chuyen') {
        endpoint = `/api/salary/luong-chuyen/export-pdf?month=${selectedMonth}&year=${selectedYear}`;
        filename = `luong_chuyen_${selectedMonth}_${selectedYear}.pdf`;
      } else if (activeTab === 'tien-coc') {
        endpoint = `/api/salary/tien-coc/export-pdf?month=${selectedMonth}&year=${selectedYear}`;
        filename = `tien_coc_${selectedMonth}_${selectedYear}.pdf`;
      } else if (activeTab === 'tien-thuong') {
        endpoint = `/api/salary/tien-thuong/export-pdf?month=${selectedMonth}&year=${selectedYear}`;
        filename = `tien_thuong_${selectedMonth}_${selectedYear}.pdf`;
      } else {
        alert('Chức năng export PDF cho tab này chưa có dữ liệu');
        return;
      }

      const response = await fetch(endpoint);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export PDF failed');
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Export PDF error:', err);
      alert(err.message || 'Không thể xuất PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleRecalculate = async () => {
    if (!confirm(`Tính lại lương cho tất cả nhân viên trong tháng ${selectedMonth}/${selectedYear}?\n\n⚠️ Dữ liệu từ bảng Lương chuyến và Chi phí sửa chữa sẽ được tự động cập nhật.\nCác giá trị nhập tay (thưởng, khấu trừ khác...) sẽ được giữ nguyên.`)) {
      return;
    }

    try {
      setRecalculating(true);
      setError(null);

      const response = await fetch('/api/salary/calculate-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thang: selectedMonth,
          nam: selectedYear,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Tính lại thất bại');
      }

      const result = await response.json();
      
      alert(`✅ ${result.message}\n\n📊 Đã xử lý: ${result.data.total_employees} nhân viên\n💾 Lưu thành công: ${result.data.saved}\n${result.data.errors > 0 ? `❌ Lỗi: ${result.data.errors}` : ''}`);
      
      // Refresh data
      await fetchData();
    } catch (err: any) {
      console.error('Recalculate error:', err);
      setError(err.message || 'Không thể tính lại lương');
    } finally {
      setRecalculating(false);
    }
  };

  const handleSendPayslips = async () => {
    if (!confirm(`Bạn sắp gửi phiếu lương cho tất cả nhân viên trong tháng ${selectedMonth}/${selectedYear}.\n\nMỗi email sẽ bao gồm:\n- Phiếu lương tổng hợp (PDF)\n- Phiếu lương chi tiết (PDF)\n\nTiếp tục?`)) {
      return;
    }

    try {
      setSendingEmails(true);
      setShowEmailProgress(true);
      setEmailProgress({ current: 0, total: 0, logs: [] });
      setError(null);

      const response = await fetch(
        `/api/salary/send-payslips?month=${selectedMonth}&year=${selectedYear}`,
        { method: 'POST' }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Gửi email thất bại');
      }

      const result = await response.json();
      setEmailProgress({
        current: result.results.total,
        total: result.results.total,
        logs: result.results.logs
      });

      // Show summary
      alert(`✅ ${result.message}\n\n📊 Tổng: ${result.results.total}\n✅ Thành công: ${result.results.success}\n❌ Thất bại: ${result.results.failed}`);

    } catch (err: any) {
      console.error('Send emails error:', err);
      setError(err.message || 'Không thể gửi email');
    } finally {
      setSendingEmails(false);
    }
  };

  const handleResendPayslip = async (ma_nhan_vien: string, ten_nhan_vien: string) => {
    if (!confirm(`Gửi lại phiếu lương cho ${ten_nhan_vien}?`)) {
      return;
    }

    try {
      const response = await fetch(
        `/api/salary/resend-payslip?ma_nhan_vien=${ma_nhan_vien}&month=${selectedMonth}&year=${selectedYear}`,
        { method: 'POST' }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Gửi email thất bại');
      }

      const result = await response.json();
      alert(`✅ ${result.message}\nĐã gửi email đến: ${result.employee.email}`);

    } catch (err: any) {
      console.error('Resend email error:', err);
      alert(`❌ Lỗi: ${err.message}`);
    }
  };

  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-gray-100 p-3 mb-4">
        <AlertCircle className="h-6 w-6 text-gray-400" />
      </div>
      <h3 className="text-sm font-medium text-gray-900 mb-1">Chưa có dữ liệu</h3>
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );

  return (
    <DashboardLayout breadcrumbs={[{ label: 'Dashboard' }, { label: 'Data lương' }]}>
      <div className="space-y-4">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Filters Card - Compact */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-6">
              {/* Filter Title */}
              <div className="flex items-center gap-2 min-w-[80px]">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Bộ lọc</span>
              </div>

              {/* Month Filter */}
              <div className="w-[140px]">
                <Select
                  value={selectedMonth.toString()}
                  onValueChange={(v) => setSelectedMonth(parseInt(v))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <SelectItem key={m} value={m.toString()}>
                        Tháng {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Year Filter */}
              <div className="w-[120px]">
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(v) => setSelectedYear(parseInt(v))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => currentYear - i).map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Spacer */}
              <div className="flex-1"></div>

              {/* Create Salary Slip Button - Only show for tong-hop tab */}
              {activeTab === 'tong-hop' && (
                <>
                  <Button
                    onClick={handleRecalculate}
                    disabled={recalculating}
                    size="sm"
                    variant="secondary"
                    className="gap-2 font-medium"
                    title={`Tính lại lương tháng ${selectedMonth}/${selectedYear} cho tất cả nhân viên`}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {recalculating ? 'Đang tính...' : '🔄 Tính lại'}
                  </Button>
                  <Button
                    onClick={handleSendPayslips}
                    disabled={sendingEmails}
                    size="sm"
                    variant="default"
                    className="gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <Mail className="h-4 w-4" />
                    {sendingEmails ? 'Đang gửi...' : 'Gửi phiếu lương'}
                  </Button>
                  <Button
                    onClick={() => setCreateDialogOpen(true)}
                    size="sm"
                    variant="default"
                    className="gap-2"
                  >
                    <FilePlus className="h-4 w-4" />
                    Tạo phiếu lương
                  </Button>
                </>
              )}

              {/* Export Button */}
              <Button
                onClick={handleExport}
                disabled={exporting || !['bao-cao', 'tong-hop', 'luong-chuyen', 'tien-coc', 'tien-thuong', 'bhxh'].includes(activeTab)}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                {exporting ? 'Đang xuất...' : 'Xuất Excel'}
              </Button>

              {/* PDF Export Button */}
              <Button
                onClick={handleExportPdf}
                disabled={exportingPdf || !['bao-cao', 'tong-hop', 'luong-chuyen', 'tien-coc', 'tien-thuong'].includes(activeTab)}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                {exportingPdf ? 'Đang xuất...' : 'Xuất PDF'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs Section - 9 tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-9">
            <TabsTrigger value="bao-cao">Báo cáo</TabsTrigger>
            <TabsTrigger value="tong-hop">Lương tổng hợp</TabsTrigger>
            <TabsTrigger value="luong-chuyen">Lương chuyến</TabsTrigger>
            <TabsTrigger value="sua-chua">Chi phí sửa chữa</TabsTrigger>
            <TabsTrigger value="vetc">Chi phí VETC</TabsTrigger>
            <TabsTrigger value="truy-thu">Truy thu</TabsTrigger>
            <TabsTrigger value="tien-coc">Tiền cọc</TabsTrigger>
            <TabsTrigger value="tien-thuong">Tiền thưởng</TabsTrigger>
            <TabsTrigger value="bhxh">BHXH</TabsTrigger>
          </TabsList>

          {/* Tab 1: Báo cáo */}
          <TabsContent value="bao-cao">
            <Card>
              <CardContent className="pt-6">
                <BaoCaoTable
                  data={baoCaoData}
                  loading={loading}
                  month={selectedMonth}
                  year={selectedYear}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Lương tổng hợp */}
          <TabsContent value="tong-hop">
            <Card>
              <CardContent className="pt-6">
                <LuongTongHopTable
                  data={tongHopData}
                  loading={loading}
                  onEdit={(record) => {
                    setSelectedRecord(record);
                    setEditDialogOpen(true);
                  }}
                  onDelete={(record) => {
                    setSelectedRecord(record);
                    setDeleteDialogOpen(true);
                  }}
                  onResendEmail={handleResendPayslip}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Lương chuyến */}
          <TabsContent value="luong-chuyen">
            <Card>
              <CardContent className="pt-6">
                <LuongChuyenTable
                  data={luongChuyenData}
                  loading={loading}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Chi phí sửa chữa */}
          <TabsContent value="sua-chua">
            <Card>
              <CardContent className="pt-6">
                <MaintenanceTable
                  data={suaChuaData}
                  loading={loading}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Chi phí VETC */}
          <TabsContent value="vetc">
            <Card>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
                ) : vetcData.length > 0 ? (
                  <div>Table chi phí VETC (coming soon)</div>
                ) : (
                  <EmptyState message="Dữ liệu chi phí VETC sẽ được cập nhật sau" />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 5: Truy thu */}
          <TabsContent value="truy-thu">
            <Card>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
                ) : truyThuData.length > 0 ? (
                  <div>Table truy thu (coming soon)</div>
                ) : (
                  <EmptyState message="Dữ liệu truy thu sẽ được cập nhật sau" />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 6: Tiền cọc */}
          <TabsContent value="tien-coc">
            <Card>
              <CardContent className="pt-6">
                <TienCocTable
                  data={tienCocData}
                  loading={loading}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 7: Tiền thưởng */}
          <TabsContent value="tien-thuong">
            <Card>
              <CardContent className="pt-6">
                <TienThuongTable
                  data={tienThuongData}
                  loading={loading}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 8: BHXH */}
          <TabsContent value="bhxh">
            <Card>
              <CardContent className="pt-6">
                <BHXHTable
                  data={bhxhData}
                  loading={loading}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Salary Slip Dialog */}
      <CreateSalarySlipDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => fetchData()}
      />

      {/* Edit Salary Dialog */}
      <EditSalaryDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        record={selectedRecord}
        onSuccess={() => fetchData()}
      />

      {/* Delete Salary Dialog */}
      <DeleteSalaryDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        record={selectedRecord}
        onSuccess={() => fetchData()}
      />
    </DashboardLayout>
  );
}
