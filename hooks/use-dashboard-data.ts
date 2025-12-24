import { useQuery } from '@tanstack/react-query'
import type { DashboardData, DashboardFilters } from '@/types/dashboard'

interface UseDashboardDataOptions {
  filters?: DashboardFilters
  enabled?: boolean
}

export function useDashboardData(options: UseDashboardDataOptions = {}) {
  const { filters, enabled = true } = options

  return useQuery({
    queryKey: ['dashboard', filters],
    queryFn: async () => {
      // Build query string
      const params = new URLSearchParams()
      if (filters?.fromDate) params.set('fromDate', filters.fromDate)
      if (filters?.toDate) params.set('toDate', filters.toDate)
      if (filters?.khachHang) params.set('khachHang', filters.khachHang)
      if (filters?.loaiTuyen) params.set('loaiTuyen', filters.loaiTuyen)

      const queryString = params.toString()
      const url = `/api/reports/dashboard${queryString ? `?${queryString}` : ''}`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      const data: DashboardData = await response.json()
      return data
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
    refetchOnWindowFocus: true,
  })
}
