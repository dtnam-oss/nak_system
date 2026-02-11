/**
 * Payslip Data Preparer
 * Chuẩn bị data từ database để gửi tới Google Apps Script
 */

import { query } from '@/lib/db';

export interface PayslipData {
  // Email info
  recipientEmail: string;
  recipientName: string;
  month: number;
  year: number;
  
  // Basic info
  ma_nhan_vien: string;
  ten_nhan_vien: string;
  thang: number;
  nam: number;
  
  // Thu nhập
  luong_bat_dau: number;
  hoan_coc: number;
  thuong: number;
  tong_thu_nhap: number;
  
  // Khấu trừ
  truy_thu_dau: number;
  truy_thu_ontime: number;
  tru_coc: number;
  phat_che_tai: number;
  truy_thu_vetc: number;
  phat_nguoi: number;
  tien_lam_the: number;
  bhxh: number;
  khac: number;
  tong_khau_tru: number;
  luong_thuc_lanh: number;
  
  // Chi tiết lương chuyến
  tong_luong_chuyen: number;
  luongChuyen: Array<{
    ma_chuyen: string;
    ngay_bat_dau: string;
    ten_khach_hang: string;
    tuyen_duong: string;
    luong_chuyen: number;
  }>;
}

/**
 * Lấy và chuẩn bị dữ liệu phiếu lương cho 1 nhân viên
 */
export async function preparePayslipData(
  ma_nhan_vien: string,
  month: number,
  year: number,
  testEmail?: string
): Promise<PayslipData> {
  
  // 1. Query dữ liệu tổng hợp
  const tongHopResult = await query(
    `SELECT 
      ma_nhan_vien,
      ten_nhan_vien,
      email,
      thang,
      nam,
      luong_bat_dau,
      hoan_coc,
      thuong,
      truy_thu_dau,
      truy_thu_ontime,
      tru_coc,
      phat_che_tai,
      truy_thu_vetc,
      phat_nguoi,
      tien_lam_the,
      bhxh,
      khac,
      tong_thu_nhap,
      tong_khau_tru,
      luong_thuc_lanh
    FROM luong_tong_hop
    WHERE ma_nhan_vien = $1 AND thang = $2 AND nam = $3`,
    [ma_nhan_vien, month, year]
  );

  if (tongHopResult.rows.length === 0) {
    throw new Error(`Không tìm thấy dữ liệu lương cho nhân viên ${ma_nhan_vien} tháng ${month}/${year}`);
  }

  const tongHop = tongHopResult.rows[0];

  // 2. Query chi tiết lương chuyến từ bảng luong_tai_xe
  const luongChuyenResult = await query(
    `SELECT 
      lt.ma_chuyen,
      lt.ngay_bat_dau,
      lt.ten_khach_hang,
      lt.tuyen_duong,
      lt.luong_chuyen
    FROM luong_tai_xe lt
    WHERE lt.ma_tai_xe = $1 
      AND EXTRACT(MONTH FROM lt.ngay_bat_dau) = $2 
      AND EXTRACT(YEAR FROM lt.ngay_bat_dau) = $3
    ORDER BY lt.ngay_bat_dau ASC`,
    [ma_nhan_vien, month, year]
  );

  // 3. Format ngày tháng cho chi tiết
  const luongChuyen = luongChuyenResult.rows.map(row => ({
    ma_chuyen: row.ma_chuyen,
    ngay_bat_dau: formatDate(row.ngay_bat_dau),
    ten_khach_hang: row.ten_khach_hang || '',
    tuyen_duong: row.tuyen_duong || '',
    luong_chuyen: parseFloat(row.luong_chuyen || 0)
  }));

  // 4. Tính tổng lương chuyến
  const tong_luong_chuyen = luongChuyen.reduce((sum, item) => sum + item.luong_chuyen, 0);

  // 5. Prepare final data structure
  const payslipData: PayslipData = {
    // Email info
    recipientEmail: testEmail || tongHop.email,
    recipientName: tongHop.ten_nhan_vien,
    month: month,
    year: year,
    
    // Basic info
    ma_nhan_vien: tongHop.ma_nhan_vien,
    ten_nhan_vien: tongHop.ten_nhan_vien,
    thang: month,
    nam: year,
    
    // Thu nhập
    luong_bat_dau: parseFloat(tongHop.luong_bat_dau || 0),
    hoan_coc: parseFloat(tongHop.hoan_coc || 0),
    thuong: parseFloat(tongHop.thuong || 0),
    tong_thu_nhap: parseFloat(tongHop.tong_thu_nhap || 0),
    
    // Khấu trừ
    truy_thu_dau: parseFloat(tongHop.truy_thu_dau || 0),
    truy_thu_ontime: parseFloat(tongHop.truy_thu_ontime || 0),
    tru_coc: parseFloat(tongHop.tru_coc || 0),
    phat_che_tai: parseFloat(tongHop.phat_che_tai || 0),
    truy_thu_vetc: parseFloat(tongHop.truy_thu_vetc || 0),
    phat_nguoi: parseFloat(tongHop.phat_nguoi || 0),
    tien_lam_the: parseFloat(tongHop.tien_lam_the || 0),
    bhxh: parseFloat(tongHop.bhxh || 0),
    khac: parseFloat(tongHop.khac || 0),
    tong_khau_tru: parseFloat(tongHop.tong_khau_tru || 0),
    luong_thuc_lanh: parseFloat(tongHop.luong_thuc_lanh || 0),
    
    // Chi tiết lương chuyến
    tong_luong_chuyen: tong_luong_chuyen,
    luongChuyen: luongChuyen
  };

  return payslipData;
}

/**
 * Format date to dd/mm/yyyy
 */
function formatDate(date: Date | string): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Validate email address
 */
export function validateEmail(email: string): boolean {
  if (!email || email.trim() === '') {
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
