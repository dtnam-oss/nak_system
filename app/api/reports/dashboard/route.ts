import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import {
  getDashboardReport,
  getDashboardReportWithFilters,
} from '@/lib/services/gas-api'
import type { DashboardFilters } from '@/types/dashboard'

export const runtime = 'edge'
// Removed force-dynamic to enable caching

/**
 * GET /api/reports/dashboard
 * Cached for 60 seconds to prevent rate limits
 * Query params:
 * - fromDate (optional): YYYY-MM-DD
 * - toDate (optional): YYYY-MM-DD
 * - khachHang (optional): Customer name
 * - loaiTuyen (optional): Route type
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')
    const khachHang = searchParams.get('khachHang')
    const loaiTuyen = searchParams.get('loaiTuyen')

    // Check if any filters are provided
    const hasFilters = fromDate || toDate || khachHang || loaiTuyen

    if (hasFilters) {
      // Build filters object
      const filters: DashboardFilters = {}
      if (fromDate) filters.fromDate = fromDate
      if (toDate) filters.toDate = toDate
      if (khachHang) filters.khachHang = khachHang
      if (loaiTuyen) filters.loaiTuyen = loaiTuyen

      // Create cache key based on filters
      const cacheKey = JSON.stringify(filters)
      
      // Fetch with filters and caching
      const getCachedData = unstable_cache(
        async () => await getDashboardReportWithFilters(filters),
        [`dashboard-filtered-${cacheKey}`],
        {
          revalidate: 60, // Cache for 60 seconds
          tags: ['dashboard'],
        }
      )

      const result = await getCachedData()

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to fetch dashboard data' },
          { status: 500 }
        )
      }

      return NextResponse.json(result.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      })
    } else {
      // Fetch without filters with caching
      const getCachedData = unstable_cache(
        async () => await getDashboardReport(),
        ['dashboard-default'],
        {
          revalidate: 60, // Cache for 60 seconds
          tags: ['dashboard'],
        }
      )

      const result = await getCachedData()

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to fetch dashboard data' },
          { status: 500 }
        )
      }

      return NextResponse.json(result.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      })
    }
  } catch (error) {
    console.error('API route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
