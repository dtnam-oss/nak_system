/**
 * Google Apps Script - Import to Vercel Postgres
 *
 * This script fetches data from Google Sheets and sends it to
 * the Vercel Postgres bulk import API.
 *
 * Setup:
 * 1. Update VERCEL_API_URL with your deployment URL
 * 2. Update MIGRATION_SECRET to match .env.local
 * 3. Run importAllData() function
 */

// Configuration
const VERCEL_API_URL = 'https://your-app.vercel.app/api/seed/import'
const MIGRATION_SECRET = 'migration-2025-secure' // Must match .env.local

// Spreadsheet configuration
const SPREADSHEET_ID = '18pS9YMZSwZCVBt_anIGn3GN4qFoPpMtALQm4YvMDd-g'
const SHEET_NAME = 'data_chuyen_di'

/**
 * Main function to import all data
 * Run this function from Apps Script editor
 */
function importAllData() {
  try {
    Logger.log('🚀 Starting data import to Vercel Postgres...')

    // Fetch data from sheet
    const records = fetchRecordsFromSheet()

    if (records.length === 0) {
      Logger.log('⚠️ No records to import')
      return
    }

    Logger.log(`📊 Found ${records.length} records`)

    // Send data to Vercel API in batches
    const BATCH_SIZE = 100
    const batches = []

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      batches.push(records.slice(i, i + BATCH_SIZE))
    }

    Logger.log(`📦 Split into ${batches.length} batches`)

    let totalSuccess = 0
    let totalFailed = 0

    // Process each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      Logger.log(`🔄 Processing batch ${i + 1}/${batches.length} (${batch.length} records)...`)

      const result = sendBatchToAPI(batch)

      if (result) {
        totalSuccess += result.success
        totalFailed += result.failed
        Logger.log(`✅ Batch ${i + 1} completed: ${result.success} success, ${result.failed} failed`)

        // Log errors if any
        if (result.errors && result.errors.length > 0) {
          Logger.log(`❌ Errors in batch ${i + 1}:`)
          result.errors.forEach(err => {
            Logger.log(`  - ${err.order_id}: ${err.error}`)
          })
        }
      } else {
        totalFailed += batch.length
        Logger.log(`❌ Batch ${i + 1} failed completely`)
      }

      // Small delay between batches to avoid rate limits
      if (i < batches.length - 1) {
        Utilities.sleep(1000) // 1 second delay
      }
    }

    Logger.log('✅ Import completed!')
    Logger.log(`📊 Summary: ${totalSuccess} success, ${totalFailed} failed`)

  } catch (error) {
    Logger.log('❌ Fatal error: ' + error.message)
    Logger.log(error.stack)
  }
}

/**
 * Fetch records from Google Sheet
 */
function fetchRecordsFromSheet() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME)

    if (!sheet) {
      throw new Error(`Sheet "${SHEET_NAME}" not found`)
    }

    const data = sheet.getDataRange().getValues()
    const headers = data[0]

    // Build column index map
    const colMap = {}
    headers.forEach((header, index) => {
      colMap[header.toString().toLowerCase()] = index
    })

    Logger.log('📋 Column mapping:', colMap)

    // Parse records
    const records = []

    for (let i = 1; i < data.length; i++) {
      const row = data[i]

      // Skip empty rows
      if (!row[colMap['ma_chuyen_di']] && !row[colMap['machuyendi']]) {
        continue
      }

      const record = {
        maChuyenDi: row[colMap['ma_chuyen_di']] || row[colMap['machuyendi']] || '',
        ngayTao: formatDate(row[colMap['ngay_tao']] || row[colMap['ngaytao']] || ''),
        tenKhachHang: row[colMap['ten_khach_hang']] || row[colMap['tenkhachhang']] || '',
        loaiChuyen: row[colMap['loai_chuyen']] || row[colMap['loaichuyen']] || '',
        loaiTuyen: row[colMap['loai_tuyen']] || row[colMap['loaituyen']] || '',
        tenTuyen: row[colMap['ten_tuyen']] || row[colMap['tentuyen']] || '',
        tenTaiXe: row[colMap['ten_tai_xe']] || row[colMap['tentaixe']] || '',
        donViVanChuyen: row[colMap['don_vi_van_chuyen']] || row[colMap['donvivanchuyen']] || '',
        tongQuangDuong: parseFloat(row[colMap['tong_quang_duong']] || row[colMap['tongquangduong']] || 0),
        tongDoanhThu: parseFloat(row[colMap['tong_doanh_thu']] || row[colMap['tongdoanhthu']] || 0),
        trangThai: row[colMap['trang_thai']] || row[colMap['trangthai']] || 'pending',
        data_json: row[colMap['data_json']] || row[colMap['datajson']] || ''
      }

      records.push(record)
    }

    Logger.log(`✅ Parsed ${records.length} records`)

    return records

  } catch (error) {
    Logger.log('❌ Error fetching records: ' + error.message)
    throw error
  }
}

