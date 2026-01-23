/**
 * Reconciliation API - Updated for Normalized Tables
 * Queries from chuyen_di + chi_tiet_chuyen_di instead of reconciliation_orders
 */

import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/reconciliation-v2
 * 
 * Query Parameters:
 * - limit: Number of records (default: 500, max: 5000)
 * - fromDate: YYYY-MM-DD
 * - toDate: YYYY-MM-DD
 * - khachHang: Customer name (comma-separated for multiple)
 * - donViVanChuyen: NAK/VENDOR/OTHER
 * - loaiChuyen: Một chiều/Hai chiều/Nhiều điểm
 * - loaiTuyen: Nội thành/Liên tỉnh/Đường dài
 * - orderId: Search by ma_chuyen_di
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('🚀 [API v2] Reconciliation request started');

    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const khachHang = searchParams.get('khachHang');
    const orderId = searchParams.get('orderId');
    const status = searchParams.get('status');
    const donViVanChuyen = searchParams.get('donViVanChuyen');
    const loaiChuyen = searchParams.get('loaiChuyen');
    const loaiTuyen = searchParams.get('loaiTuyen');

    const limit = Math.min(
      Math.max(1, parseInt(limitParam || '500')),
      5000
    );

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (fromDate) {
      conditions.push(`cd.ngay_tao >= $${paramIndex}`);
      params.push(fromDate);
      paramIndex++;
    }

    if (toDate) {
      conditions.push(`cd.ngay_tao <= $${paramIndex}`);
      params.push(toDate);
      paramIndex++;
    }

    if (khachHang) {
      const customerList = khachHang.split(',').map(c => c.trim()).filter(Boolean);
      if (customerList.length === 1) {
        conditions.push(`cd.ten_khach_hang ILIKE $${paramIndex}`);
        params.push(`%${customerList[0]}%`);
        paramIndex++;
      } else if (customerList.length > 1) {
        conditions.push(`cd.ten_khach_hang = ANY($${paramIndex})`);
        params.push(customerList);
        paramIndex++;
      }
    }

    if (status) {
      conditions.push(`cd.trang_thai = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (donViVanChuyen) {
      conditions.push(`cd.don_vi_van_chuyen = $${paramIndex}`);
      params.push(donViVanChuyen);
      paramIndex++;
    }

    if (loaiChuyen) {
      conditions.push(`cd.loai_chuyen = $${paramIndex}`);
      params.push(loaiChuyen);
      paramIndex++;
    }

    if (loaiTuyen) {
      conditions.push(`cd.loai_tuyen = $${paramIndex}`);
      params.push(loaiTuyen);
      paramIndex++;
    }

    if (orderId) {
      conditions.push(`cd.ma_chuyen_di ILIKE $${paramIndex}`);
      params.push(`%${orderId}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    params.push(limit);
    const limitClause = `LIMIT $${paramIndex}`;

    // Main query: Get chuyen_di with aggregated details
    const query = `
      SELECT
        cd.id,
        cd.ma_chuyen_di,
        cd.ngay_tao,
        cd.ten_tuyen,
        cd.ten_khach_hang,
        cd.tong_doanh_thu,
        cd.tong_chi_phi,
        cd.trang_thai,
        cd.loai_chuyen,
        cd.loai_tuyen,
        cd.ten_tai_xe,
        cd.don_vi_van_chuyen,
        cd.tong_quang_duong,
        cd.ghi_chu,
        cd.created_at,
        
        -- Aggregate details as JSON
        COALESCE(
          json_agg(
            json_build_object(
              'id', ct.id,
              'thuTu', ct.thu_tu,
              'loaiTuyenKH', ct.loai_tuyen_kh,
              'maTuyen', ct.ma_tuyen,
              'loTrinh', ct.lo_trinh,
              'loTrinhChiTiet', ct.lo_trinh_chi_tiet,
              'bienKiemSoat', ct.bien_kiem_soat,
              'taiTrong', ct.tai_trong,
              'taiTrongTinhPhi', ct.tai_trong_tinh_phi,
              'quangDuong', ct.quang_duong,
              'soChieu', ct.so_chieu,
              'donGia', ct.don_gia,
              'thanhTien', ct.thanh_tien,
              'hinhThucTinhGia', ct.hinh_thuc_tinh_gia,
              'loaiCa', ct.loai_ca,
              'tenKhachHangCap1', ct.ten_khach_hang_cap_1,
              'ngayTrenTem', ct.ngay_tren_tem
            ) ORDER BY ct.thu_tu
          ) FILTER (WHERE ct.id IS NOT NULL),
          '[]'::json
        ) as chi_tiet_lo_trinh
        
      FROM chuyen_di cd
      LEFT JOIN chi_tiet_chuyen_di ct ON ct.ma_chuyen_di = cd.ma_chuyen_di
      ${whereClause}
      GROUP BY cd.id, cd.ma_chuyen_di, cd.ngay_tao, cd.created_at
      ORDER BY cd.ngay_tao DESC, cd.created_at DESC
      ${limitClause}
    `;

    console.log('📊 [API v2] Executing query:', query);
    console.log('📊 [API v2] Params:', params);

    const result = await sql.query(query, params);

    console.log('✅ [API v2] Query successful');
    console.log('📊 [API v2] Rows returned:', result.rows.length);

    // Map to frontend format
    const records = result.rows.map((row: any) => ({
      id: row.id.toString(),
      maChuyenDi: row.ma_chuyen_di,
      ngayTao: row.ngay_tao,
      tenKhachHang: row.ten_khach_hang,
      loaiChuyen: row.loai_chuyen,
      loaiTuyen: row.loai_tuyen,
      tenTuyen: row.ten_tuyen,
      tenTaiXe: row.ten_tai_xe,
      donViVanChuyen: row.don_vi_van_chuyen,
      trangThai: row.trang_thai,
      tongQuangDuong: parseFloat(row.tong_quang_duong || 0),
      tongDoanhThu: parseFloat(row.tong_doanh_thu || 0),
      tongChiPhi: parseFloat(row.tong_chi_phi || 0),
      ghiChu: row.ghi_chu,
      chiTietLoTrinh: row.chi_tiet_lo_trinh || [],
    }));

    // Calculate summary
    const summary = {
      totalOrders: records.length,
      totalAmount: records.reduce((sum, r) => sum + r.tongDoanhThu, 0),
      totalDistance: records.reduce((sum, r) => sum + r.tongQuangDuong, 0),
      approvedOrders: records.filter(r => r.trangThai === 'approved').length,
      pendingOrders: records.filter(r => r.trangThai === 'pending').length,
    };

    const duration = Date.now() - startTime;
    console.log(`✅ [API v2] Request completed in ${duration}ms`);

    return NextResponse.json({
      records,
      summary,
      total: records.length,
      count: records.length,
      duration_ms: duration,
      database: 'normalized_tables',
    });

  } catch (error: any) {
    console.error('❌ [API v2] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch reconciliation data',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
