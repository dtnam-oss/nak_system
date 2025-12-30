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
    // ==================== DEBUG LOGGING START ====================
    console.log('[APPSHEET_DEBUG] ========== NEW WEBHOOK REQUEST ==========');
    console.log('[APPSHEET_DEBUG] Timestamp:', new Date().toISOString());

    // Log all headers
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });
    console.log('[APPSHEET_DEBUG] Headers:', JSON.stringify(headers, null, 2));

    // Get raw body as text first (to avoid "Body is unusable" error)
    let rawBody: string;
    try {
      rawBody = await request.text();
      console.log('[APPSHEET_DEBUG] Raw Body (text):', rawBody);
      console.log('[APPSHEET_DEBUG] Raw Body Length:', rawBody.length);
    } catch (textError: any) {
      console.error('[APPSHEET_DEBUG] ERROR reading raw body:', textError.message);
      return NextResponse.json({
        error: 'Failed to read request body',
        message: textError.message
      }, { status: 400 });
    }

    // Parse JSON from raw body
    let body: any;
    try {
      body = JSON.parse(rawBody);
      console.log('[APPSHEET_DEBUG] Parsed JSON successfully');
      console.log('[APPSHEET_DEBUG] Parsed Body:', JSON.stringify(body, null, 2));
    } catch (parseError: any) {
      console.error('[APPSHEET_DEBUG] ERROR parsing JSON:', parseError.message);
      console.error('[APPSHEET_DEBUG] JSON Parse Error at position:', parseError.message.match(/position (\d+)/)?.[1] || 'unknown');
      return NextResponse.json({
        error: 'Invalid JSON format',
        message: parseError.message,
        receivedBody: rawBody.substring(0, 500) // Return first 500 chars for inspection
      }, { status: 400 });
    }

    console.log('[APPSHEET_DEBUG] ========== DEBUG LOGGING END ==========');
    // ==================== DEBUG LOGGING END ====================

    // 1. Authentication
    const apiKey = request.headers.get('x-api-key');
    const expectedKey = process.env.APPSHEET_SECRET_KEY || process.env.MIGRATION_SECRET;

    if (apiKey !== expectedKey) {
      console.error('[APPSHEET_DEBUG] Authentication failed - Invalid API key');
      console.error('[APPSHEET_DEBUG] Expected key prefix:', expectedKey?.substring(0, 10) + '...');
      console.error('[APPSHEET_DEBUG] Received key prefix:', apiKey?.substring(0, 10) + '...');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[APPSHEET_DEBUG] Authentication successful');

    // 2. Parse request body (already parsed above)
    console.log('[APPSHEET_DEBUG] Webhook Action:', body.Action);
    console.log('[APPSHEET_DEBUG] Order ID (maChuyenDi):', body.maChuyenDi);

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
    console.log('[APPSHEET_DEBUG] Starting UPSERT process...');

    // 4.1 Validate required field
    if (!body.maChuyenDi) {
      console.error('[APPSHEET_DEBUG] ERROR: Missing maChuyenDi field');
      return NextResponse.json({
        error: 'Missing required field: maChuyenDi'
      }, { status: 400 });
    }

    // 4.2 Parse data_json safely
    console.log('[APPSHEET_DEBUG] Parsing data_json field...');
    console.log('[APPSHEET_DEBUG] data_json type:', typeof body.data_json);
    console.log('[APPSHEET_DEBUG] data_json value:', JSON.stringify(body.data_json, null, 2));

    const detailsObj = parseDataJson(body.data_json);
    console.log('[APPSHEET_DEBUG] Parsed detailsObj:', JSON.stringify(detailsObj, null, 2));

    // 4.3 Extract and normalize fields
    console.log('[APPSHEET_DEBUG] Extracting and normalizing fields...');

    const orderId = body.maChuyenDi;
    console.log('[APPSHEET_DEBUG] - orderId:', orderId);

    const date = formatDate(body.ngayTao);
    console.log('[APPSHEET_DEBUG] - date (raw):', body.ngayTao, '→ (normalized):', date);

    const customer = body.tenKhachHang || null;
    console.log('[APPSHEET_DEBUG] - customer:', customer);

    const provider = normalizeProvider(body.donViVanChuyen);
    console.log('[APPSHEET_DEBUG] - provider (raw):', body.donViVanChuyen, '→ (normalized):', provider);

    const tripType = normalizeTripType(body.loaiChuyen);
    console.log('[APPSHEET_DEBUG] - tripType (raw):', body.loaiChuyen, '→ (normalized):', tripType);

    const routeType = normalizeRouteType(body.loaiTuyen);
    console.log('[APPSHEET_DEBUG] - routeType (raw):', body.loaiTuyen, '→ (normalized):', routeType);

    const routeName = body.tenTuyen || null;
    console.log('[APPSHEET_DEBUG] - routeName:', routeName);

    const driverName = body.tenTaiXe || null;
    console.log('[APPSHEET_DEBUG] - driverName:', driverName);

    const totalDistance = cleanNumber(body.tongQuangDuong);
    console.log('[APPSHEET_DEBUG] - totalDistance (raw):', body.tongQuangDuong, '→ (cleaned):', totalDistance);

    const cost = cleanNumber(body.tongDoanhThu);
    console.log('[APPSHEET_DEBUG] - cost (raw):', body.tongDoanhThu, '→ (cleaned):', cost);

    const status = normalizeStatus(body.trangThai);
    console.log('[APPSHEET_DEBUG] - status (raw):', body.trangThai, '→ (normalized):', status);

    const licensePlate = extractLicensePlate(body, detailsObj);
    console.log('[APPSHEET_DEBUG] - licensePlate:', licensePlate);

    const weight = calculateTotalWeight(body, detailsObj);
    console.log('[APPSHEET_DEBUG] - weight:', weight);

    const details = JSON.stringify(detailsObj);
    console.log('[APPSHEET_DEBUG] - details (JSONB) length:', details.length);

    // 4.4 Execute UPSERT
    console.log('[APPSHEET_DEBUG] Executing database UPSERT...');
    console.log('[APPSHEET_DEBUG] SQL Parameters:', {
      orderId,
      date,
      customer,
      tripType,
      routeType,
      routeName,
      driverName,
      provider,
      totalDistance,
      cost,
      status,
      licensePlate,
      weight,
      detailsLength: details.length
    });

    try {
      const result = await sql`
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

      console.log('[APPSHEET_DEBUG] Database UPSERT successful');
      console.log('[APPSHEET_DEBUG] SQL Result:', result);
      console.log(`[APPSHEET_DEBUG] Upserted order: ${orderId}`);

    } catch (dbError: any) {
      console.error('[APPSHEET_DEBUG] ========== DATABASE ERROR ==========');
      console.error('[APPSHEET_DEBUG] Database operation failed:', dbError.message);
      console.error('[APPSHEET_DEBUG] Error name:', dbError.name);
      console.error('[APPSHEET_DEBUG] Error code:', dbError.code);
      console.error('[APPSHEET_DEBUG] Error stack:', dbError.stack);
      console.error('[APPSHEET_DEBUG] Failed order_id:', orderId);

      return NextResponse.json({
        error: 'Database error',
        message: dbError.message,
        code: dbError.code,
        orderId: orderId
      }, { status: 500 });
    }

    console.log('[APPSHEET_DEBUG] Returning success response...');

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
    console.error('[APPSHEET_DEBUG] ========== GLOBAL ERROR ==========');
    console.error('[APPSHEET_DEBUG] Global error caught:', error.message);
    console.error('[APPSHEET_DEBUG] Error name:', error.name);
    console.error('[APPSHEET_DEBUG] Error stack:', error.stack);

    return NextResponse.json({
      error: 'Internal server error',
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
