"use client"

import { useState, useEffect } from 'react'
import { Search, Calendar, Landmark, MapPin, Navigation } from 'lucide-react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

interface TripRecord {
    maChuyenDi: string
    ngay: string
    tenKhachHang: string
    tenTuyen: string
    quangDuong: number
    doanhThu: number
}

export default function VehicleRoutesMiniApp() {
    const [licensePlate, setLicensePlate] = useState('')
    const [startDate, setStartDate] = useState(format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'))
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [loading, setLoading] = useState(false)
    const [trips, setTrips] = useState<TripRecord[]>([])
    const [error, setError] = useState('')

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (!licensePlate) {
            setError('Vui lòng nhập biển số xe')
            return
        }

        setLoading(true)
        setError('')
        try {
            const res = await fetch(`/api/vehicles/route-history?licensePlate=${encodeURIComponent(licensePlate.toUpperCase())}&startDate=${startDate}&endDate=${endDate}`)
            const data = await res.json()

            if (data.error) throw new Error(data.message || data.error)
            setTrips(data.records || [])
        } catch (err: any) {
            setError(err.message || 'Lỗi khi tải dữ liệu')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-10">
            {/* Header */}
            <div className="bg-blue-600 text-white p-6 rounded-b-3xl shadow-lg">
                <h1 className="text-xl font-bold flex items-center gap-2">
                    <Navigation className="w-6 h-6" />
                    Tra cứu Lộ trình
                </h1>
                <p className="text-blue-100 text-sm mt-1">Hệ thống NAK Logistics</p>
            </div>

            {/* Search Bar */}
            <div className="mx-4 -mt-8 bg-white p-4 rounded-2xl shadow-md border border-slate-100">
                <form onSubmit={handleSearch} className="space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase ml-1">Biển kiểm soát</label>
                        <div className="relative mt-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={licensePlate}
                                onChange={(e) => setLicensePlate(e.target.value)}
                                placeholder="Ví dụ: 29H-12345"
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-medium uppercase"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase ml-1">Từ ngày</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase ml-1">Đến ngày</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-md shadow-blue-200 transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Đang tra cứu...' : 'TÌM KIẾM'}
                    </button>
                </form>
            </div>

            {/* Results */}
            <div className="px-4 mt-8 space-y-4">
                {error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm font-medium">
                        ⚠️ {error}
                    </div>
                )}

                {trips.length > 0 ? (
                    <>
                        <div className="flex justify-between items-center px-1">
                            <h2 className="font-bold text-slate-800">Kết quả ({trips.length})</h2>
                            <span className="text-xs text-slate-500">Mới nhất lên đầu</span>
                        </div>
                        {trips.map((trip) => (
                            <div key={trip.maChuyenDi} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-200 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold">
                                        {trip.maChuyenDi}
                                    </div>
                                    <div className="flex items-center gap-1 text-slate-400">
                                        <Calendar className="w-3 h-3" />
                                        <span className="text-xs font-medium">
                                            {format(new Date(trip.ngay), 'dd/MM/yyyy')}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-3 space-y-2">
                                    <div className="flex items-start gap-2">
                                        <Landmark className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                                        <p className="text-sm font-semibold text-slate-700">{trip.tenKhachHang}</p>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                                        <p className="text-sm text-slate-600 line-clamp-2">{trip.tenTuyen}</p>
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between items-center text-xs">
                                    <span className="text-slate-400">Khoảng cách: <b className="text-slate-700">{trip.quangDuong} km</b></span>
                                    <span className="text-blue-600 font-bold">{new Intl.NumberFormat('vi-VN').format(trip.doanhThu)} đ</span>
                                </div>
                            </div>
                        ))}
                    </>
                ) : !loading && licensePlate && (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Search className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-slate-500 font-medium">Không tìm thấy lộ trình nào</p>
                        <p className="text-slate-400 text-xs mt-1">Thử thay đổi khoảng thời gian tra cứu</p>
                    </div>
                )}
            </div>
        </div>
    )
}
