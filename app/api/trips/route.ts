import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/trips
 *
 * Lấy danh sách chuyến đi từ bảng chuyen_di
 *
 * Query Parameters:
 * - fromDate, toDate     : lọc theo ngày tạo (YYYY-MM-DD)
 * - khachHang            : lọc theo tên khách hàng (ILIKE partial)
 * - donViVanChuyen       : lọc theo đơn vị vận chuyển
 * - loaiChuyen           : lọc theo loại chuyến
 * - loaiTuyen            : lọc theo loại tuyến
 * - trangThai            : lọc theo trạng thái (raw value từ DB)
 * - search               : tìm kiếm theo mã chuyến, tên tuyến, tài xế
 * - limit                : số bản ghi tối đa (mặc định 200)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    const sp = request.nextUrl.searchParams;

    const fromDate       = sp.get('fromDate');
    const toDate         = sp.get('toDate');
    const khachHang      = sp.get('khachHang');
    const donViVanChuyen = sp.get('donViVanChuyen');
    const loaiChuyen     = sp.get('loaiChuyen');
    const loaiTuyen      = sp.get('loaiTuyen');
    const trangThai      = sp.get('trangThai');
    const search         = sp.get('search');
    const limit          = Math.min(parseInt(sp.get('limit') || '200'), 500);

    // ── Build WHERE clause ──────────────────────────────────────────────────
    const conditions: string[] = [];
    const params: any[] = [];
    let i = 1;

    if (fromDate) {
      conditions.push(`cd.ngay_tao::date >= $${i}::date`);
      params.push(fromDate); i++;
    }
    if (toDate) {
      conditions.push(`cd.ngay_tao::date <= $${i}::date`);
      params.push(toDate); i++;
    }
    if (khachHang) {
      conditions.push(`cd.ten_khach_hang ILIKE $${i}`);
      params.push(`%${khachHang}%`); i++;
    }
    if (donViVanChuyen) {
      conditions.push(`LOWER(TRIM(cd.don_vi_van_chuyen)) = $${i}`);
      params.push(donViVanChuyen.toLowerCase()); i++;
    }
    if (loaiChuyen) {
      conditions.push(`cd.loai_chuyen ILIKE $${i}`);
      params.push(`%${loaiChuyen}%`); i++;
    }
    if (loaiTuyen) {
      conditions.push(`cd.loai_tuyen ILIKE $${i}`);
      params.push(`%${loaiTuyen}%`); i++;
    }
    if (trangThai) {
      conditions.push(`cd.trang_thai_chuyen_di = $${i}`);
      params.push(trangThai); i++;
    }
    if (search) {
      conditions.push(`(
        cd.ma_chuyen_di   ILIKE $${i} OR
        cd.ten_tuyen      ILIKE $${i} OR
        cd.ten_tai_xe     ILIKE $${i} OR
        cd.ten_khach_hang ILIKE $${i}
      )`);
      params.push(`%${search}%`); i++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // ── Main query ─────────────────────────────────────────────────────────
    params.push(limit);
    const mainQuery = `
      SELECT
        cd.ma_chuyen_di,
        cd.ngay_tao,
        cd.ma_khach_hang,
        cd.ten_khach_hang,
        cd.ten_tuyen,
        cd.ten_tai_xe,
        cd.don_vi_van_chuyen,
        cd.loai_chuyen,
        cd.loai_tuyen,
        cd.trang_thai_chuyen_di,
        cd.thoi_gian_tao,
        CASE
          WHEN cd.doanh_thu::TEXT IS NULL OR cd.doanh_thu::TEXT = '' THEN 0
          WHEN cd.doanh_thu::TEXT !~ '^-?[0-9]*\\.?[0-9]+$' THEN 0
          ELSE cd.doanh_thu::NUMERIC
        END AS doanh_thu,
        CASE
          WHEN cd.so_km_theo_odo::TEXT IS NULL OR cd.so_km_theo_odo::TEXT = '' THEN 0
          WHEN cd.so_km_theo_odo::TEXT !~ '^-?[0-9]*\\.?[0-9]+$' THEN 0
          ELSE cd.so_km_theo_odo::NUMERIC
        END AS so_km,
        (
          SELECT COUNT(*)
          FROM chi_tiet_chuyen_di ct
          WHERE ct.ma_chuyen_di = cd.ma_chuyen_di
        ) AS so_diem_dung
      FROM chuyen_di cd
      ${whereClause}
      ORDER BY cd.ngay_tao DESC, cd.thoi_gian_tao DESC
      LIMIT $${i}
    `;

    // ── Summary query (without LIMIT) ───────────────────────────────────────
    const summaryParams = params.slice(0, -1); // remove limit
    const summaryQuery = `
      SELECT
        COUNT(*)                                                        AS total,
        COUNT(CASE WHEN cd.trang_thai_chuyen_di = 'Kết thúc' THEN 1 END)                       AS hoan_thanh,
        COUNT(CASE WHEN cd.trang_thai_chuyen_di IN ('Đang thực hiện','Chờ giao hàng') THEN 1 END) AS dang_xu_ly,
        COUNT(CASE WHEN cd.trang_thai_chuyen_di = 'Hủy' THEN 1 END)                            AS da_huy,
        COALESCE(SUM(
          CASE
            WHEN cd.doanh_thu::TEXT IS NULL OR cd.doanh_thu::TEXT = '' THEN 0
            WHEN cd.doanh_thu::TEXT !~ '^-?[0-9]*\\.?[0-9]+$' THEN 0
            ELSE cd.doanh_thu::NUMERIC
          END
        ), 0) AS tong_doanh_thu,
        COALESCE(SUM(
          CASE
            WHEN cd.so_km_theo_odo::TEXT IS NULL OR cd.so_km_theo_odo::TEXT = '' THEN 0
            WHEN cd.so_km_theo_odo::TEXT !~ '^-?[0-9]*\\.?[0-9]+$' THEN 0
            ELSE cd.so_km_theo_odo::NUMERIC
          END
        ), 0) AS tong_km
      FROM chuyen_di cd
      ${whereClause}
    `;

    const [mainResult, summaryResult] = await Promise.all([
      query(mainQuery, params),
      query(summaryQuery, summaryParams),
    ]);

    const s = summaryResult.rows[0];
    const summary = {
      total:        parseInt(s.total || '0'),
      hoanThanh:    parseInt(s.hoan_thanh || '0'),
      dangXuLy:     parseInt(s.dang_xu_ly || '0'),
      daHuy:        parseInt(s.da_huy || '0'),
      tongDoanhThu: parseFloat(s.tong_doanh_thu || '0'),
      tongKm:       parseFloat(s.tong_km || '0'),
    };

    const trips = mainResult.rows.map((row: any) => ({
      ma_chuyen_di:        row.ma_chuyen_di,
      ngay_tao:            row.ngay_tao instanceof Date
                             ? row.ngay_tao.toISOString().split('T')[0]
                             : String(row.ngay_tao || '').split('T')[0],
      ma_khach_hang:       row.ma_khach_hang || '',
      ten_khach_hang:      row.ten_khach_hang || '',
      ten_tuyen:           row.ten_tuyen || '',
      ten_tai_xe:          row.ten_tai_xe || '',
      don_vi_van_chuyen:   row.don_vi_van_chuyen || '',
      loai_chuyen:         row.loai_chuyen || '',
      loai_tuyen:          row.loai_tuyen || '',
      trang_thai:          row.trang_thai_chuyen_di || '',
      doanh_thu:           parseFloat(row.doanh_thu || '0'),
      so_km:               parseFloat(row.so_km || '0'),
      so_diem_dung:        parseInt(row.so_diem_dung || '0'),
    }));

    return NextResponse.json(
      { trips, summary, count: trips.length },
      { headers: { 'X-Response-Time': `${Date.now() - startTime}ms` } }
    );
  } catch (error) {
    console.error('❌ [trips API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
