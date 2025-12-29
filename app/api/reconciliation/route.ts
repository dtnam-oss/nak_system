import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getReconciliationData } from '@/lib/services/gas-api'
import type { ReconciliationFilters } from '@/types/reconciliation'

// Use Node.js runtime instead of Edge for longer timeout (60s vs 10s on Vercel Hobby)
export const runtime = 'nodejs'
// Increased max duration to 60 seconds (Vercel Hobby limit for Node.js)
export const maxDuration = 60

/**
 * GET /api/reconciliation
 * Cached for 60 seconds to prevent rate limits
 * Query params:
 * - fromDate (optional): YYYY-MM-DD
 * - toDate (optional): YYYY-MM-DD
 * - khachHang (optional): Customer name
 * - donViVanChuyen (optional): NAK/VENDOR
 * - loaiTuyen (optional): Route type
 * - loaiChuyen (optional): Trip type
 * - searchQuery (optional): Search text
 * - page (optional): Page number
 * - limit (optional): Items per page
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log('🚀 [API Route] Request started')

    const searchParams = request.nextUrl.searchParams
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')
    const khachHang = searchParams.get('khachHang')
    const donViVanChuyen = searchParams.get('donViVanChuyen')
    const loaiTuyen = searchParams.get('loaiTuyen')
    const loaiChuyen = searchParams.get('loaiChuyen')
    const searchQuery = searchParams.get('searchQuery')

    // Build filters object
    const filters: ReconciliationFilters = {}
    if (fromDate) filters.fromDate = fromDate
    if (toDate) filters.toDate = toDate
    if (khachHang) filters.khachHang = khachHang
    if (donViVanChuyen) filters.donViVanChuyen = donViVanChuyen
    if (loaiTuyen) filters.loaiTuyen = loaiTuyen
    if (loaiChuyen) filters.loaiChuyen = loaiChuyen
    if (searchQuery) filters.searchQuery = searchQuery

    console.log('🔍 [API Route] Filters:', filters)

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

    // Add timeout protection with race condition
    const TIMEOUT_MS = 55000 // 55 seconds (leave 5s buffer for Vercel's 60s limit)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('REQUEST_TIMEOUT'))
      }, TIMEOUT_MS)
    })

    let result
    try {
      result = await Promise.race([
        getCachedData(),
        timeoutPromise
      ])
    } catch (error) {
      // Check if it's our custom timeout
      if (error instanceof Error && error.message === 'REQUEST_TIMEOUT') {
        const elapsed = Date.now() - startTime
        console.error(`⏱️ [API Route] Request timeout after ${elapsed}ms`)
        return NextResponse.json(
          {
            error: 'Yêu cầu xử lý dữ liệu quá lâu (timeout). Vui lòng thử lại với bộ lọc để giảm lượng dữ liệu hoặc thử lại sau.',
            type: 'TIMEOUT',
            elapsed: elapsed
          },
          { status: 504 } // 504 Gateway Timeout
        )
      }
      throw error // Re-throw other errors
    }

    const elapsed = Date.now() - startTime
    console.log(`✅ [API Route] Request completed in ${elapsed}ms`)

    // Type assertion after Promise.race
    const typedResult = result as Awaited<ReturnType<typeof getCachedData>>

    if (!typedResult.success) {
      console.error('❌ [API Route] Backend returned error:', typedResult.error)
      return NextResponse.json(
        {
          error: typedResult.error || 'Không thể lấy dữ liệu từ Google Apps Script',
          type: 'BACKEND_ERROR'
        },
        { status: 500 }
      )
    }

    return NextResponse.json(typedResult.data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        'X-Response-Time': `${elapsed}ms`
      },
    })
  } catch (error) {
    const elapsed = Date.now() - startTime
    console.error('❌ [API Route] Unhandled error:', error)

    // Determine error type and message
    let errorMessage = 'Lỗi server không xác định'
    let errorType = 'SERVER_ERROR'
    let statusCode = 500

    if (error instanceof Error) {
      console.error('❌ [API Route] Error name:', error.name)
      console.error('❌ [API Route] Error message:', error.message)
      console.error('❌ [API Route] Error stack:', error.stack)

      // Check for specific error types
      if (error.name === 'AbortError') {
        errorMessage = 'Yêu cầu bị hủy (AbortError). Vui lòng thử lại.'
        errorType = 'ABORT_ERROR'
        statusCode = 499 // Client Closed Request
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Hết thời gian chờ kết nối. Vui lòng thử lại sau.'
        errorType = 'TIMEOUT'
        statusCode = 504
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Không thể kết nối đến Google Apps Script. Vui lòng kiểm tra kết nối mạng.'
        errorType = 'NETWORK_ERROR'
        statusCode = 503 // Service Unavailable
      } else {
        errorMessage = error.message
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        type: errorType,
        elapsed: elapsed
      },
      { status: statusCode }
    )
  }
}
