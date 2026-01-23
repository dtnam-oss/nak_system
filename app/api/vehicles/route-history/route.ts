import { sql } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/vehicles/route-history
 * 
 * Fetches route history for a specific vehicle within a date range
 * 
 * Query Parameters:
 * - licensePlate: string (Required)
 * - startDate: string YYYY-MM-DD (Optional, defaults to 30 days ago)
 * - endDate: string YYYY-MM-DD (Optional, defaults to today)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const licensePlate = searchParams.get('licensePlate')
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]

    if (!licensePlate) {
      return NextResponse.json({ error: 'licensePlate is required' }, { status: 400 })
    }

    const cleanLicensePlate = licensePlate.trim().toUpperCase()
    console.log(`🔍 Fetching route history for ${cleanLicensePlate} from ${startDate} to ${endDate}`)

    // Query chuyen_di JOIN chi_tiet_chuyen_di for trips matching the license plate
    const result = await sql`
      SELECT DISTINCT
        cd.ma_chuyen_di as "maChuyenDi",
        cd.ngay_tao as "ngay",
        cd.ten_khach_hang as "tenKhachHang",
        cd.ten_tuyen as "tenTuyen",
        cd.so_km_theo_odo as "quangDuong",
        CAST(cd.doanh_thu AS NUMERIC) as "doanhThu",
        json_agg(
          json_build_object(
            'Id', ct."Id",
            'bienKiemSoat', ct.bien_kiem_soat,
            'loTrinh', ct.lo_trinh,
            'ketQua', ct.ket_qua
          )
        ) as "chiTiet"
      FROM chuyen_di cd
      INNER JOIN chi_tiet_chuyen_di ct ON cd.ma_chuyen_di = ct.ma_chuyen_di
      WHERE 
        ct.bien_kiem_soat = ${cleanLicensePlate}
        AND cd.ngay_tao::date >= ${startDate}::date
        AND cd.ngay_tao::date <= ${endDate}::date
      GROUP BY cd.ma_chuyen_di, cd.ngay_tao, cd.ten_khach_hang, cd.ten_tuyen, cd.so_km_theo_odo, cd.doanh_thu
      ORDER BY cd.ngay_tao DESC, cd.ma_chuyen_di DESC
    `

    return NextResponse.json({
      success: true,
      licensePlate: cleanLicensePlate,
      startDate,
      endDate,
      count: result.rows.length,
      records: result.rows
    })

  } catch (error: any) {
    console.error('❌ Error fetching route history:', error)
    return NextResponse.json({
      error: 'Backend error',
      message: error.message || 'Unknown database error'
    }, { status: 500 })
  }
}
