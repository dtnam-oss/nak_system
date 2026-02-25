import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

// ── GET /api/reconciliation/tong-hop/export ───────────────────────────────────
// Xuất toàn bộ chi_tiet_chuyen_di (flat, không gộp) theo bộ lọc hiện tại
// 1 dòng chi_tiet = 1 dòng Excel
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const from_date     = searchParams.get('from_date');
  const to_date       = searchParams.get('to_date');
  const ma_khach_hang = searchParams.get('ma_khach_hang');
  const loai_chuyen   = searchParams.get('loai_chuyen');
  const search        = searchParams.get('search');

  const conditions: string[] = [];
  const values: any[] = [];
  let i = 1;

  if (from_date) {
    conditions.push(`cd.ngay_tao::date >= $${i++}::date`);
    values.push(from_date);
  }
  if (to_date) {
    conditions.push(`cd.ngay_tao::date <= $${i++}::date`);
    values.push(to_date);
  }
  if (ma_khach_hang && ma_khach_hang !== 'all') {
    conditions.push(`cd.ma_khach_hang = $${i++}`);
    values.push(ma_khach_hang);
  }
  if (loai_chuyen && loai_chuyen !== 'all') {
    conditions.push(`cd.loai_chuyen = $${i++}`);
    values.push(loai_chuyen);
  }
  if (search) {
    conditions.push(
      `(cd.ma_chuyen_di ILIKE $${i} OR cd.ten_khach_hang ILIKE $${i} OR cd.ten_tuyen ILIKE $${i} OR cd.ma_khach_hang ILIKE $${i})`
    );
    values.push(`%${search}%`);
    i++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const result = await query(
      `SELECT
        -- Thông tin chuyến đi (chuyen_di)
        cd.ma_chuyen_di,
        cd.ngay_tao          AS cd_ngay_tao,
        cd.ma_khach_hang,
        cd.ten_khach_hang,
        cd.ten_tai_xe,
        cd.loai_chuyen       AS cd_loai_chuyen,
        cd.trang_thai_chuyen_di,

        -- Toàn bộ chi tiết (chi_tiet_chuyen_di) - giữ nguyên cấu trúc DB
        ct.id                AS ct_id,
        ct.ngay_chuyen_di,
        ct.loai_chuyen       AS ct_loai_chuyen,
        ct.loai_tuyen,
        ct.ten_tuyen         AS ct_ten_tuyen,
        ct.loai_tuyen_khach_hang,
        ct.ma_chuyen_di_kh,
        ct.lo_trinh,
        ct.lo_trinh_chi_tiet_theo_diem,
        ct.lo_trinh_doi_soat,
        ct.bien_kiem_soat,
        ct.tai_trong,
        ct.quang_duong,
        ct.so_chieu,
        ct.don_gia,
        ct.ket_qua,
        ct.loai_ca,
        ct.tai_trong_tinh_phi,
        ct.hinh_thuc_tinh_gia,
        ct.ten_khach_hang_cap_1,
        ct.ngay_tren_tem,
        ct.don_vi_van_chuyen AS ct_don_vi_van_chuyen,
        ct.chi_phi_van_hanh,
        ct.email_tai_xe
      FROM chuyen_di cd
      INNER JOIN chi_tiet_chuyen_di ct ON ct.ma_chuyen_di = cd.ma_chuyen_di
      ${where}
      ORDER BY cd.ngay_tao DESC, cd.ma_chuyen_di ASC, ct.id ASC`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Không có dữ liệu để xuất' }, { status: 404 });
    }

    // ── Build Excel ───────────────────────────────────────────────────────────
    const workbook  = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Chi tiết chuyến đi');

    worksheet.columns = [
      // ── Thông tin chuyến đi ──────────────────────────────────────────────
      { header: 'Mã chuyến đi',         key: 'ma_chuyen_di',            width: 22 },
      { header: 'Ngày (chuyến)',         key: 'cd_ngay_tao',             width: 14 },
      { header: 'Mã khách hàng',         key: 'ma_khach_hang',           width: 16 },
      { header: 'Tên khách hàng',        key: 'ten_khach_hang',          width: 22 },
      { header: 'Tài xế',               key: 'ten_tai_xe',              width: 20 },
      { header: 'Loại chuyến (CD)',      key: 'cd_loai_chuyen',          width: 14 },
      { header: 'Trạng thái',            key: 'trang_thai_chuyen_di',    width: 16 },
      // ── Chi tiết chuyến đi ───────────────────────────────────────────────
      { header: 'ID chi tiết',           key: 'ct_id',                   width: 12 },
      { header: 'Ngày chuyến đi',        key: 'ngay_chuyen_di',          width: 14 },
      { header: 'Loại chuyến (CT)',      key: 'ct_loai_chuyen',          width: 14 },
      { header: 'Loại tuyến',            key: 'loai_tuyen',              width: 14 },
      { header: 'Tên tuyến',             key: 'ct_ten_tuyen',            width: 30 },
      { header: 'Loại tuyến KH',         key: 'loai_tuyen_khach_hang',   width: 16 },
      { header: 'Mã CD khách hàng',      key: 'ma_chuyen_di_kh',         width: 22 },
      { header: 'Lộ trình',              key: 'lo_trinh',                width: 35 },
      { header: 'Lộ trình chi tiết',     key: 'lo_trinh_chi_tiet',       width: 40 },
      { header: 'Lộ trình đối soát',     key: 'lo_trinh_doi_soat',       width: 35 },
      { header: 'Biển KS',               key: 'bien_kiem_soat',          width: 14 },
      { header: 'Tải trọng',             key: 'tai_trong',               width: 12 },
      { header: 'Quãng đường',           key: 'quang_duong',             width: 13 },
      { header: 'Số chiều',              key: 'so_chieu',                width: 10 },
      { header: 'Đơn giá',               key: 'don_gia',                 width: 14 },
      { header: 'Kết quả',               key: 'ket_qua',                 width: 14 },
      { header: 'Loại ca',               key: 'loai_ca',                 width: 14 },
      { header: 'Tải trọng tính phí',    key: 'tai_trong_tinh_phi',      width: 16 },
      { header: 'Hình thức tính giá',    key: 'hinh_thuc_tinh_gia',      width: 18 },
      { header: 'Tên KH cấp 1',          key: 'ten_khach_hang_cap_1',    width: 20 },
      { header: 'Ngày trên tem',         key: 'ngay_tren_tem',           width: 14 },
      { header: 'Đơn vị VC (CT)',        key: 'ct_don_vi_van_chuyen',    width: 14 },
      { header: 'Chi phí vận hành',      key: 'chi_phi_van_hanh',        width: 16 },
      { header: 'Email tài xế',          key: 'email_tai_xe',            width: 24 },
    ];

    // ── Header style ─────────────────────────────────────────────────────────
    const headerRow = worksheet.getRow(1);
    headerRow.height = 32;
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    headerRow.eachCell((cell, col) => {
      // Cột 1-7: xanh lam (thông tin chuyến đi)
      // Cột 8+:  xanh lá (chi tiết)
      cell.fill = {
        type: 'pattern', pattern: 'solid',
        fgColor: { argb: col <= 7 ? 'FF2F75B6' : 'FF375623' },
      };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' },
      };
    });

    // ── Data rows ─────────────────────────────────────────────────────────────
    result.rows.forEach((row: any, idx: number) => {
      const dataRow = worksheet.addRow({
        ma_chuyen_di:          row.ma_chuyen_di   || '',
        cd_ngay_tao:           row.cd_ngay_tao
                                 ? format(new Date(row.cd_ngay_tao), 'dd/MM/yyyy')
                                 : '',
        ma_khach_hang:         row.ma_khach_hang  || '',
        ten_khach_hang:        row.ten_khach_hang || '',
        ten_tai_xe:            row.ten_tai_xe     || '',
        cd_loai_chuyen:        row.cd_loai_chuyen || '',
        trang_thai_chuyen_di:  row.trang_thai_chuyen_di || '',
        ct_id:                 row.ct_id          || '',
        ngay_chuyen_di:        row.ngay_chuyen_di || '',
        ct_loai_chuyen:        row.ct_loai_chuyen || '',
        loai_tuyen:            row.loai_tuyen     || '',
        ct_ten_tuyen:          row.ct_ten_tuyen   || '',
        loai_tuyen_khach_hang: row.loai_tuyen_khach_hang || '',
        ma_chuyen_di_kh:       row.ma_chuyen_di_kh || '',
        lo_trinh:              row.lo_trinh       || '',
        lo_trinh_chi_tiet:     row.lo_trinh_chi_tiet_theo_diem || '',
        lo_trinh_doi_soat:     row.lo_trinh_doi_soat || '',
        bien_kiem_soat:        row.bien_kiem_soat || '',
        tai_trong:             row.tai_trong      || '',
        quang_duong:           row.quang_duong    || '',
        so_chieu:              row.so_chieu       || '',
        don_gia:               row.don_gia        || '',
        ket_qua:               row.ket_qua        || '',
        loai_ca:               row.loai_ca        || '',
        tai_trong_tinh_phi:    row.tai_trong_tinh_phi || '',
        hinh_thuc_tinh_gia:    row.hinh_thuc_tinh_gia || '',
        ten_khach_hang_cap_1:  row.ten_khach_hang_cap_1 || '',
        ngay_tren_tem:         row.ngay_tren_tem  || '',
        ct_don_vi_van_chuyen:  row.ct_don_vi_van_chuyen || '',
        chi_phi_van_hanh:      row.chi_phi_van_hanh || '',
        email_tai_xe:          row.email_tai_xe   || '',
      });

      dataRow.height = 18;

      dataRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top:    { style: 'thin' },
          left:   { style: 'thin' },
          bottom: { style: 'thin' },
          right:  { style: 'thin' },
        };
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
        // Alternating row color
        if (idx % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
        }
      });

      // Center align date / numeric columns
      ['cd_ngay_tao', 'ct_id', 'ngay_chuyen_di', 'ngay_tren_tem',
       'tai_trong', 'quang_duong', 'so_chieu', 'tai_trong_tinh_phi'].forEach((key) => {
        dataRow.getCell(key).alignment = { vertical: 'middle', horizontal: 'center' };
      });
    });

    // ── Freeze panes & auto-filter ────────────────────────────────────────────
    worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to:   { row: 1, column: worksheet.columns.length },
    };

    // ── Summary row ───────────────────────────────────────────────────────────
    const summaryRow = worksheet.addRow({
      ma_chuyen_di: `TỔNG: ${result.rows.length} dòng chi tiết`,
    });
    summaryRow.font = { bold: true };
    summaryRow.height = 20;
    summaryRow.getCell('ma_chuyen_di').fill = {
      type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD966' },
    };

    // ── Return file ───────────────────────────────────────────────────────────
    const buffer   = await workbook.xlsx.writeBuffer();
    const dateTag  = format(new Date(), 'yyyyMMdd_HHmmss');
    const fileName = `TongHop_ChiTiet_${dateTag}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Content-Length':      buffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('❌ [tong-hop export] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Lỗi xuất dữ liệu' },
      { status: 500 }
    );
  }
}
