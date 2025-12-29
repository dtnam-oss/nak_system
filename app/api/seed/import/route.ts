import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'

// Security: Migration secret key
const MIGRATION_SECRET = process.env.MIGRATION_SECRET || 'migration-2025-secure'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Interface for incoming record from Google Sheets
interface ImportRecord {
  maChuyenDi: string
  ngayTao: string
  tenKhachHang: string
  loaiChuyen?: string
  loaiTuyen?: string
  tenTuyen?: string
  tenTaiXe?: string
  donViVanChuyen?: string
  tongQuangDuong?: number
  tongDoanhThu?: number
  trangThai: string
  data_json?: string
}

// Interface for import result
interface ImportResult {
  success: number
  failed: number
  errors: Array<{
    order_id: string
    error: string
  }>
}

/**
 * POST /api/seed/import
 *
 * Bulk import historical data from Google Sheets to Postgres
 *
 * Security: Requires x-migration-secret header
 *
 * Body:
 * {
 *   "records": [ ...array of ImportRecord... ]
 * }
 *
 * Response:
 * {
 *   "success": number,
 *   "failed": number,
 *   "errors": [ ...array of error details... ]
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log('🔐 [Import API] Request received')

    // Security check: Validate migration secret
    const secret = request.headers.get('x-migration-secret')

    if (!secret || secret !== MIGRATION_SECRET) {
      console.error('❌ [Import API] Unauthorized: Invalid or missing secret')
      return NextResponse.json(
        {
          error: 'Unauthorized: Invalid migration secret',
          success: 0,
          failed: 0
        },
        { status: 401 }
      )
    }

    console.log('✅ [Import API] Secret validated')

    // Parse request body
    const body = await request.json()
    const records: ImportRecord[] = body.records || []

    if (!Array.isArray(records) || records.length === 0) {
      console.error('❌ [Import API] Invalid request: No records provided')
      return NextResponse.json(
        {
          error: 'Invalid request: records array is required',
          success: 0,
          failed: 0
        },
        { status: 400 }
      )
    }

    console.log(`📊 [Import API] Processing ${records.length} records...`)

    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: []
    }

    // Process records in batches for better performance
    const BATCH_SIZE = 50
    const batches = []

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      batches.push(records.slice(i, i + BATCH_SIZE))
    }

    console.log(`📦 [Import API] Split into ${batches.length} batches of ${BATCH_SIZE}`)

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      console.log(`🔄 [Import API] Processing batch ${batchIndex + 1}/${batches.length}...`)

      // Process batch records in parallel
      const batchResults = await Promise.allSettled(
        batch.map(record => importRecord(record))
      )

      // Count results
      batchResults.forEach((batchResult, index) => {
        if (batchResult.status === 'fulfilled' && batchResult.value.success) {
          result.success++
        } else {
          result.failed++
          const record = batch[index]
          result.errors.push({
            order_id: record.maChuyenDi,
            error: batchResult.status === 'rejected'
              ? batchResult.reason?.message || 'Unknown error'
              : batchResult.value.error || 'Import failed'
          })
        }
      })
    }

    const elapsed = Date.now() - startTime

    console.log('✅ [Import API] Import completed')
    console.log(`📊 [Import API] Success: ${result.success}, Failed: ${result.failed}`)
    console.log(`⏱️ [Import API] Elapsed: ${elapsed}ms`)

    return NextResponse.json(
      {
        ...result,
        total: records.length,
        elapsed: `${elapsed}ms`
      },
      { status: 200 }
    )

  } catch (error) {
    const elapsed = Date.now() - startTime
    console.error('❌ [Import API] Fatal error:', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        success: 0,
        failed: 0,
        elapsed: `${elapsed}ms`
      },
      { status: 500 }
    )
  }
}

/**
 * Import a single record into database
 */
async function importRecord(record: ImportRecord): Promise<{ success: boolean; error?: string }> {
  try {
    // Parse data_json if provided
    let details: any = null
    let license_plate = 'N/A'
    let weight = 0

    if (record.data_json) {
      try {
        details = JSON.parse(record.data_json)

        // Extract license_plate from details
        if (details.thongTinChuyenDi && details.thongTinChuyenDi.soXe) {
          license_plate = details.thongTinChuyenDi.soXe
        }

        // Calculate total weight from chiTietLoTrinh
        if (details.chiTietLoTrinh && Array.isArray(details.chiTietLoTrinh)) {
          weight = details.chiTietLoTrinh.reduce((sum: number, item: any) => {
            return sum + (parseFloat(item.taiTrong) || 0)
          }, 0)
        }
      } catch (err) {
        console.warn(`⚠️ [Import API] Failed to parse data_json for ${record.maChuyenDi}:`, err)
        // Continue with null details
      }
    }

    // Map status to database format
    const status = mapStatusToDatabase(record.trangThai)

    // Parse date (handle multiple formats)
    const date = parseDate(record.ngayTao)

    // Insert record with ON CONFLICT to avoid duplicates
    await sql`
      INSERT INTO reconciliation_orders (
        order_id,
        date,
        license_plate,
        customer,
        weight,
        cost,
        status,
        trip_type,
        route_type,
        route_name,
        driver_name,
        provider,
        total_distance,
        details
      )
      VALUES (
        ${record.maChuyenDi},
        ${date},
        ${license_plate},
        ${record.tenKhachHang || null},
        ${weight || null},
        ${record.tongDoanhThu || null},
        ${status},
        ${record.loaiChuyen || null},
        ${record.loaiTuyen || null},
        ${record.tenTuyen || null},
        ${record.tenTaiXe || null},
        ${record.donViVanChuyen || null},
        ${record.tongQuangDuong || null},
        ${details ? JSON.stringify(details) : null}
      )
      ON CONFLICT (order_id) DO NOTHING
    `

    return { success: true }
  } catch (error) {
    console.error(`❌ [Import API] Error importing ${record.maChuyenDi}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Import failed'
    }
  }
}

/**
 * Map Vietnamese status to database status
 */
function mapStatusToDatabase(status: string): string {
  const statusMap: Record<string, string> = {
    'Đã duyệt': 'approved',
    'approved': 'approved',
    'Chờ duyệt': 'pending',
    'pending': 'pending',
    'Từ chối': 'rejected',
    'rejected': 'rejected',
    'Đang xử lý': 'processing',
    'processing': 'processing'
  }

  return statusMap[status] || 'pending'
}

/**
 * Parse date from various formats
 * Supports: YYYY-MM-DD, DD/MM/YYYY, timestamp
 */
function parseDate(dateStr: string): string {
  try {
    // Try parsing as DD/MM/YYYY
    if (dateStr.includes('/')) {
      const [day, month, year] = dateStr.split('/')
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }

    // Try parsing as ISO date or timestamp
    const date = new Date(dateStr)
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    // Fallback: assume YYYY-MM-DD
    return dateStr
  } catch (err) {
    console.warn(`⚠️ [Import API] Failed to parse date: ${dateStr}`)
    return new Date().toISOString().split('T')[0]
  }
}
