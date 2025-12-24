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
      if (filters?.trangThai) params.append('trangThai', filters.trangThai)
      if (filters?.searchQuery)
        params.append('searchQuery', filters.searchQuery)

      const queryString = params.toString()
      const url = `/api/reconciliation${queryString ? `?${queryString}` : ''}`

      const response = await fetch(url)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch reconciliation data')
      }

      return response.json()
    },
    staleTime: 2 * 60 * 1000, // 2 minutes (shorter than dashboard)
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    enabled,
  })
}
