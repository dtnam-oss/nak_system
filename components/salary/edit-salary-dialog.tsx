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
  phong_ban: string;
  chuc_vu: string;
  thang: number;
  nam: number;
  luong_chuyen: number;
  cp_sua_chua: number;
  cp_do_dau: number;
  cp_phat_sinh: number;
  cp_ccdc: number;
  ho_tro: number;
  truy_thu: number;
  tru_coc: number;
  hoan_coc: number;
  tam_ung: number;
  phat_nguoi: number;
  bhxh: number;
  khac: number;
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

  const tongThuNhap = (formData.luong_chuyen || 0) + (formData.ho_tro || 0) + (formData.hoan_coc || 0);
  const tongKhauTru = (formData.cp_sua_chua || 0) + (formData.cp_do_dau || 0) +
                      (formData.cp_phat_sinh || 0) + (formData.cp_ccdc || 0) +
                      (formData.truy_thu || 0) + (formData.tru_coc || 0) +
                      (formData.tam_ung || 0) + (formData.phat_nguoi || 0) +
                      (formData.bhxh || 0) + (formData.khac || 0);
  const thucLanh = tongThuNhap - tongKhauTru;

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
                <Label>Lương chuyến</Label>
                <Input
                  type="number"
                  value={formData.luong_chuyen || 0}
                  onChange={(e) => handleChange('luong_chuyen', e.target.value)}
                />
              </div>
              <div>
                <Label>Hỗ trợ</Label>
                <Input
                  type="number"
                  value={formData.ho_tro || 0}
                  onChange={(e) => handleChange('ho_tro', e.target.value)}
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
            </div>
          </TabsContent>

          <TabsContent value="khau-tru" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>CP Sửa chữa</Label>
                <Input
                  type="number"
                  value={formData.cp_sua_chua || 0}
                  onChange={(e) => handleChange('cp_sua_chua', e.target.value)}
                />
              </div>
              <div>
                <Label>CP Đổ dầu</Label>
                <Input
                  type="number"
                  value={formData.cp_do_dau || 0}
                  onChange={(e) => handleChange('cp_do_dau', e.target.value)}
                />
              </div>
              <div>
                <Label>CP Phát sinh</Label>
                <Input
                  type="number"
                  value={formData.cp_phat_sinh || 0}
                  onChange={(e) => handleChange('cp_phat_sinh', e.target.value)}
                />
              </div>
              <div>
                <Label>CP CCDC</Label>
                <Input
                  type="number"
                  value={formData.cp_ccdc || 0}
                  onChange={(e) => handleChange('cp_ccdc', e.target.value)}
                />
              </div>
              <div>
                <Label>Truy thu</Label>
                <Input
                  type="number"
                  value={formData.truy_thu || 0}
                  onChange={(e) => handleChange('truy_thu', e.target.value)}
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
                <Label>Tạm ứng</Label>
                <Input
                  type="number"
                  value={formData.tam_ung || 0}
                  onChange={(e) => handleChange('tam_ung', e.target.value)}
                />
              </div>
              <div>
                <Label>Phạt người</Label>
                <Input
                  type="number"
                  value={formData.phat_nguoi || 0}
                  onChange={(e) => handleChange('phat_nguoi', e.target.value)}
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
