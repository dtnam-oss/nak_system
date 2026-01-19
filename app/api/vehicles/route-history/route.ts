import { neon } from '@neondatabase/serverless'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const sql = neon(process.env.DATABASE_URL!)

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

    // Query reconciliation_orders for trips matching the license plate
    // Using a robust JSONB search to find the license plate anywhere in the chiTietLoTrinh array
    const records = await sql`
      SELECT 
        order_id as "maChuyenDi",
        date as "ngay",
        customer as "tenKhachHang",
        route_name as "tenTuyen",
        total_distance as "quangDuong",
        revenue as "doanhThu",
        details->'chiTietLoTrinh' as "chiTiet"
      FROM reconciliation_orders
      WHERE 
        EXISTS (
          SELECT 1 FROM jsonb_array_elements(details->'chiTietLoTrinh') elem
          WHERE elem->>'bienKiemSoat' = ${cleanLicensePlate}
        )
        AND date >= ${startDate}
        AND date <= ${endDate}
      ORDER BY date DESC, order_id DESC
    `

    return NextResponse.json({
      success: true,
      licensePlate: cleanLicensePlate,
      startDate,
      endDate,
      count: records.length,
      records: records
    })

  } catch (error: any) {
    console.error('❌ Error fetching route history:', error)
    return NextResponse.json({
      error: 'Backend error',
      message: error.message || 'Unknown database error'
    }, { status: 500 })
  }
}
