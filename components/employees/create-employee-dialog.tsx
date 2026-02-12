'use client';

import { useState } from 'react';
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

interface CreateEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function CreateEmployeeDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateEmployeeDialogProps) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
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

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCreate = async () => {
    try {
      setCreating(true);
      setError(null);
      setSuccess(null);

      // Validation
      if (!formData.ma_nhan_vien || !formData.ho_va_ten) {
        throw new Error('Mã nhân viên và họ tên là bắt buộc');
      }

      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Tạo nhân viên thất bại');
      }

      setSuccess('✅ Tạo nhân viên thành công!');

      // Auto-close after 2 seconds
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
        // Reset form
        setFormData({
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
        setSuccess(null);
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Thêm nhân viên mới</DialogTitle>
          <DialogDescription>
            Điền thông tin nhân viên mới. Các trường có dấu * là bắt buộc.
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
                <Label>
                  Mã nhân viên <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="NAK001, NAK002..."
                  value={formData.ma_nhan_vien}
                  onChange={(e) => handleChange('ma_nhan_vien', e.target.value)}
                />
              </div>
              <div>
                <Label>
                  Họ và tên <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Nguyễn Văn A"
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
                  placeholder="0912345678"
                  value={formData.so_dien_thoai}
                  onChange={(e) => handleChange('so_dien_thoai', e.target.value)}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="email@example.com"
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
                  id="xem"
                  checked={formData.xem}
                  onCheckedChange={(checked) => handleChange('xem', checked)}
                />
                <label
                  htmlFor="xem"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Quyền xem
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="them"
                  checked={formData.them}
                  onCheckedChange={(checked) => handleChange('them', checked)}
                />
                <label
                  htmlFor="them"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Quyền thêm
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sua"
                  checked={formData.sua}
                  onCheckedChange={(checked) => handleChange('sua', checked)}
                />
                <label
                  htmlFor="sua"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Quyền sửa
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="xoa"
                  checked={formData.xoa}
                  onCheckedChange={(checked) => handleChange('xoa', checked)}
                />
                <label
                  htmlFor="xoa"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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
            disabled={creating}
          >
            Hủy
          </Button>
          <Button onClick={handleCreate} disabled={creating}>
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {creating ? 'Đang tạo...' : 'Tạo nhân viên'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
