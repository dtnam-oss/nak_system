"use client"

import { useMemo, useState } from "react"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { MapPin, Truck, Wallet, Package, User, AlertTriangle } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { validateTrip } from "@/lib/validation"
import { TripDetailsSheet } from "./trip-details-sheet"

interface TripOrder {
  id: number
  order_id: string
  date: string
  route_name: string
  customer: string
  weight: number
  revenue: number
  cost: number
  status: string
  trip_type: string
  route_type: string
  driver_name: string
  provider: string
  total_distance: number
  details: any
}

interface GroupedData {
  [customer: string]: {
    [tripType: string]: TripOrder[]
  }
}

interface OperationSummaryTabProps {
  trips: TripOrder[]
  loading?: boolean
}

// Format currency VND
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount)
}

// Format date
const formatDate = (dateStr: string) => {
  try {
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: vi })
  } catch {
    return dateStr
  }
}

// Get status badge variant
const getStatusBadge = (status: string) => {
  const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
    'approved': { variant: 'default', label: 'Đã duyệt' },
    'pending': { variant: 'secondary', label: 'Chờ duyệt' },
    'rejected': { variant: 'destructive', label: 'Từ chối' },
  }
  return statusMap[status] || { variant: 'outline', label: status }
}

// Component: Trip Row Card (New List Layout)
const TripRowCard = ({ trip }: { trip: TripOrder }) => {
  const [sheetOpen, setSheetOpen] = useState(false)
  const statusInfo = getStatusBadge(trip.status)

  // Validate trip data
  const errors = validateTrip(trip)
  const hasErrors = errors.length > 0

  // Extract license plate from details if available
  const getLicensePlate = () => {
    try {
      if (trip.details?.chiTietLoTrinh?.[0]?.bienKiemSoat) {
        return trip.details.chiTietLoTrinh[0].bienKiemSoat
      }
    } catch {
      return 'N/A'
    }
    return 'N/A'
  }

  return (
    <>
      <div
        className={cn(
          "group flex items-center justify-between p-4 rounded-lg border bg-card text-card-foreground shadow-sm cursor-pointer transition-all hover:shadow-md",
          hasErrors
            ? "border-l-4 border-l-destructive bg-destructive/5"
            : "border-l-4 border-l-primary/50"
        )}
        onClick={() => setSheetOpen(true)}
      >
        {/* Cột 1: ID & Date (15%) */}
        <div className="w-[15%] min-w-[120px]">
          <div className="font-bold text-sm truncate" title={trip.order_id}>
            {trip.order_id}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {formatDate(trip.date)}
          </div>
        </div>

        {/* Cột 2: Xe & Tài xế (25%) */}
        <div className="w-[25%] min-w-[180px] flex flex-col gap-1 text-sm">
          <div className="flex items-center gap-2">
            <Truck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="truncate font-medium" title={getLicensePlate()}>
              {getLicensePlate()}
            </span>
          </div>
          {trip.driver_name && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate text-xs" title={trip.driver_name}>
                {trip.driver_name}
              </span>
            </div>
          )}
        </div>

        {/* Cột 3: Tuyến (35%) */}
        <div className="w-[35%] min-w-[200px] px-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate" title={trip.route_name || "Chưa có tuyến"}>
                {trip.route_name || "Chưa có tuyến"}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {trip.trip_type} • {trip.route_type || 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Cột 4: Status & Money (25%) */}
        <div className="w-[25%] min-w-[160px] flex flex-col items-end gap-2">
          <div className="flex items-center gap-1 text-sm font-bold text-green-600">
            <Wallet className="w-3.5 h-3.5" />
            <span>{formatCurrency(Number(trip.revenue) || Number(trip.cost) || 0)}</span>
          </div>
          <div className="flex items-center gap-2">
            {hasErrors && (
              <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {errors.length} lỗi
              </Badge>
            )}
            <Badge variant={statusInfo.variant} className="text-[10px] h-5">
              {statusInfo.label}
            </Badge>
          </div>
        </div>
      </div>

      {/* Sheet for details */}
      <TripDetailsSheet
        trip={trip}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        errors={errors}
      />
    </>
  )
}