/**
 * Send batch of records to Vercel API
 */
function sendBatchToAPI(records) {
  try {
    const options = {
      method: 'POST',
      contentType: 'application/json',
      headers: {
        'x-migration-secret': MIGRATION_SECRET
      },
      payload: JSON.stringify({
        records: records
      }),
      muteHttpExceptions: true
    }

    const response = UrlFetchApp.fetch(VERCEL_API_URL, options)
    const statusCode = response.getResponseCode()
    const responseText = response.getContentText()

    if (statusCode === 200) {
      const result = JSON.parse(responseText)
      return result
    } else {
      Logger.log(`❌ API returned status ${statusCode}`)
      Logger.log(`❌ Response: ${responseText}`)
      return null
    }

  } catch (error) {
    Logger.log('❌ Error sending to API: ' + error.message)
    return null
  }
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(date) {
  if (!date) return new Date().toISOString().split('T')[0]

  try {
    if (date instanceof Date) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    // If string, return as-is (assume correct format)
    return date.toString()
  } catch (err) {
    return new Date().toISOString().split('T')[0]
  }
}

/**
 * Test function - import first 10 records only
 */
function testImport() {
  try {
    Logger.log('🧪 Running test import (10 records)...')

    const allRecords = fetchRecordsFromSheet()
    const testRecords = allRecords.slice(0, 10)

    Logger.log(`📊 Testing with ${testRecords.length} records`)

    const result = sendBatchToAPI(testRecords)

    if (result) {
      Logger.log(`✅ Test completed: ${result.success} success, ${result.failed} failed`)
      if (result.errors && result.errors.length > 0) {
        Logger.log('❌ Errors:')
        result.errors.forEach(err => {
          Logger.log(`  - ${err.order_id}: ${err.error}`)
        })
      }
    } else {
      Logger.log('❌ Test failed')
    }

  } catch (error) {
    Logger.log('❌ Test error: ' + error.message)
  }
}

/**
 * Verify API connection (no data sent)
 */
function verifyAPIConnection() {
  try {
    Logger.log('🔍 Verifying API connection...')
    Logger.log('URL: ' + VERCEL_API_URL)
    Logger.log('Secret: ' + MIGRATION_SECRET.substring(0, 10) + '...')

    // Send empty request to check auth
    const options = {
      method: 'POST',
      contentType: 'application/json',
      headers: {
        'x-migration-secret': MIGRATION_SECRET
      },
      payload: JSON.stringify({ records: [] }),
      muteHttpExceptions: true
    }

    const response = UrlFetchApp.fetch(VERCEL_API_URL, options)
    const statusCode = response.getResponseCode()
    const responseText = response.getContentText()

    Logger.log(`Status: ${statusCode}`)
    Logger.log(`Response: ${responseText}`)

    if (statusCode === 200 || statusCode === 400) {
      Logger.log('✅ API connection verified (auth successful)')
    } else if (statusCode === 401) {
      Logger.log('❌ Authentication failed - check MIGRATION_SECRET')
    } else {
      Logger.log(`⚠️ Unexpected status: ${statusCode}`)
    }

  } catch (error) {
    Logger.log('❌ Connection error: ' + error.message)
  }
}
