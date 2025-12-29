import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function cleanNumber(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const str = String(val).replace(/[^0-9.-]+/g, ""); 
  return parseFloat(str) || 0;
}

// Chuẩn hóa Đơn vị vận chuyển
function normalizeProvider(val: any): string {
  if (!val) return 'OTHER';
  const s = String(val).toUpperCase().trim();
  if (s.includes('NAK')) return 'NAK';
  if (s.includes('VENDOR') || s.includes('XE NGOÀI') || s.includes('ĐỐI TÁC')) return 'VENDOR';
  return 'OTHER';
}

// --- CẬP NHẬT: Chuẩn hóa Loại tuyến ---
function normalizeRouteType(val: any): string | null {
  if (!val) return null;
  const s = String(val).toLowerCase().trim();
  
  if (s.includes('nội thành')) return 'Nội thành';
  if (s.includes('liên tỉnh')) return 'Liên tỉnh';
  if (s.includes('đường dài')) return 'Đường dài';
  
  // MỚI THÊM
  if (s.includes('cố định')) return 'Cố định';
  if (s.includes('tăng cường')) return 'Tăng cường';
  
  return null; 
}

// --- CẬP NHẬT: Chuẩn hóa Loại chuyến ---
function normalizeTripType(val: any): string | null {
  if (!val) return null;
  const s = String(val).toLowerCase().trim();
  
  if (s.includes('một chiều') || s.includes('1 chiều')) return 'Một chiều';
  if (s.includes('hai chiều') || s.includes('2 chiều') || s.includes('khứ hồi')) return 'Hai chiều';
  if (s.includes('nhiều điểm')) return 'Nhiều điểm';

  // MỚI THÊM
  if (s.includes('theo tuyến')) return 'Theo tuyến';
  if (s.includes('theo ca')) return 'Theo ca';
  
  return null;
}

export async function POST(request: Request) {
  try {
    const secret = request.headers.get('x-migration-secret');
    if (secret !== process.env.MIGRATION_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { records } = body;

    if (!records || !Array.isArray(records)) {
      return NextResponse.json({ error: 'Invalid records' }, { status: 400 });
    }

    let successCount = 0;
    let failedCount = 0;
    const errors = [];

    for (const record of records) {
      try {
        let detailsObj = record.data_json;
        if (typeof detailsObj === 'string') {
          try { detailsObj = JSON.parse(detailsObj); } catch (e) { detailsObj = {}; }
        }

        const licensePlate = detailsObj?.thongTinChuyenDi?.soXe || '';
        let totalWeight = 0;
        if (Array.isArray(detailsObj?.chiTietLoTrinh)) {
          totalWeight = detailsObj.chiTietLoTrinh.reduce((sum: any, item: any) => sum + cleanNumber(item.taiTrong), 0);
        }

        let status = 'pending';
        const stt = String(record.trangThai || '').toLowerCase();
        if (stt.includes('đã duyệt') || stt.includes('approved')) status = 'approved';
        else if (stt.includes('từ chối') || stt.includes('rejected')) status = 'rejected';

        // Áp dụng hàm chuẩn hóa mới
        const provider = normalizeProvider(record.donViVanChuyen);
        const routeType = normalizeRouteType(record.loaiTuyen);
        const tripType = normalizeTripType(record.loaiChuyen);

        await sql`
          INSERT INTO reconciliation_orders (
            order_id, date, customer, 
            trip_type, route_type, route_name, 
            driver_name, provider, 
            total_distance, cost, status,
            license_plate, weight, details
          ) VALUES (
            ${record.maChuyenDi}, ${record.ngayTao}, ${record.tenKhachHang},
            ${tripType}, ${routeType}, ${record.tenTuyen},
            ${record.tenTaiXe}, ${provider},
            ${cleanNumber(record.tongQuangDuong)}, ${cleanNumber(record.tongDoanhThu)}, ${status},
            ${licensePlate}, ${totalWeight}, ${JSON.stringify(detailsObj)}
          )
          ON CONFLICT (order_id) DO UPDATE SET
            cost = EXCLUDED.cost,
            status = EXCLUDED.status,
            details = EXCLUDED.details,
            provider = EXCLUDED.provider,
            trip_type = EXCLUDED.trip_type,
            route_type = EXCLUDED.route_type;
        `;
        
        successCount++;
      } catch (err: any) {
        console.error(`Import Error [${record.maChuyenDi}]:`, err.message);
        failedCount++;
        errors.push({ id: record.maChuyenDi, msg: err.message });
      }
    }

    return NextResponse.json({
      success: successCount,
      failed: failedCount,
      errors: errors.slice(0, 5) 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}