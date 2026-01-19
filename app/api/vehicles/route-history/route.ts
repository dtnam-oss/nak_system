import { sql } from '@vercel/postgres'
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

        console.log(`🔍 Fetching route history for ${licensePlate} from ${startDate} to ${endDate}`)

        // Query reconciliation_orders for trips matching the license plate
        // Using JSONB operator to find trips where the first step of the route used this vehicle
        const result = await sql`
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
        (
          details->'chiTietLoTrinh'->0->>'bienKiemSoat' = ${licensePlate}
          OR details->'chiTietLoTrinh'->1->>'bienKiemSoat' = ${licensePlate}
          OR details->'chiTietLoTrinh'->2->>'bienKiemSoat' = ${licensePlate}
        )
        AND date >= ${startDate}
        AND date <= ${endDate}
      ORDER BY date DESC, order_id DESC
    `

        return NextResponse.json({
            success: true,
            licensePlate,
            startDate,
            endDate,
            count: result.rows.length,
            records: result.rows
        })

    } catch (error: any) {
        console.error('❌ Error fetching route history:', error)
        return NextResponse.json({
            error: 'Backend error',
            message: error.message
        }, { status: 500 })
    }
}
