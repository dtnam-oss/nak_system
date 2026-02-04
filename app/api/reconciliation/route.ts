import { sql, query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import type {
  ReconciliationRecord,
} from '@/types/reconciliation'

// Force dynamic rendering to avoid stale cached data
export const dynamic = 'force-dynamic'

/**
 * GET /api/reconciliation
 *
 * Fetches reconciliation orders from Vercel Postgres database
 *
 * Query Parameters:
 * - limit (optional): Number of records to return (default: 100, max: 1000)
 * - fromDate (optional): Filter by date >= YYYY-MM-DD
 * - toDate (optional): Filter by date <= YYYY-MM-DD
 * - khachHang (optional): Filter by customer name (case-insensitive partial match)
 * - donViVanChuyen (optional): Filter by provider (NAK/VENDOR/OTHER)
 * - loaiChuyen (optional): Filter by trip type (Một chiều/Hai chiều/Nhiều điểm)
 * - loaiTuyen (optional): Filter by route type (Nội thành/Liên tỉnh/Đường dài)
 * - searchQuery (optional): Search across order_id, customer, license_plate, route_name, driver_name
 * - status (optional): Filter by status (approved/pending/rejected)
 *
 * Response Format:
 * {
 *   "records": [ ...array of ReconciliationRecord objects with full fields... ],
 *   "summary": {
 *     "totalOrders": number,
 *     "totalAmount": number,
 *     "totalDistance": number,
 *     "approvedOrders": number,
 *     "pendingOrders": number
 *   },
 *   "total": number,
 *   "count": number
 * }
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log('🚀 [Postgres API] Request started')

    // Extract query parameters
    const searchParams = request.nextUrl.searchParams
    const limitParam = searchParams.get('limit')
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')
    const khachHang = searchParams.get('khachHang')
    const orderId = searchParams.get('orderId') // New: search by order_id only
    const status = searchParams.get('status')
    const donViVanChuyen = searchParams.get('donViVanChuyen')
    const loaiChuyen = searchParams.get('loaiChuyen')
    const loaiTuyen = searchParams.get('loaiTuyen')

    // Parse and validate limit (default: 100 for performance)
    const limit = Math.min(
      Math.max(1, parseInt(limitParam || '100')),
      500 // Max 500 for performance
    )

    console.log('🔍 [Postgres API] Query params:', {
      limit,
      fromDate,
      toDate,
      khachHang,
      orderId,
      status,
      donViVanChuyen,
      loaiChuyen,
      loaiTuyen
    })

    // Build WHERE clause dynamically using NEW schema column names
    const conditions: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (fromDate) {
      conditions.push(`cd.ngay_tao::date >= $${paramIndex}::date`)
      params.push(fromDate)
      paramIndex++
    }

    if (toDate) {
      conditions.push(`cd.ngay_tao::date <= $${paramIndex}::date`)
      params.push(toDate)
      paramIndex++
    }

    if (khachHang) {
      // Support multi-select: comma-separated values "J&T,GHN,VIETTEL"
      const customerList = khachHang.split(',').map(c => c.trim()).filter(Boolean)
      
      if (customerList.length === 1) {
        // Single customer: use ILIKE for partial match
        conditions.push(`cd.ten_khach_hang ILIKE $${paramIndex}`)
        params.push(`%${customerList[0]}%`)
        paramIndex++
      } else if (customerList.length > 1) {
        // Multiple customers: use ANY with array
        conditions.push(`cd.ten_khach_hang = ANY($${paramIndex})`)
        params.push(customerList)
        paramIndex++
      }
    }

    if (status) {
      // Map status to Vietnamese status in database
      const statusMap: Record<string, string[]> = {
        'approved': ['Kết thúc'],
        'pending': ['Đang thực hiện', 'Chờ giao hàng'],
        'rejected': ['Hủy']
      }
      const dbStatuses = statusMap[status] || [status]
      conditions.push(`cd.trang_thai_chuyen_di = ANY($${paramIndex})`)
      params.push(dbStatuses)
      paramIndex++
    }

    if (donViVanChuyen) {
      conditions.push(`cd.don_vi_van_chuyen = $${paramIndex}`)
      params.push(donViVanChuyen)
      paramIndex++
    }

    if (loaiChuyen) {
      conditions.push(`cd.loai_chuyen = $${paramIndex}`)
      params.push(loaiChuyen)
      paramIndex++
    }

    if (loaiTuyen) {
      conditions.push(`cd.loai_tuyen = $${paramIndex}`)
      params.push(loaiTuyen)
      paramIndex++
    }

    // Search by order_id or customer order code (ma_chuyen_di OR ma_chuyen_di_kh)
    if (orderId) {
      conditions.push(`(
        cd.ma_chuyen_di ILIKE $${paramIndex} OR
        EXISTS (
          SELECT 1 FROM chi_tiet_chuyen_di ct_search
          WHERE ct_search.ma_chuyen_di = cd.ma_chuyen_di
          AND ct_search.ma_chuyen_di_kh ILIKE $${paramIndex}
        )
      )`)
      params.push(`%${orderId}%`)
      paramIndex++
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : ''

    // Add limit as the last parameter
    params.push(limit)
    const limitClause = `LIMIT $${paramIndex}`

    // OPTIMIZED: Query without chi_tiet aggregation for faster performance
    // Chi tiết will be loaded lazily when user opens detail popup
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
          WHEN cd.doanh_thu::TEXT !~ '^-?[0-9]*\.?[0-9]+$' THEN NULL
          ELSE cd.doanh_thu::NUMERIC
        END as doanh_thu,
        CASE
          WHEN cd.so_km_theo_odo::TEXT IS NULL OR cd.so_km_theo_odo::TEXT = '' THEN NULL
          WHEN cd.so_km_theo_odo::TEXT !~ '^-?[0-9]*\.?[0-9]+$' THEN NULL
          ELSE cd.so_km_theo_odo::NUMERIC
        END as so_km_theo_odo,
        cd.thoi_gian_tao,
        -- Count chi tiet instead of loading all data
        (SELECT COUNT(*) FROM chi_tiet_chuyen_di ct
         WHERE ct.ma_chuyen_di = cd.ma_chuyen_di) as so_diem_dung
      FROM chuyen_di cd
      ${whereClause}
      ORDER BY cd.ngay_tao DESC, cd.thoi_gian_tao DESC
      ${limitClause}
    `

    console.log('📊 [Postgres API] Executing query:', sqlQuery)
    console.log('📊 [Postgres API] Query params:', params)

    // Execute the query
    const result = await query(sqlQuery, params)

    console.log('✅ [Postgres API] Query successful')
    console.log('📊 [Postgres API] Rows returned:', result.rows.length)

    // Map database rows to frontend structure (OPTIMIZED - no chi_tiet parsing)
    const records: ReconciliationRecord[] = result.rows.map((row: any) => {
      // Map Vietnamese status to English
      const statusMap: Record<string, string> = {
        'Kết thúc': 'approved',
        'Đang thực hiện': 'pending',
        'Chờ giao hàng': 'pending',
        'Hủy': 'rejected'
      }
      const status = statusMap[row.trang_thai_chuyen_di] || 'pending'

      return {
        id: row.ma_chuyen_di,
        maChuyenDi: row.ma_chuyen_di,
        ngayTao: row.ngay_tao instanceof Date ? row.ngay_tao.toISOString().split('T')[0] : String(row.ngay_tao).split('T')[0],
        tenKhachHang: row.ten_khach_hang || '',
        loaiChuyen: row.loai_chuyen || '',
        loaiTuyen: row.loai_tuyen || '',
        tenTuyen: row.ten_tuyen || '',
        tenTaiXe: row.ten_tai_xe || '',
        donViVanChuyen: row.don_vi_van_chuyen || '',
        trangThai: mapStatus(status),
        tongQuangDuong: parseFloat(String(row.so_km_theo_odo || 0)),
        tongDoanhThu: parseFloat(String(row.doanh_thu || 0)),
        tongChiPhi: 0, // Not available in current schema
        soDiemDung: parseInt(String(row.so_diem_dung || 0)), // Count of chi tiet records
        // Remove chiTietLoTrinh and data_json - will be loaded lazily on demand
      }
    })

    // IMPORTANT: Calculate summary from ALL matching records, not just limited ones
    // Execute separate query for accurate summary statistics
    const summaryQuery = `
      SELECT
        COUNT(*) as total_orders,
        COALESCE(
          SUM(
            CASE 
              WHEN cd.doanh_thu::TEXT IS NULL OR cd.doanh_thu::TEXT = '' THEN 0
              WHEN cd.doanh_thu::TEXT !~ '^-?[0-9]*\.?[0-9]+$' THEN 0
              ELSE cd.doanh_thu::NUMERIC
            END
          ), 0
        ) as total_amount,
        COALESCE(
          SUM(
            CASE 
              WHEN cd.so_km_theo_odo::TEXT IS NULL OR cd.so_km_theo_odo::TEXT = '' THEN 0
              WHEN cd.so_km_theo_odo::TEXT !~ '^-?[0-9]*\.?[0-9]+$' THEN 0
              ELSE cd.so_km_theo_odo::NUMERIC
            END
          ), 0
        ) as total_distance,
        COUNT(CASE WHEN cd.trang_thai_chuyen_di = 'Kết thúc' THEN 1 END) as approved_orders,
        COUNT(CASE WHEN cd.trang_thai_chuyen_di IN ('Đang thực hiện', 'Chờ giao hàng') THEN 1 END) as pending_orders
      FROM chuyen_di cd
      ${whereClause}
    `

    console.log('📊 [Postgres API] Executing summary query...')
    const summaryResult = await query(summaryQuery, params.slice(0, -1)) // Remove limit param
    const summaryRow = summaryResult.rows[0]

    const summary = {
      totalOrders: parseInt(summaryRow.total_orders || '0'),
      totalAmount: parseFloat(summaryRow.total_amount || '0'),
      totalDistance: parseFloat(summaryRow.total_distance || '0'),
      approvedOrders: parseInt(summaryRow.approved_orders || '0'),
      pendingOrders: parseInt(summaryRow.pending_orders || '0'),
    }

    console.log('📊 [Postgres API] Summary calculated:', summary)

    console.log('📊 [Postgres API] Summary calculated:', summary)

    const elapsed = Date.now() - startTime
    console.log(`✅ [Postgres API] Request completed in ${elapsed}ms`)
    console.log(`📊 [Postgres API] Records returned: ${records.length} / Total matching: ${summary.totalOrders}`)

    return NextResponse.json(
      {
        records,
        summary,
        total: summary.totalOrders, // Total matching records (not limited)
        count: records.length, // Records returned in this page
      },
      {
        headers: {
          'X-Response-Time': `${elapsed}ms`,
          'Cache-Control': 'no-store, must-revalidate',
        },
      }
    )
  } catch (error) {
    const elapsed = Date.now() - startTime
    console.error('❌ [Postgres API] Database error:', error)

    // Determine error type and message
    let errorMessage = 'Lỗi kết nối database'
    let statusCode = 500

    if (error instanceof Error) {
      console.error('❌ [Postgres API] Error name:', error.name)
      console.error('❌ [Postgres API] Error message:', error.message)
      console.error('❌ [Postgres API] Error stack:', error.stack)

      if (error.message.includes('connect')) {
        errorMessage = 'Không thể kết nối đến database. Vui lòng kiểm tra cấu hình POSTGRES_URL.'
        statusCode = 503 // Service Unavailable
      } else if (error.message.includes('relation') || error.message.includes('table')) {
        errorMessage = 'Bảng chuyen_di hoặc chi_tiet_chuyen_di không tồn tại. Vui lòng kiểm tra database.'
        statusCode = 500
      } else if (error.message.includes('syntax')) {
        errorMessage = 'Lỗi cú pháp SQL. Vui lòng liên hệ admin.'
        statusCode = 500
      } else {
        errorMessage = `Lỗi database: ${error.message}`
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        type: 'DATABASE_ERROR',
        elapsed: elapsed,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: statusCode,
        headers: {
          'X-Response-Time': `${elapsed}ms`,
        },
      }
    )
  }
}

/**
 * Helper: Format date to Vietnamese format
 */
function formatDate(date: Date | string): string {
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return String(date)

    // Format: DD/MM/YYYY
    const day = d.getDate().toString().padStart(2, '0')
    const month = (d.getMonth() + 1).toString().padStart(2, '0')
    const year = d.getFullYear()

    return `${day}/${month}/${year}`
  } catch {
    return String(date)
  }
}

/**
 * Helper: Map database status to Vietnamese display text
 */
function mapStatus(status: string): string {
  const statusMap: Record<string, string> = {
    approved: 'Đã duyệt',
    pending: 'Chờ duyệt',
    rejected: 'Từ chối',
  }

  return statusMap[status] || status
}
