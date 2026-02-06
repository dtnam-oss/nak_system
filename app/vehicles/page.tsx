"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Truck, RefreshCw, Filter } from "lucide-react"

interface Vehicle {
  license_plate: string
  brand: string
  vehicle_type: string
  weight_capacity: number
  weight_unit: string
  ownership_type: string
  current_status: string
  created_at: string
  created_by: string
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [loaiHinh, setLoaiHinh] = useState("all")
  const [total, setTotal] = useState(0)

  const fetchVehicles = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        limit: '100',
        offset: '0'
      })
      
      if (search) params.set('search', search)
      if (loaiHinh !== 'all') params.set('loaiHinh', loaiHinh)

      const res = await fetch(`/api/vehicles?${params.toString()}`)
      const data = await res.json()

      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch vehicles')
      }

      setVehicles(data.vehicles || [])
      setTotal(data.total || 0)
    } catch (err: any) {
      console.error('Error fetching vehicles:', err)
      setError(err.message || 'Không thể tải dữ liệu phương tiện')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVehicles()
  }, [loaiHinh])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchVehicles()
  }

  const getStatusBadge = (status: string) => {
    const normalized = status?.toLowerCase() || ''
    if (normalized.includes('hoạt động') || normalized.includes('active')) {
      return <Badge variant="default" className="bg-green-500">Đang hoạt động</Badge>
    }
    if (normalized.includes('bảo dưỡng') || normalized.includes('maintenance')) {
      return <Badge variant="secondary">Bảo dưỡng</Badge>
    }
    if (normalized.includes('hỏng') || normalized.includes('broken')) {
      return <Badge variant="destructive">Hỏng</Badge>
    }
    return <Badge variant="outline">{status || 'N/A'}</Badge>
  }

  const getOwnershipBadge = (type: string) => {
    const normalized = type?.toLowerCase() || ''
    if (normalized.includes('nak') || normalized.includes('nội bộ')) {
      return <Badge className="bg-blue-500">NAK</Badge>
    }
    if (normalized.includes('vendor') || normalized.includes('thuê')) {
      return <Badge className="bg-orange-500">Vendor</Badge>
    }
    return <Badge variant="outline">{type || 'N/A'}</Badge>
  }

  return (
    <DashboardLayout breadcrumbs={[{ label: "Dashboard" }, { label: "Phương tiện" }]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Truck className="h-8 w-8" />
              Quản lý phương tiện
            </h1>
            <p className="text-muted-foreground mt-1">
              Danh sách và thông tin các phương tiện vận chuyển
            </p>
          </div>
          <Button onClick={fetchVehicles} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm biển số, hiệu xe, loại xe..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={loaiHinh} onValueChange={setLoaiHinh}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Loại hình" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="nak">NAK (Nội bộ)</SelectItem>
                  <SelectItem value="vendor">Vendor (Thuê ngoài)</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" disabled={loading}>
                <Search className="h-4 w-4 mr-2" />
                Tìm kiếm
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng phương tiện</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">NAK (Nội bộ)</CardTitle>
              <Badge className="bg-blue-500">NAK</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {vehicles.filter(v => v.ownership_type?.toLowerCase().includes('nak') || v.ownership_type?.toLowerCase().includes('nội bộ')).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendor (Thuê ngoài)</CardTitle>
              <Badge className="bg-orange-500">Vendor</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {vehicles.filter(v => v.ownership_type?.toLowerCase().includes('vendor') || v.ownership_type?.toLowerCase().includes('thuê')).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách phương tiện ({vehicles.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
                ❌ {error}
              </div>
            )}
            
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">Đang tải dữ liệu...</p>
              </div>
            ) : vehicles.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Truck className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Không tìm thấy phương tiện nào</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Biển số</TableHead>
                      <TableHead>Hiệu xe</TableHead>
                      <TableHead>Loại xe</TableHead>
                      <TableHead className="text-right">Tải trọng</TableHead>
                      <TableHead>Loại hình</TableHead>
                      <TableHead>Tình trạng</TableHead>
                      <TableHead>Người tạo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicles.map((vehicle) => (
                      <TableRow key={vehicle.license_plate}>
                        <TableCell className="font-mono font-bold">
                          {vehicle.license_plate}
                        </TableCell>
                        <TableCell>{vehicle.brand || 'N/A'}</TableCell>
                        <TableCell>{vehicle.vehicle_type || 'N/A'}</TableCell>
                        <TableCell className="text-right">
                          {vehicle.weight_capacity > 0 
                            ? `${vehicle.weight_capacity.toLocaleString()} ${vehicle.weight_unit || 'tấn'}`
                            : 'N/A'}
                        </TableCell>
                        <TableCell>{getOwnershipBadge(vehicle.ownership_type)}</TableCell>
                        <TableCell>{getStatusBadge(vehicle.current_status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {vehicle.created_by || 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

