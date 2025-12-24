import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getReconciliationData } from '@/lib/services/gas-api'
import type { ReconciliationFilters } from '@/types/reconciliation'

export const runtime = 'edge'
// Removed force-dynamic to enable caching

/**
 * GET /api/reconciliation
 * Cached for 60 seconds to prevent rate limits
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

    // Create cache key based on filters
    const cacheKey = JSON.stringify(filters)
    
    // Fetch from Google Apps Script with caching
    const getCachedData = unstable_cache(
      async () => {
        return await getReconciliationData(
          Object.keys(filters).length > 0 ? filters : undefined
        )
      },
      [`reconciliation-${cacheKey}`],
      {
        revalidate: 60, // Cache for 60 seconds
        tags: ['reconciliation'],
      }
    )

    const result = await getCachedData()

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch reconciliation data' },
        { status: 500 }
      )
    }

    return NextResponse.json(result.data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
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
