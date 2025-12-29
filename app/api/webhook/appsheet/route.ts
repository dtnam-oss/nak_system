import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ==================== HELPER FUNCTIONS ====================

// Helper: Clean number strings (remove dots, commas)
function cleanNumber(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const str = String(val).replace(/[^0-9.-]+/g, "");
  return parseFloat(str) || 0;
}

// Helper: Map Vietnamese Status to DB Enum
function normalizeStatus(val: any): string {
  if (!val) return 'new';
  const s = String(val).toLowerCase().trim();

  // Mappings:
  if (s.includes('khởi tạo') || s.includes('draft')) return 'draft';
  if (s.includes('mới') || s.includes('new')) return 'new';
  if (s.includes('chờ giao') || s.includes('chờ')) return 'pending_delivery';
  if (s.includes('đang giao') || s.includes('delivery')) return 'in_progress';
  if (s.includes('kết thúc') || s.includes('finished')) return 'completed';
  if (s.includes('hoàn tất') || s.includes('approved') || s.includes('đã duyệt')) return 'approved';
  if (s.includes('huỷ') || s.includes('rejected') || s.includes('cancel')) return 'rejected';

  return 'pending'; // Fallback
}

// Helper: Normalize Provider
function normalizeProvider(val: any): string {
  if (!val) return 'OTHER';
  const s = String(val).toUpperCase().trim();

  if (s.includes('NAK')) return 'NAK';
  if (s.includes('VENDOR') || s.includes('XE NGOÀI') || s.includes('ĐỐI TÁC')) return 'VENDOR';

  return 'OTHER';
}

// Helper: Normalize Route Type
function normalizeRouteType(val: any): string | null {
  if (!val) return null;
  const s = String(val).toLowerCase().trim();

  if (s.includes('nội thành')) return 'Nội thành';
  if (s.includes('liên tỉnh')) return 'Liên tỉnh';
  if (s.includes('đường dài')) return 'Đường dài';
  if (s.includes('cố định')) return 'Cố định';
  if (s.includes('tăng cường')) return 'Tăng cường';

  return null;
}

// Helper: Normalize Trip Type
function normalizeTripType(val: any): string | null {
  if (!val) return null;
  const s = String(val).toLowerCase().trim();

  if (s.includes('một chiều') || s.includes('1 chiều')) return 'Một chiều';
  if (s.includes('hai chiều') || s.includes('2 chiều') || s.includes('khứ hồi')) return 'Hai chiều';
  if (s.includes('nhiều điểm')) return 'Nhiều điểm';
  if (s.includes('theo tuyến')) return 'Theo tuyến';
  if (s.includes('theo ca')) return 'Theo ca';

  return null;
}

// Helper: Extract license plate from various sources
function extractLicensePlate(record: any, detailsObj: any): string {
  // Try multiple sources
  return record.bienSoXe ||
         record.soXe ||
         detailsObj?.thongTinChuyenDi?.soXe ||
         detailsObj?.thongTinChuyenDi?.bienKiemSoat ||
         '';
}

// Helper: Calculate total weight
function calculateTotalWeight(record: any, detailsObj: any): number {
  // Option 1: Sum from chiTietLoTrinh array
  if (Array.isArray(detailsObj?.chiTietLoTrinh)) {
    return detailsObj.chiTietLoTrinh.reduce(
      (sum: number, item: any) => sum + cleanNumber(item.taiTrong || item.taiTrongTinhPhi || 0),
      0
    );
  }

  // Option 2: Use trongLuong field directly
  if (record.trongLuong !== undefined) {
    return cleanNumber(record.trongLuong);
  }

  // Option 3: Use from thongTinChuyenDi
  if (detailsObj?.thongTinChuyenDi?.taiTrong) {
    return cleanNumber(detailsObj.thongTinChuyenDi.taiTrong);
  }

  return 0;
}

// Helper: Parse data_json safely
function parseDataJson(data: any): any {
  if (!data) return {};

  // If already an object, return as-is
  if (typeof data === 'object' && !Array.isArray(data)) {
    return data;
  }

  // If string, try to parse
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse data_json:', e);
      return {};
    }
  }

  return {};
}

