'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { EmployeeTable } from '@/components/employees/employee-table';
import { CreateEmployeeDialog } from '@/components/employees/create-employee-dialog';
import { EditEmployeeDialog } from '@/components/employees/edit-employee-dialog';
import { DeleteEmployeeDialog } from '@/components/employees/delete-employee-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserPlus, Download, Search, AlertCircle } from 'lucide-react';

interface Employee {
  id?: number;
  ma_nhan_vien: string;
  ho_va_ten: string;
  phong_ban: string | null;
  chuc_vu: string | null;
  so_dien_thoai: string | null;
  email: string | null;
  tinh_trang_cong_tac: string | null;
  ngay_vao_lam: string | null;
  ngay_ky_hdld: string | null;
  ngay_tham_gia_cong_doan: string | null;
  ngay_tham_gia_bhxh: string | null;
  luong_thoa_thuan: number | null;
  tien_coc: number | null;
  giam_tru_gia_canh: number | null;
  phan_quyen: string | null;
  xem: boolean;
  them: boolean;
  sua: boolean;
  xoa: boolean;
  is_active?: boolean;
}

const PHONG_BAN_OPTIONS = [
  'Vận hành',
  'Kế toán',
  'IT',
  'Nhân sự',
  'Kinh doanh',
  'Hành chính',
  'Kho vận',
  'Khác',
];

export default function EmployeesPage() {
  // Data state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPhongBan, setFilterPhongBan] = useState('all');
  const [filterPhanQuyen, setFilterPhanQuyen] = useState('all');
  const [filterActive, setFilterActive] = useState('active');

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [exporting, setExporting] = useState(false);

  // Fetch employees data
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filterActive !== 'all') params.append('active', filterActive);
      if (filterPhongBan !== 'all') params.append('phong_ban', filterPhongBan);
      if (filterPhanQuyen !== 'all') params.append('phan_quyen', filterPhanQuyen);

      const response = await fetch(`/api/employees?${params}`);

      if (!response.ok) {
        throw new Error('Failed to load employees');
      }

      const data = await response.json();
      setEmployees(data.employees || []);
    } catch (err: any) {
      console.error('Error fetching employees:', err);
      setError(err.message || 'Đã xảy ra lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [filterPhongBan, filterPhanQuyen, filterActive]);

  // Client-side search filter
  const filteredEmployees = employees.filter(
    (emp) =>
      searchQuery === '' ||
      emp.ho_va_ten.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.ma_nhan_vien.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Export to Excel
  const handleExport = async () => {
    try {
      setExporting(true);

      const params = new URLSearchParams();
      if (filterPhongBan !== 'all') params.append('phong_ban', filterPhongBan);
      if (filterPhanQuyen !== 'all') params.append('phan_quyen', filterPhanQuyen);
      if (filterActive !== 'all') params.append('active', filterActive);

      const response = await fetch(`/api/employees/export?${params}`);

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `employees_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || 'Xuất Excel thất bại');
    } finally {
      setExporting(false);
    }
  };

  // Handle edit
  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setEditDialogOpen(true);
  };

  // Handle delete
  const handleDelete = (employee: Employee) => {
    setSelectedEmployee(employee);
    setDeleteDialogOpen(true);
  };

  return (
    <DashboardLayout breadcrumbs={[{ label: 'Dashboard' }, { label: 'Nhân viên' }]}>
      <div className="space-y-6">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Filter Card */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Search Input */}
              <div className="flex items-center gap-2 min-w-[200px] flex-1 max-w-[400px]">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo tên hoặc mã NV..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9"
                />
              </div>

              {/* Phong ban Filter */}
              <div className="w-[140px]">
                <Select value={filterPhongBan} onValueChange={setFilterPhongBan}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Phòng ban" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả phòng ban</SelectItem>
                    {PHONG_BAN_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Phan quyen Filter */}
              <div className="w-[120px]">
                <Select value={filterPhanQuyen} onValueChange={setFilterPhanQuyen}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Quyền" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả quyền</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Active status Filter */}
              <div className="w-[140px]">
                <Select value={filterActive} onValueChange={setFilterActive}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Đang làm việc</SelectItem>
                    <SelectItem value="false">Đã nghỉ việc</SelectItem>
                    <SelectItem value="all">Tất cả</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Create Button */}
              <Button
                onClick={() => setCreateDialogOpen(true)}
                size="sm"
                className="gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Thêm nhân viên
              </Button>

              {/* Export Button */}
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={exporting}
                size="sm"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                {exporting ? 'Đang xuất...' : 'Xuất Excel'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Employee Table */}
        <Card>
          <CardContent className="pt-6">
            <EmployeeTable
              data={filteredEmployees}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </CardContent>
        </Card>

        {/* Dialogs */}
        <CreateEmployeeDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSuccess={fetchEmployees}
        />

        <EditEmployeeDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          employee={selectedEmployee}
          onSuccess={fetchEmployees}
        />

        <DeleteEmployeeDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          employee={selectedEmployee}
          onSuccess={fetchEmployees}
        />
      </div>
    </DashboardLayout>
  );
}
