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

      // OPTIMIZATION: Default to 100 records for fast initial load
      params.append('limit', '100')

      if (filters?.fromDate) params.append('fromDate', filters.fromDate)
      if (filters?.toDate) params.append('toDate', filters.toDate)
      if (filters?.khachHang) params.append('khachHang', filters.khachHang)
      if (filters?.donViVanChuyen)
        params.append('donViVanChuyen', filters.donViVanChuyen)
      if (filters?.loaiTuyen) params.append('loaiTuyen', filters.loaiTuyen)
      if (filters?.loaiChuyen) params.append('loaiChuyen', filters.loaiChuyen)
      // Search only by order_id (maChuyenDi)
      if (filters?.searchQuery)
        params.append('orderId', filters.searchQuery)

      const queryString = params.toString()
      const url = `/api/reconciliation${queryString ? `?${queryString}` : ''}`

      const response = await fetch(url)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch reconciliation data')
      }

      const data = await response.json()

      console.log('✅ [Reconciliation] Loaded', data.records?.length || 0, 'records')

      return data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false, // Disable auto-refetch on window focus
    refetchOnMount: false, // Only fetch on first mount
    enabled,
  })
}