// Helper: Format date to YYYY-MM-DD
function formatDate(val: any): string {
  if (!val) return new Date().toISOString().split('T')[0];

  const str = String(val).trim();

  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // DD/MM/YYYY format (AppSheet default)
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [day, month, year] = str.split('/');
    return `${year}-${month}-${day}`;
  }

  // Try parsing as Date object
  try {
    const date = new Date(val);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (e) {
    // Fall through to default
  }

  // Default to today
  return new Date().toISOString().split('T')[0];
}

// ==================== MAIN WEBHOOK HANDLER ====================

export async function POST(request: Request) {
  try {
    // 1. Authentication
    const apiKey = request.headers.get('x-api-key');
    const expectedKey = process.env.APPSHEET_SECRET_KEY || process.env.MIGRATION_SECRET;

    if (apiKey !== expectedKey) {
      console.error('Unauthorized webhook attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    console.log('Webhook received:', { Action: body.Action, maChuyenDi: body.maChuyenDi });

    // 3. Handle DELETE action
    if (body.Action === 'Delete') {
      const orderId = body.maChuyenDi;

      if (!orderId) {
        return NextResponse.json({
          error: 'Missing maChuyenDi for Delete action'
        }, { status: 400 });
      }

      await sql`
        DELETE FROM reconciliation_orders
        WHERE order_id = ${orderId}
      `;

      console.log(`Deleted order: ${orderId}`);

      return NextResponse.json({
        success: true,
        action: 'delete',
        orderId: orderId,
        message: 'Record deleted successfully'
      });
    }

    // 4. Handle UPSERT (Add/Update)

    // 4.1 Validate required field
    if (!body.maChuyenDi) {
      return NextResponse.json({
        error: 'Missing required field: maChuyenDi'
      }, { status: 400 });
    }

    // 4.2 Parse data_json safely
    const detailsObj = parseDataJson(body.data_json);

    // 4.3 Extract and normalize fields
    const orderId = body.maChuyenDi;
    const date = formatDate(body.ngayTao);
    const customer = body.tenKhachHang || null;
    const provider = normalizeProvider(body.donViVanChuyen);
    const tripType = normalizeTripType(body.loaiChuyen);
    const routeType = normalizeRouteType(body.loaiTuyen);
    const routeName = body.tenTuyen || null;
    const driverName = body.tenTaiXe || null;
    const totalDistance = cleanNumber(body.tongQuangDuong);
    const cost = cleanNumber(body.tongDoanhThu);
    const status = normalizeStatus(body.trangThai);
    const licensePlate = extractLicensePlate(body, detailsObj);
    const weight = calculateTotalWeight(body, detailsObj);
    const details = JSON.stringify(detailsObj);

    // 4.4 Execute UPSERT
    await sql`
      INSERT INTO reconciliation_orders (
        order_id, date, customer,
        trip_type, route_type, route_name,
        driver_name, provider,
        total_distance, cost, status,
        license_plate, weight, details
      ) VALUES (
        ${orderId}, ${date}, ${customer},
        ${tripType}, ${routeType}, ${routeName},
        ${driverName}, ${provider},
        ${totalDistance}, ${cost}, ${status},
        ${licensePlate}, ${weight}, ${details}
      )
      ON CONFLICT (order_id) DO UPDATE SET
        date = EXCLUDED.date,
        customer = EXCLUDED.customer,
        trip_type = EXCLUDED.trip_type,
        route_type = EXCLUDED.route_type,
        route_name = EXCLUDED.route_name,
        driver_name = EXCLUDED.driver_name,
        provider = EXCLUDED.provider,
        total_distance = EXCLUDED.total_distance,
        cost = EXCLUDED.cost,
        status = EXCLUDED.status,
        license_plate = EXCLUDED.license_plate,
        weight = EXCLUDED.weight,
        details = EXCLUDED.details;
    `;

    console.log(`Upserted order: ${orderId}`);

    return NextResponse.json({
      success: true,
      action: 'upsert',
      orderId: orderId,
      message: 'Record synchronized successfully',
      normalized: {
        provider,
        tripType,
        routeType,
        status,
        totalDistance,
        cost,
        weight
      }
    });

  } catch (error: any) {
    console.error('Webhook error:', error);

    return NextResponse.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
}
