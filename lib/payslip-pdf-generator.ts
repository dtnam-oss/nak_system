/**
 * Payslip PDF Generator
 * Generates two types of PDFs:
 * 1. Tổng hợp (Summary) - 1 page overview
 * 2. Chi tiết (Detailed) - Multiple pages with breakdowns
 */

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { query } from '@/lib/db';

interface PayslipData {
  ma_nhan_vien: string;
  ten_nhan_vien: string;
  chuc_vu: string;
  email: string;
  thang: number;
  nam: number;
  
  // Thu nhập
  luong_bat_dau: number;
  tong_chi_phi_sua_chua: number;
  hoan_coc: number;
  chi_phi_do_dau_ngoai: number;
  chi_phi_phat_sinh_new: number;
  thuong: number;
  
  // Khấu trừ
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
  
  // Tổng
  tong_thu_nhap: number;
  tong_khau_tru: number;
  luong_thuc_lanh: number;
}

/**
 * Generate PDF Phiếu lương tổng hợp (1 page)
 */
export async function generateTongHopPDF(
  payslip: PayslipData
): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(value);
  };
  
  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('PHIẾU LƯƠNG TỔNG HỢP', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Tháng ${payslip.thang}/${payslip.nam}`, 105, 28, { align: 'center' });
  
  // Employee info section
  let yPos = 40;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('THÔNG TIN NHÂN VIÊN', 15, yPos);
  
  yPos += 7;
  doc.setFont('helvetica', 'normal');
  doc.text(`Mã nhân viên:`, 20, yPos);
  doc.text(payslip.ma_nhan_vien, 70, yPos);
  
  yPos += 6;
  doc.text(`Họ và tên:`, 20, yPos);
  doc.text(payslip.ten_nhan_vien, 70, yPos);
  
  yPos += 6;
  doc.text(`Chức vụ:`, 20, yPos);
  doc.text(payslip.chuc_vu, 70, yPos);
  
  yPos += 6;
  doc.text(`Email:`, 20, yPos);
  doc.text(payslip.email, 70, yPos);
  
  // Income section
  yPos += 12;
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(230, 230, 230);
  doc.rect(15, yPos - 4, 180, 7, 'F');
  doc.text('THU NHẬP', 20, yPos);
  
  yPos += 8;
  doc.setFont('helvetica', 'normal');
  
  const incomeItems = [
    ['Lương chuyến', formatCurrency(payslip.luong_bat_dau)],
    ['Chi phí sửa chữa', formatCurrency(payslip.tong_chi_phi_sua_chua)],
    ['Hoàn cọc', formatCurrency(payslip.hoan_coc)],
    ['Chi phí đổ dầu ngoài', formatCurrency(payslip.chi_phi_do_dau_ngoai)],
    ['Chi phí phát sinh', formatCurrency(payslip.chi_phi_phat_sinh_new)],
    ['Tiền thưởng', formatCurrency(payslip.thuong)]
  ];
  
  incomeItems.forEach(([label, value]) => {
    doc.text(`- ${label}:`, 20, yPos);
    doc.text(`${value} đ`, 190, yPos, { align: 'right' });
    yPos += 6;
  });
  
  yPos += 2;
  doc.setFont('helvetica', 'bold');
  doc.text('TỔNG THU NHẬP:', 20, yPos);
  doc.text(`${formatCurrency(payslip.tong_thu_nhap)} đ`, 190, yPos, { align: 'right' });
  
  // Deductions section
  yPos += 10;
  doc.setFillColor(230, 230, 230);
  doc.rect(15, yPos - 4, 180, 7, 'F');
  doc.text('KHẤU TRỪ', 20, yPos);
  
  yPos += 8;
  doc.setFont('helvetica', 'normal');
  
  const deductionItems = [
    ['Truy thu dầu', formatCurrency(payslip.truy_thu_dau)],
    ['Truy thu on-time', formatCurrency(payslip.truy_thu_ontime)],
    ['Trừ cọc', formatCurrency(payslip.tru_coc)],
    ['Tạm ứng', formatCurrency(payslip.tam_ung)],
    ['Phạt chế tài', formatCurrency(payslip.phat_che_tai)],
    ['Truy thu VETC', formatCurrency(payslip.truy_thu_vetc)],
    ['Phạt người', formatCurrency(payslip.phat_nguoi)],
    ['Tiền làm thẻ', formatCurrency(payslip.tien_lam_the)],
    ['BHXH', formatCurrency(payslip.bhxh)],
    ['Khác', formatCurrency(payslip.khac)]
  ];
  
  deductionItems.forEach(([label, value]) => {
    doc.text(`- ${label}:`, 20, yPos);
    doc.text(`${value} đ`, 190, yPos, { align: 'right' });
    yPos += 6;
  });
  
  yPos += 2;
  doc.setFont('helvetica', 'bold');
  doc.text('TỔNG KHẤU TRỪ:', 20, yPos);
  doc.text(`${formatCurrency(payslip.tong_khau_tru)} đ`, 190, yPos, { align: 'right' });
  
  // Final salary
  yPos += 12;
  doc.setFillColor(66, 114, 196);
  doc.rect(15, yPos - 5, 180, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text('THỰC LĨNH:', 20, yPos);
  doc.text(`${formatCurrency(payslip.luong_thuc_lanh)} đ`, 190, yPos, { align: 'right' });
  
  // Footer
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(`Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}`, 105, 280, { align: 'center' });
  doc.text('NAK Logistics - Phòng Nhân sự', 105, 285, { align: 'center' });
  
  return Buffer.from(doc.output('arraybuffer'));
}

/**
 * Generate PDF Phiếu lương chi tiết (Multiple pages)
 */
export async function generateChiTietPDF(
  ma_nhan_vien: string,
  ten_nhan_vien: string,
  thang: number,
  nam: number
): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(value);
  };
  
  // Helper to add page header
  const addPageHeader = (title: string, pageNum: number) => {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('PHIẾU LƯƠNG CHI TIẾT', 105, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nhân viên: ${ten_nhan_vien} | Tháng ${thang}/${nam}`, 105, 22, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 15, 32);
    
    doc.setFontSize(8);
    doc.text(`Trang ${pageNum}`, 190, 15, { align: 'right' });
    
    return 38; // Starting Y position for content
  };
  
  let pageNum = 1;
  
  // Page 1: Lương chuyến
  try {
    const luongChuyenResult = await query(
      `SELECT ma_chuyen, ngay_tao, ten_khach_hang, loai_chuyen, ten_tuyen, luong_tai_xe
       FROM du_lieu_luong_tx
       WHERE ma_tai_xe = $1 AND thang = $2 AND nam = $3
       ORDER BY ngay_tao ASC`,
      [ma_nhan_vien, thang, nam]
    );
    
    if (luongChuyenResult.rows.length > 0) {
      const yStart = addPageHeader('CHI TIẾT LƯƠNG CHUYẾN', pageNum++);
      
      (doc as any).autoTable({
        startY: yStart,
        head: [['STT', 'Mã chuyến', 'Ngày', 'Khách hàng', 'Tuyến', 'Lương']],
        body: luongChuyenResult.rows.map((row, idx) => [
          idx + 1,
          row.ma_chuyen,
          new Date(row.ngay_tao).toLocaleDateString('vi-VN'),
          row.ten_khach_hang,
          row.ten_tuyen,
          formatCurrency(row.luong_tai_xe) + ' đ'
        ]),
        foot: [[
          '', '', '', '', 'TỔNG:',
          formatCurrency(luongChuyenResult.rows.reduce((sum, row) => sum + parseFloat(row.luong_tai_xe), 0)) + ' đ'
        ]],
        theme: 'grid',
        headStyles: { fillColor: [66, 114, 196], fontSize: 9 },
        footStyles: { fillColor: [230, 230, 230], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 }
      });
    }
  } catch (error) {
    console.error('Error fetching luong chuyen:', error);
  }
  
  // Page 2: Tiền thưởng (if exists)
  try {
    const thuongResult = await query(
      `SELECT hang_muc, tien_thuong
       FROM du_lieu_thuong
       WHERE ma_nhan_vien = $1 AND thang = $2 AND nam = $3`,
      [ma_nhan_vien, thang, nam]
    );
    
    if (thuongResult.rows.length > 0) {
      doc.addPage();
      const yStart = addPageHeader('CHI TIẾT TIỀN THƯỞNG', pageNum++);
      
      (doc as any).autoTable({
        startY: yStart,
        head: [['STT', 'Hạng mục', 'Số tiền']],
        body: thuongResult.rows.map((row, idx) => [
          idx + 1,
          row.hang_muc,
          formatCurrency(row.tien_thuong) + ' đ'
        ]),
        foot: [[
          '', 'TỔNG:',
          formatCurrency(thuongResult.rows.reduce((sum, row) => sum + parseFloat(row.tien_thuong), 0)) + ' đ'
        ]],
        theme: 'grid',
        headStyles: { fillColor: [66, 114, 196], fontSize: 9 },
        footStyles: { fillColor: [230, 230, 230], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 }
      });
    }
  } catch (error) {
    console.error('Error fetching thuong:', error);
  }
  
  // Page 3: Tiền cọc (if exists)
  try {
    const cocResult = await query(
      `SELECT tien_thu_coc
       FROM du_lieu_tien_coc
       WHERE ma_tai_xe = $1 AND thang = $2 AND nam = $3`,
      [ma_nhan_vien, thang, nam]
    );
    
    if (cocResult.rows.length > 0) {
      doc.addPage();
      const yStart = addPageHeader('CHI TIẾT TRỪ CỌC', pageNum++);
      
      (doc as any).autoTable({
        startY: yStart,
        head: [['STT', 'Mô tả', 'Số tiền']],
        body: cocResult.rows.map((row, idx) => [
          idx + 1,
          'Trừ cọc tháng ' + thang + '/' + nam,
          formatCurrency(row.tien_thu_coc) + ' đ'
        ]),
        foot: [[
          '', 'TỔNG:',
          formatCurrency(cocResult.rows.reduce((sum, row) => sum + parseFloat(row.tien_thu_coc), 0)) + ' đ'
        ]],
        theme: 'grid',
        headStyles: { fillColor: [66, 114, 196], fontSize: 9 },
        footStyles: { fillColor: [230, 230, 230], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 }
      });
    }
  } catch (error) {
    console.error('Error fetching coc:', error);
  }
  
  // Page 4: BHXH (if exists)
  try {
    const bhxhResult = await query(
      `SELECT hang_muc, so_tien
       FROM du_lieu_bhxh
       WHERE ma_tai_xe = $1 AND thang = $2 AND nam = $3`,
      [ma_nhan_vien, thang, nam]
    );
    
    if (bhxhResult.rows.length > 0) {
      doc.addPage();
      const yStart = addPageHeader('CHI TIẾT BHXH', pageNum++);
      
      (doc as any).autoTable({
        startY: yStart,
        head: [['STT', 'Hạng mục', 'Số tiền']],
        body: bhxhResult.rows.map((row, idx) => [
          idx + 1,
          row.hang_muc,
          formatCurrency(row.so_tien) + ' đ'
        ]),
        foot: [[
          '', 'TỔNG:',
          formatCurrency(bhxhResult.rows.reduce((sum, row) => sum + parseFloat(row.so_tien), 0)) + ' đ'
        ]],
        theme: 'grid',
        headStyles: { fillColor: [66, 114, 196], fontSize: 9 },
        footStyles: { fillColor: [230, 230, 230], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 }
      });
    }
  } catch (error) {
    console.error('Error fetching bhxh:', error);
  }
  
  // Footer on last page
  const totalPages = doc.internal.pages.length - 1;
  doc.setPage(totalPages);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(`Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}`, 105, 285, { align: 'center' });
  doc.text('NAK Logistics - Phòng Nhân sự', 105, 290, { align: 'center' });
  
  return Buffer.from(doc.output('arraybuffer'));
}
