/**
 * Google Apps Script API Service
 * Handles communication with GAS backend
 */

import type {
  DashboardReportResponse,
  DashboardReportWithFiltersResponse,
  DashboardFilters,
} from '@/types/dashboard'
import type {
  ReconciliationApiResponse,
  ReconciliationFilters,
} from '@/types/reconciliation'

const GAS_API_URL = process.env.NEXT_PUBLIC_GAS_API_URL || ''
const API_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000')

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = API_TIMEOUT
): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(id)
    return response
  } catch (error) {
    clearTimeout(id)
    throw error
  }
}

/**
 * Get dashboard report (no filters)
 */
export async function getDashboardReport(): Promise<DashboardReportResponse> {
  try {
    const url = `${GAS_API_URL}?action=getDashboardReport`

    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching dashboard report:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get dashboard report with filters
 */
export async function getDashboardReportWithFilters(
  filters: DashboardFilters
): Promise<DashboardReportWithFiltersResponse> {
  try {
    const filtersJson = encodeURIComponent(JSON.stringify(filters))
    const url = `${GAS_API_URL}?action=getDashboardReportWithFilters&filters=${filtersJson}`

    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching dashboard report with filters:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get reconciliation data with optional filters
 */
export async function getReconciliationData(
  filters?: ReconciliationFilters
): Promise<ReconciliationApiResponse> {
  try {
    let url = `${GAS_API_URL}?action=getReconciliationData`

    if (filters) {
      const filtersJson = encodeURIComponent(JSON.stringify(filters))
      url += `&filters=${filtersJson}`
    }

    console.log('🔍 [GAS API] Fetching reconciliation data...')
    console.log('🔍 [GAS API] URL:', url)
    console.log('🔍 [GAS API] Timeout:', API_TIMEOUT, 'ms')

    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    console.log('🔍 [GAS API] Response status:', response.status)
    console.log('🔍 [GAS API] Response ok:', response.ok)

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Could not read error response')
      console.error('❌ [GAS API] Error response:', errorText)
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    console.log('✅ [GAS API] Successfully received data')
    return data
  } catch (error) {
    console.error('❌ [GAS API] Error fetching reconciliation data:', error)
    if (error instanceof Error) {
      console.error('❌ [GAS API] Error name:', error.name)
      console.error('❌ [GAS API] Error message:', error.message)
      if (error.name === 'AbortError') {
        console.error('❌ [GAS API] Request TIMEOUT after', API_TIMEOUT, 'ms')
      }
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Health check
 */
export async function checkGASHealth(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(GAS_API_URL, {
      method: 'GET',
    })
    return response.ok
  } catch (error) {
    console.error('GAS health check failed:', error)
    return false
  }
}
