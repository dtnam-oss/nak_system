import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import type { ChiTietLoTrinh } from '@/types/reconciliation'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * GET /api/reconciliation/[id]
 *
 * Fetch detailed trip information including all chi_tiet_lo_trinh
 * Used by TripDetailsDialog popup for lazy loading
 *
 * Response includes:
 * - Full chuyen_di record
 * - All chi_tiet_chuyen_di records aggregated
 * - Computed totals and statistics
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()

  try {
    const { id: maChuyenDi } = await params

    if (!maChuyenDi) {
      return NextResponse.json(
        { error: 'Missing ma_chuyen_di parameter' },
        { status: 400 }
      )
    }

    console.log('🔍 [Detail API] Fetching detail for:', maChuyenDi)

    // Single optimized query with JOIN
    const sqlQuery = `
      SELECT
        cd.ma_chuyen_di,
        cd.ngay_tao,
        cd.ten_khach_hang,
        cd.loai_chuyen,
        cd.loai_tuyen,
        cd.ten_tuyen,
        cd.ten_tai_xe,
        cd.don_vi_van_chuyen,
        cd.trang_thai_chuyen_di,
        CASE
          WHEN cd.doanh_thu::TEXT IS NULL OR cd.doanh_thu::TEXT = '' THEN NULL
          WHEN cd.doanh_thu::TEXT !~ '^-?[0-9]*\\.?[0-9]+$' THEN NULL
          ELSE cd.doanh_thu::NUMERIC
        END as doanh_thu,
        CASE
          WHEN cd.so_km_theo_odo::TEXT IS NULL OR cd.so_km_theo_odo::TEXT = '' THEN NULL
          WHEN cd.so_km_theo_odo::TEXT !~ '^-?[0-9]*\\.?[0-9]+$' THEN NULL
          ELSE cd.so_km_theo_odo::NUMERIC
        END as so_km_theo_odo,
        cd.thoi_gian_tao,
        -- Aggregate all chi_tiet records
        COALESCE(
          json_agg(
            json_build_object(
              'id', ct.id,
              'loTrinh', ct.lo_trinh,
              'loTrinhChiTiet', ct.lo_trinh_chi_tiet_theo_diem,
              'bienKiemSoat', ct.bien_kiem_soat,
              'quangDuong', ct.quang_duong,
              'taiTrong', ct.tai_trong,
              'taiTrongTinhPhi', ct.tai_trong_tinh_phi,
              'soChieu', ct.so_chieu,
              'donGia', ct.don_gia,
              'thanhTien', ct.ket_qua,
              'hinhThucTinhGia', ct.hinh_thuc_tinh_gia,
              'loaiCa', ct.loai_ca,
              'maTuyen', ct.ma_chuyen_di_kh,
              'loaiTuyenKH', ct.loai_tuyen_khach_hang,
              'ngayTrenTem', ct.ngay_tren_tem,
              'tenKhachHangCap1', ct.ten_khach_hang_cap_1,
              'hinhAnh', ct.hinh_anh
            ) ORDER BY ct.id
          ) FILTER (WHERE ct.id IS NOT NULL),
          '[]'::json
        ) as chi_tiet_lo_trinh
      FROM chuyen_di cd
      LEFT JOIN chi_tiet_chuyen_di ct ON ct.ma_chuyen_di = cd.ma_chuyen_di
      WHERE cd.ma_chuyen_di = $1
      GROUP BY cd.ma_chuyen_di, cd.ngay_tao, cd.ten_khach_hang, cd.loai_chuyen,
               cd.loai_tuyen, cd.ten_tuyen, cd.ten_tai_xe, cd.don_vi_van_chuyen,
               cd.trang_thai_chuyen_di, cd.doanh_thu, cd.so_km_theo_odo, cd.thoi_gian_tao
    `

    const result = await query(sqlQuery, [maChuyenDi])

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      )
    }

    const row = result.rows[0]

    // Parse chi_tiet_lo_trinh
    let chiTietLoTrinh: ChiTietLoTrinh[] = []
    if (row.chi_tiet_lo_trinh) {
      try {
        chiTietLoTrinh = Array.isArray(row.chi_tiet_lo_trinh)
          ? row.chi_tiet_lo_trinh.map((ct: any, index: number) => ({
              thuTu: index + 1,
              id: ct.id || '',
              loaiTuyenKH: ct.loaiTuyenKH || '',
              maTuyen: ct.maTuyen || '',
              bienKiemSoat: ct.bienKiemSoat || '',
              loTrinh: ct.loTrinh || '',
              loTrinhChiTiet: ct.loTrinhChiTiet || '',
              quangDuong: parseFloat(ct.quangDuong || 0),
              taiTrong: parseFloat(ct.taiTrong || 0),
              taiTrongTinhPhi: parseFloat(ct.taiTrongTinhPhi || 0),
              hinhThucTinhGia: ct.hinhThucTinhGia || '',
              soChieu: parseInt(ct.soChieu || 0),
              donGia: parseFloat(ct.donGia || 0),
              thanhTien: parseFloat(ct.thanhTien || 0),
              ngayTrenTem: ct.ngayTrenTem || '',
              tenKhachHangCap1: ct.tenKhachHangCap1 || '',
              loaiCa: ct.loaiCa || '',
              hinhAnh: ct.hinhAnh || '',
            }))
          : []
      } catch (err) {
        console.error('❌ [Detail API] Error parsing chi_tiet:', err)
      }
    }

    // Map status to Vietnamese
    const statusMap: Record<string, string> = {
      'Kết thúc': 'Đã duyệt',
      'Đang thực hiện': 'Chờ duyệt',
      'Chờ giao hàng': 'Chờ duyệt',
      'Hủy': 'Từ chối'
    }

    // Build response
    const response = {
      id: row.ma_chuyen_di,
      maChuyenDi: row.ma_chuyen_di,
      ngayTao: row.ngay_tao instanceof Date
        ? row.ngay_tao.toISOString().split('T')[0]
        : String(row.ngay_tao).split('T')[0],
      tenKhachHang: row.ten_khach_hang || '',
      loaiChuyen: row.loai_chuyen || '',
      loaiTuyen: row.loai_tuyen || '',
      tenTuyen: row.ten_tuyen || '',
      tenTaiXe: row.ten_tai_xe || '',
      donViVanChuyen: row.don_vi_van_chuyen || '',
      trangThai: statusMap[row.trang_thai_chuyen_di] || row.trang_thai_chuyen_di,
      tongQuangDuong: parseFloat(String(row.so_km_theo_odo || 0)),
      tongDoanhThu: parseFloat(String(row.doanh_thu || 0)),
      tongChiPhi: 0, // Not available in current schema
      chiTietLoTrinh: chiTietLoTrinh,
    }

    const elapsed = Date.now() - startTime
    console.log(`✅ [Detail API] Request completed in ${elapsed}ms`)

    return NextResponse.json(response, {
      headers: {
        'X-Response-Time': `${elapsed}ms`,
        'Cache-Control': 'private, max-age=600', // Cache 10 minutes
      },
    })
  } catch (error) {
    const elapsed = Date.now() - startTime
    console.error('❌ [Detail API] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch trip details',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 500,
        headers: {
          'X-Response-Time': `${elapsed}ms`,
        },
      }
    )
  }
}