export function OperationSummaryTab({ trips, loading }: OperationSummaryTabProps) {
  // Group data by customer -> trip_type
  const groupedData = useMemo<GroupedData>(() => {
    const groups: GroupedData = {}

    trips.forEach((trip) => {
      const customer = trip.customer || 'Khách hàng khác'
      const tripType = trip.trip_type || 'Chưa phân loại'

      if (!groups[customer]) {
        groups[customer] = {}
      }

      if (!groups[customer][tripType]) {
        groups[customer][tripType] = []
      }

      groups[customer][tripType].push(trip)
    })

    return groups
  }, [trips])

  // Sort customers by total trip count descending
  const sortedCustomers = useMemo(() => {
    return Object.keys(groupedData).sort((a, b) => {
      const countA = Object.values(groupedData[a]).reduce((sum, trips) => sum + trips.length, 0)
      const countB = Object.values(groupedData[b]).reduce((sum, trips) => sum + trips.length, 0)
      return countB - countA
    })
  }, [groupedData])

  // Calculate total trips for a customer
  const getCustomerTotalTrips = (customer: string) => {
    return Object.values(groupedData[customer]).reduce((sum, trips) => sum + trips.length, 0)
  }

  // Calculate total revenue for a customer
  const getCustomerTotalRevenue = (customer: string) => {
    let total = 0
    Object.values(groupedData[customer]).forEach((trips) => {
      trips.forEach((trip) => {
        const amount = Number(trip.revenue) || Number(trip.cost) || 0
        total += amount
      })
    })
    return total
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Đang tải dữ liệu...</div>
      </div>
    )
  }

  if (trips.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Chưa có dữ liệu</h3>
            <p className="text-muted-foreground">
              Không tìm thấy chuyến đi nào trong khoảng thời gian đã chọn.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Level 1: Customer Accordion */}
      <Accordion type="multiple" className="w-full space-y-3">
        {sortedCustomers.map((customer) => {
          const totalTrips = getCustomerTotalTrips(customer)
          const totalRevenue = getCustomerTotalRevenue(customer)
          const tripTypes = Object.keys(groupedData[customer]).sort()

          return (
            <AccordionItem 
              key={customer} 
              value={customer} 
              className="border rounded-lg px-4 bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg">{customer}</span>
                    <Badge variant="outline" className="font-normal">
                      {totalTrips} chuyến
                    </Badge>
                  </div>
                  <span className="text-sm font-semibold text-green-600">
                    {formatCurrency(totalRevenue)}
                  </span>
                </div>
              </AccordionTrigger>

              <AccordionContent className="pt-2 pb-4">
                {/* Level 2: Trip Type Accordion (Nested) */}
                <Accordion type="multiple" className="w-full pl-4 border-l-2 border-muted ml-2 space-y-2">
                  {tripTypes.map((tripType) => {
                    const trips = groupedData[customer][tripType]
                    const typeRevenue = trips.reduce((sum, t) => sum + (Number(t.revenue) || Number(t.cost) || 0), 0)

                    return (
                      <AccordionItem 
                        key={tripType} 
                        value={tripType} 
                        className="border-0"
                      >
                        <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{tripType}</span>
                              <Badge variant="secondary" className="text-xs font-normal">
                                {trips.length}
                              </Badge>
                            </div>
                            <span className="text-xs font-medium text-green-600">
                              {formatCurrency(typeRevenue)}
                            </span>
                          </div>
                        </AccordionTrigger>

                        <AccordionContent className="pt-3 pb-2">
                          {/* Level 3: Trip Detail List (Row Layout) */}
                          <div className="flex flex-col gap-3">
                            {trips.map((trip) => (
                              <TripRowCard key={trip.id} trip={trip} />
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )
                  })}
                </Accordion>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}
