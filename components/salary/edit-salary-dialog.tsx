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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface LuongTongHopRecord {
  id: string;
  ma_nhan_vien: string;
  ten_nhan_vien: string;
  email: string;
  chuc_vu: string;
  thang: number;
  nam: number;
  
  // Thu nhập (Income)
  luong_bat_dau: number;
  tong_chi_phi_sua_chua: number;
  hoan_coc: number;
  chi_phi_do_dau_ngoai: number;
  chi_phi_phat_sinh_new: number;
  thuong: number;
  
  // Khấu trừ (Deductions)
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

interface EditSalaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: LuongTongHopRecord | null;
  onSuccess: () => void;
}

export function EditSalaryDialog({
  open,
  onOpenChange,
  record,
  onSuccess,
}: EditSalaryDialogProps) {
  const [formData, setFormData] = useState<LuongTongHopRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (record) {
      setFormData({ ...record });
    }
  }, [record]);

  const handleChange = (field: keyof LuongTongHopRecord, value: string) => {
    if (!formData) return;
    setFormData({
      ...formData,
      [field]: parseFloat(value) || 0,
    });
  };

  const handleSave = async () => {
    if (!formData) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/salary/luong-tong-hop/${formData.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Cập nhật thất bại');
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!formData) return null;

  // Display calculated fields from database (read-only, server calculates on save)
  const tongThuNhap = formData.tong_thu_nhap || 0;
  const tongKhauTru = formData.tong_khau_tru || 0;
  const thucLanh = formData.luong_thuc_lanh || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa phiếu lương</DialogTitle>
          <DialogDescription>
            {formData.ma_nhan_vien} - {formData.ten_nhan_vien} - Tháng {formData.thang}/{formData.nam}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="thu-nhap" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="thu-nhap">📈 Thu nhập</TabsTrigger>
            <TabsTrigger value="khau-tru">📉 Khấu trừ</TabsTrigger>
            <TabsTrigger value="ket-qua">💰 Kết quả</TabsTrigger>
          </TabsList>

          <TabsContent value="thu-nhap" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Lương chuyển</Label>
                <Input
                  type="number"
                  value={formData.luong_bat_dau || 0}
                  onChange={(e) => handleChange('luong_bat_dau', e.target.value)}
                />
              </div>
              <div>
                <Label>Hoàn phí sửa chữa</Label>
                <Input
                  type="number"
                  value={formData.tong_chi_phi_sua_chua || 0}
                  onChange={(e) => handleChange('tong_chi_phi_sua_chua', e.target.value)}
                />
              </div>
              <div>
                <Label>Hoàn cọc</Label>
                <Input
                  type="number"
                  value={formData.hoan_coc || 0}
                  onChange={(e) => handleChange('hoan_coc', e.target.value)}
                />
              </div>
              <div>
                <Label>Hoàn phí đổ dầu ngoài</Label>
                <Input
                  type="number"
                  value={formData.chi_phi_do_dau_ngoai || 0}
                  onChange={(e) => handleChange('chi_phi_do_dau_ngoai', e.target.value)}
                />
              </div>
              <div>
                <Label>Hoàn chi phí phát sinh</Label>
                <Input
                  type="number"
                  value={formData.chi_phi_phat_sinh_new || 0}
                  onChange={(e) => handleChange('chi_phi_phat_sinh_new', e.target.value)}
                />
              </div>
              <div>
                <Label>Thưởng</Label>
                <Input
                  type="number"
                  value={formData.thuong || 0}
                  onChange={(e) => handleChange('thuong', e.target.value)}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="khau-tru" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Truy thu đầu</Label>
                <Input
                  type="number"
                  value={formData.truy_thu_dau || 0}
                  onChange={(e) => handleChange('truy_thu_dau', e.target.value)}
                />
              </div>
              <div>
                <Label>Truy thu ontime</Label>
                <Input
                  type="number"
                  value={formData.truy_thu_ontime || 0}
                  onChange={(e) => handleChange('truy_thu_ontime', e.target.value)}
                />
              </div>
              <div>
                <Label>Trừ cọc</Label>
                <Input
                  type="number"
                  value={formData.tru_coc || 0}
                  onChange={(e) => handleChange('tru_coc', e.target.value)}
                />
              </div>
              <div>
                <Label>Phí tạm ứng</Label>
                <Input
                  type="number"
                  value={formData.tam_ung || 0}
                  onChange={(e) => handleChange('tam_ung', e.target.value)}
                />
              </div>
              <div>
                <Label>Phạt chế tài</Label>
                <Input
                  type="number"
                  value={formData.phat_che_tai || 0}
                  onChange={(e) => handleChange('phat_che_tai', e.target.value)}
                />
              </div>
              <div>
                <Label>Truy thu VETC</Label>
                <Input
                  type="number"
                  value={formData.truy_thu_vetc || 0}
                  onChange={(e) => handleChange('truy_thu_vetc', e.target.value)}
                />
              </div>
              <div>
                <Label>Phạt nguội</Label>
                <Input
                  type="number"
                  value={formData.phat_nguoi || 0}
                  onChange={(e) => handleChange('phat_nguoi', e.target.value)}
                />
              </div>
              <div>
                <Label>Tiền làm thẻ</Label>
                <Input
                  type="number"
                  value={formData.tien_lam_the || 0}
                  onChange={(e) => handleChange('tien_lam_the', e.target.value)}
                />
              </div>
              <div>
                <Label>BHXH</Label>
                <Input
                  type="number"
                  value={formData.bhxh || 0}
                  onChange={(e) => handleChange('bhxh', e.target.value)}
                />
              </div>
              <div>
                <Label>Khác</Label>
                <Input
                  type="number"
                  value={formData.khac || 0}
                  onChange={(e) => handleChange('khac', e.target.value)}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ket-qua">
            <div className="space-y-4 bg-gray-50 p-6 rounded-lg">
              <div className="flex justify-between items-center border-b pb-3">
                <span className="text-green-700 font-semibold">Tổng thu nhập:</span>
                <span className="text-lg font-bold text-green-700">
                  {tongThuNhap.toLocaleString('vi-VN')} ₫
                </span>
              </div>
              <div className="flex justify-between items-center border-b pb-3">
                <span className="text-red-700 font-semibold">Tổng khấu trừ:</span>
                <span className="text-lg font-bold text-red-700">
                  -{tongKhauTru.toLocaleString('vi-VN')} ₫
                </span>
              </div>
              <div className="flex justify-between items-center bg-blue-100 p-4 rounded">
                <span className="text-blue-900 font-bold text-lg">Thực lãnh:</span>
                <span className="text-2xl font-bold text-blue-900">
                  {thucLanh.toLocaleString('vi-VN')} ₫
                </span>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
