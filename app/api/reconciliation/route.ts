import { NextRequest, NextResponse } from 'next/server'
import { getReconciliationData } from '@/lib/services/gas-api'
import type { ReconciliationFilters } from '@/types/reconciliation'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

/**
 * GET /api/reconciliation
 * Query params:
 * - fromDate (optional): YYYY-MM-DD
 * - toDate (optional): YYYY-MM-DD
 * - khachHang (optional): Customer name
 * - donViVanChuyen (optional): NAK/VENDOR
 * - loaiTuyen (optional): Route type
 * - trangThai (optional): Status
 * - searchQuery (optional): Search text
 * - page (optional): Page number
 * - limit (optional): Items per page
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')
    const khachHang = searchParams.get('khachHang')
    const donViVanChuyen = searchParams.get('donViVanChuyen')
    const loaiTuyen = searchParams.get('loaiTuyen')
    const trangThai = searchParams.get('trangThai')
    const searchQuery = searchParams.get('searchQuery')

    // Build filters object
    const filters: ReconciliationFilters = {}
    if (fromDate) filters.fromDate = fromDate
    if (toDate) filters.toDate = toDate
    if (khachHang) filters.khachHang = khachHang
    if (donViVanChuyen) filters.donViVanChuyen = donViVanChuyen
    if (loaiTuyen) filters.loaiTuyen = loaiTuyen
    if (trangThai) filters.trangThai = trangThai
    if (searchQuery) filters.searchQuery = searchQuery

    // Fetch from Google Apps Script
    const result = await getReconciliationData(
      Object.keys(filters).length > 0 ? filters : undefined
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch reconciliation data' },
        { status: 500 }
      )
    }

    return NextResponse.json(result.data, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    console.error('API route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
