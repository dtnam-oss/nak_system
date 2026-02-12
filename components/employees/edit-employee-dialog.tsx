'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Employee {
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
}

interface EditEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  onSuccess: () => void;
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

const CHUC_VU_OPTIONS = [
  'Tài xế',
  'Nhân viên',
  'Trưởng phòng',
  'Phó phòng',
  'Giám đốc',
  'Phó giám đốc',
  'Kế toán trưởng',
  'Thủ quỹ',
  'Khác',
];

const TINH_TRANG_OPTIONS = [
  'Chính thức',
  'Thử việc',
  'Hợp đồng dịch vụ',
  'Part-time',
  'Thực tập',
];

export function EditEmployeeDialog({
  open,
  onOpenChange,
  employee,
  onSuccess,
}: EditEmployeeDialogProps) {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<any>({
    ma_nhan_vien: '',
    ho_va_ten: '',
    phong_ban: '',
    chuc_vu: '',
    so_dien_thoai: '',
    email: '',
    tinh_trang_cong_tac: '',
    ngay_vao_lam: '',
    ngay_ky_hdld: '',
    ngay_tham_gia_cong_doan: '',
    ngay_tham_gia_bhxh: '',
    luong_thoa_thuan: 0,
    tien_coc: 0,
    giam_tru_gia_canh: 0,
    phan_quyen: 'user',
    xem: true,
    them: false,
    sua: false,
    xoa: false,
  });

  // Pre-fill form when employee changes
  useEffect(() => {
    if (employee) {
      setFormData({
        ma_nhan_vien: employee.ma_nhan_vien || '',
        ho_va_ten: employee.ho_va_ten || '',
        phong_ban: employee.phong_ban || '',
        chuc_vu: employee.chuc_vu || '',
        so_dien_thoai: employee.so_dien_thoai || '',
        email: employee.email || '',
        tinh_trang_cong_tac: employee.tinh_trang_cong_tac || '',
        ngay_vao_lam: employee.ngay_vao_lam
          ? new Date(employee.ngay_vao_lam).toISOString().split('T')[0]
          : '',
        ngay_ky_hdld: employee.ngay_ky_hdld
          ? new Date(employee.ngay_ky_hdld).toISOString().split('T')[0]
          : '',
        ngay_tham_gia_cong_doan: employee.ngay_tham_gia_cong_doan
          ? new Date(employee.ngay_tham_gia_cong_doan).toISOString().split('T')[0]
          : '',
        ngay_tham_gia_bhxh: employee.ngay_tham_gia_bhxh
          ? new Date(employee.ngay_tham_gia_bhxh).toISOString().split('T')[0]
          : '',
        luong_thoa_thuan: employee.luong_thoa_thuan || 0,
        tien_coc: employee.tien_coc || 0,
        giam_tru_gia_canh: employee.giam_tru_gia_canh || 0,
        phan_quyen: employee.phan_quyen || 'user',
        xem: employee.xem !== undefined ? employee.xem : true,
        them: employee.them !== undefined ? employee.them : false,
        sua: employee.sua !== undefined ? employee.sua : false,
        xoa: employee.xoa !== undefined ? employee.xoa : false,
      });
    }
  }, [employee]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleUpdate = async () => {
    try {
      setUpdating(true);
      setError(null);
      setSuccess(null);

      // Validation
      if (!formData.ho_va_ten) {
        throw new Error('Họ tên là bắt buộc');
      }

      const response = await fetch('/api/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Cập nhật nhân viên thất bại');
      }

      setSuccess('✅ Cập nhật thành công!');

      // Auto-close after 2 seconds
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
        setSuccess(null);
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sửa thông tin nhân viên</DialogTitle>
          <DialogDescription>
            Cập nhật thông tin nhân viên. Các trường có dấu * là bắt buộc.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Cơ bản</TabsTrigger>
            <TabsTrigger value="work">Công việc</TabsTrigger>
            <TabsTrigger value="finance">Tài chính</TabsTrigger>
            <TabsTrigger value="permissions">Phân quyền</TabsTrigger>
          </TabsList>

          {/* Tab 1: Basic Info */}
          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Mã nhân viên (không thể sửa)</Label>
                <Input
                  value={formData.ma_nhan_vien}
                  disabled
                  className="bg-gray-100"
                />
              </div>
              <div>
                <Label>
                  Họ và tên <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.ho_va_ten}
                  onChange={(e) => handleChange('ho_va_ten', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Phòng ban</Label>
                <Select
                  value={formData.phong_ban}
                  onValueChange={(value) => handleChange('phong_ban', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn phòng ban" />
                  </SelectTrigger>
                  <SelectContent>
                    {PHONG_BAN_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Chức vụ</Label>
                <Select
                  value={formData.chuc_vu}
                  onValueChange={(value) => handleChange('chuc_vu', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn chức vụ" />
                  </SelectTrigger>
                  <SelectContent>
                    {CHUC_VU_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Số điện thoại</Label>
                <Input
                  type="tel"
                  value={formData.so_dien_thoai}
                  onChange={(e) => handleChange('so_dien_thoai', e.target.value)}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                />
              </div>
            </div>
          </TabsContent>

          {/* Tab 2: Work Info */}
          <TabsContent value="work" className="space-y-4">
            <div>
              <Label>Tình trạng công tác</Label>
              <Select
                value={formData.tinh_trang_cong_tac}
                onValueChange={(value) => handleChange('tinh_trang_cong_tac', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn tình trạng" />
                </SelectTrigger>
                <SelectContent>
                  {TINH_TRANG_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ngày vào làm</Label>
                <Input
                  type="date"
                  value={formData.ngay_vao_lam}
                  onChange={(e) => handleChange('ngay_vao_lam', e.target.value)}
                />
              </div>
              <div>
                <Label>Ngày ký HĐLĐ</Label>
                <Input
                  type="date"
                  value={formData.ngay_ky_hdld}
                  onChange={(e) => handleChange('ngay_ky_hdld', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ngày tham gia công đoàn</Label>
                <Input
                  type="date"
                  value={formData.ngay_tham_gia_cong_doan}
                  onChange={(e) =>
                    handleChange('ngay_tham_gia_cong_doan', e.target.value)
                  }
                />
              </div>
              <div>
                <Label>Ngày tham gia BHXH</Label>
                <Input
                  type="date"
                  value={formData.ngay_tham_gia_bhxh}
                  onChange={(e) =>
                    handleChange('ngay_tham_gia_bhxh', e.target.value)
                  }
                />
              </div>
            </div>
          </TabsContent>

          {/* Tab 3: Finance */}
          <TabsContent value="finance" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Lương thỏa thuận (VNĐ)</Label>
                <Input
                  type="number"
                  value={formData.luong_thoa_thuan}
                  onChange={(e) =>
                    handleChange('luong_thoa_thuan', parseFloat(e.target.value) || 0)
                  }
                />
              </div>
              <div>
                <Label>Tiền cọc (VNĐ)</Label>
                <Input
                  type="number"
                  value={formData.tien_coc}
                  onChange={(e) =>
                    handleChange('tien_coc', parseFloat(e.target.value) || 0)
                  }
                />
              </div>
            </div>

            <div>
              <Label>Giảm trừ gia cảnh (VNĐ)</Label>
              <Input
                type="number"
                value={formData.giam_tru_gia_canh}
                onChange={(e) =>
                  handleChange('giam_tru_gia_canh', parseFloat(e.target.value) || 0)
                }
              />
            </div>
          </TabsContent>

          {/* Tab 4: Permissions */}
          <TabsContent value="permissions" className="space-y-4">
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                ⚠️ Chỉ Admin nên thay đổi phân quyền. Thay đổi này có thể ảnh hưởng đến khả năng truy cập của nhân viên.
              </AlertDescription>
            </Alert>

            <div>
              <Label>Phân quyền</Label>
              <Select
                value={formData.phan_quyen}
                onValueChange={(value) => handleChange('phan_quyen', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User (Người dùng)</SelectItem>
                  <SelectItem value="manager">Manager (Quản lý)</SelectItem>
                  <SelectItem value="admin">Admin (Quản trị viên)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Quyền truy cập</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-xem"
                  checked={formData.xem}
                  onCheckedChange={(checked) => handleChange('xem', checked)}
                />
                <label
                  htmlFor="edit-xem"
                  className="text-sm font-medium leading-none"
                >
                  Quyền xem
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-them"
                  checked={formData.them}
                  onCheckedChange={(checked) => handleChange('them', checked)}
                />
                <label
                  htmlFor="edit-them"
                  className="text-sm font-medium leading-none"
                >
                  Quyền thêm
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-sua"
                  checked={formData.sua}
                  onCheckedChange={(checked) => handleChange('sua', checked)}
                />
                <label
                  htmlFor="edit-sua"
                  className="text-sm font-medium leading-none"
                >
                  Quyền sửa
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-xoa"
                  checked={formData.xoa}
                  onCheckedChange={(checked) => handleChange('xoa', checked)}
                />
                <label
                  htmlFor="edit-xoa"
                  className="text-sm font-medium leading-none"
                >
                  Quyền xóa
                </label>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {success && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updating}
          >
            Hủy
          </Button>
          <Button onClick={handleUpdate} disabled={updating}>
            {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {updating ? 'Đang cập nhật...' : 'Cập nhật'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
