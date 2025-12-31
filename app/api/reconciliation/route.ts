import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'
import type {
  ReconciliationDatabaseRow,
  ReconciliationDetails,
  ReconciliationRecord,
  ChiTietLoTrinh,
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

    // Parse and validate limit (increase default to 500 for better UX)
    const limit = Math.min(
      Math.max(1, parseInt(limitParam || '500')),
      5000 // Increase max to 5000
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

    // Build WHERE clause dynamically
    const conditions: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (fromDate) {
      conditions.push(`date >= $${paramIndex}`)
      params.push(fromDate)
      paramIndex++
    }

    if (toDate) {
      conditions.push(`date <= $${paramIndex}`)
      params.push(toDate)
      paramIndex++
    }

    if (khachHang) {
      conditions.push(`customer ILIKE $${paramIndex}`)
      params.push(`%${khachHang}%`)
      paramIndex++
    }

    if (status) {
      conditions.push(`status = $${paramIndex}`)
      params.push(status)
      paramIndex++
    }

    if (donViVanChuyen) {
      conditions.push(`provider = $${paramIndex}`)
      params.push(donViVanChuyen)
      paramIndex++
    }

    if (loaiChuyen) {
      conditions.push(`trip_type = $${paramIndex}`)
      params.push(loaiChuyen)
      paramIndex++
    }

    if (loaiTuyen) {
      conditions.push(`route_type = $${paramIndex}`)
      params.push(loaiTuyen)
      paramIndex++
    }

    // Search by order_id only (exact match or contains)
    if (orderId) {
      conditions.push(`order_id ILIKE $${paramIndex}`)
      params.push(`%${orderId}%`)
      paramIndex++
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : ''

    // Add limit as the last parameter
    params.push(limit)
    const limitClause = `LIMIT $${paramIndex}`

    // Construct the SQL query
    const query = `
      SELECT
        id,
        order_id,
        date,
        route_name,
        customer,
        weight,
        revenue,
        cost,
        status,
        trip_type,
        route_type,
        driver_name,
        provider,
        total_distance,
        details,
        created_at
      FROM reconciliation_orders
      ${whereClause}
      ORDER BY date DESC, created_at DESC
      ${limitClause}
    `

    console.log('📊 [Postgres API] Executing query:', query)
    console.log('📊 [Postgres API] Query params:', params)

    // Execute the query
    const result = await sql.query(query, params)

    console.log('✅ [Postgres API] Query successful')
    console.log('📊 [Postgres API] Rows returned:', result.rows.length)

    // Map database rows to frontend structure
    const records: ReconciliationRecord[] = result.rows.map((row: ReconciliationDatabaseRow) => {
      // Parse JSONB details if available
      let chiTietLoTrinh: ChiTietLoTrinh[] = []
      let dataJson = ''

      if (row.details) {
        try {
          // Handle JSONB (can be object or string depending on driver)
          const details: ReconciliationDetails = typeof row.details === 'string'
            ? JSON.parse(row.details)
            : row.details

          // Extract chiTietLoTrinh array
          if (details.chiTietLoTrinh && Array.isArray(details.chiTietLoTrinh)) {
            chiTietLoTrinh = details.chiTietLoTrinh
          }

          // Store raw JSON for TripDetailsDialog fallback
          dataJson = JSON.stringify(details)
        } catch (err) {
          console.error('❌ [Postgres API] Error parsing details JSONB:', err)
          console.error('❌ [Postgres API] Row ID:', row.id)
          console.error('❌ [Postgres API] Details value:', row.details)
        }
      }

      return {
        id: row.id.toString(),
        maChuyenDi: row.order_id,
        ngayTao: row.date instanceof Date ? row.date.toISOString().split('T')[0] : String(row.date).split('T')[0],
        tenKhachHang: row.customer || '',
        loaiChuyen: row.trip_type || '',
        loaiTuyen: row.route_type || '',
        tenTuyen: row.route_name || '',
        tenTaiXe: row.driver_name || '',
        donViVanChuyen: row.provider || '',
        trangThai: mapStatus(row.status),
        tongQuangDuong: parseFloat(String(row.total_distance || 0)),
        tongDoanhThu: parseFloat(String(row.revenue || 0)),
        tongChiPhi: parseFloat(String(row.cost || 0)),
        soXe: '',  // Removed: license_plate column dropped from DB
        chiTietLoTrinh: chiTietLoTrinh,
        data_json: dataJson,
      }
    })

    // IMPORTANT: Calculate summary from ALL matching records, not just limited ones
    // Execute separate query for accurate summary statistics
    const summaryQuery = `
      SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(revenue), 0) as total_amount,
        COALESCE(SUM(total_distance), 0) as total_distance,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders
      FROM reconciliation_orders
      ${whereClause}
    `

    console.log('📊 [Postgres API] Executing summary query...')
    const summaryResult = await sql.query(summaryQuery, params.slice(0, -1)) // Remove limit param
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
        errorMessage = 'Bảng reconciliation_orders không tồn tại. Vui lòng chạy migration.'
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
