'use client'

import { useQuery } from '@tanstack/react-query'
import type {
  ReconciliationFilters,
  ReconciliationRecord,
  ReconciliationSummary,
} from '@/types/reconciliation'

interface UseReconciliationDataOptions {
  filters?: ReconciliationFilters
  enabled?: boolean
}

interface ReconciliationData {
  records: ReconciliationRecord[]
  summary: ReconciliationSummary
  total: number
}

/**
 * Hook to fetch reconciliation data from API
 * Uses TanStack Query for caching and auto-refetch
 */
export function useReconciliationData(
  options: UseReconciliationDataOptions = {}
) {
  const { filters, enabled = true } = options

  return useQuery<ReconciliationData>({
    queryKey: ['reconciliation', filters],
    queryFn: async () => {
      // Build query string
      const params = new URLSearchParams()

      if (filters?.fromDate) params.append('fromDate', filters.fromDate)
      if (filters?.toDate) params.append('toDate', filters.toDate)
      if (filters?.khachHang) params.append('khachHang', filters.khachHang)
      if (filters?.donViVanChuyen)
        params.append('donViVanChuyen', filters.donViVanChuyen)
      if (filters?.loaiTuyen) params.append('loaiTuyen', filters.loaiTuyen)
      if (filters?.loaiChuyen) params.append('loaiChuyen', filters.loaiChuyen)
      if (filters?.searchQuery)
        params.append('searchQuery', filters.searchQuery)

      const queryString = params.toString()
      const url = `/api/reconciliation${queryString ? `?${queryString}` : ''}`

      const response = await fetch(url)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch reconciliation data')
      }

      const data = await response.json()

      // 🔍 STEP 0: Debug - Log raw API response
      console.log('🔍 [STEP 0] Raw API Response received')
      console.log('🔍 [STEP 0] Total records:', data.records?.length || 0)
      if (data.records && data.records.length > 0) {
        const firstRecord = data.records[0]
        console.log('🔍 [STEP 0] First record:', firstRecord)
        console.log('🔍 [STEP 0] First record keys:', Object.keys(firstRecord))
        console.log('🔍 [STEP 0] First record has data_json:', 'data_json' in firstRecord)
        console.log('🔍 [STEP 0] First record data_json value:', firstRecord.data_json)
        console.log('🔍 [STEP 0] First record data_json type:', typeof firstRecord.data_json)
        console.log('🔍 [STEP 0] First record data_json length:', firstRecord.data_json?.length || 0)
      } else {
        console.warn('🔍 [STEP 0] No records in API response')
      }

      return data
    },
    staleTime: 2 * 60 * 1000, // 2 minutes (shorter than dashboard)
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    enabled,
  })
}
