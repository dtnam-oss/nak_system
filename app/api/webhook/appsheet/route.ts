import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ==================== TYPE DEFINITIONS ====================

interface GASPayload {
  Action: 'Add' | 'Edit' | 'Delete' | 'UpsertVehicles' | 'FuelImport_Upsert' | 'FuelImport_Delete' | 'FuelTransaction_Upsert' | 'FuelTransaction_Delete' | 'Employee_Add' | 'Employee_Edit' | 'Employee_Delete';
  maChuyenDi?: string;
  maNhanVien?: string;  // For Employee actions
  ngayTao?: string;
  tenKhachHang?: string;
  tongDoanhThu?: number | string;
  tongChiPhi?: number | string;  // NEW: Cost from auto pricing
  tongQuangDuong?: number | string;
  trangThai?: string;
  tenTaiXe?: string;
  donViVanChuyen?: string;
  loaiChuyen?: string;
  loaiTuyen?: string;
  ghiChu?: string;  // NEW: Note field from AppSheet
  data_json?: any;
  vehicles?: VehiclePayload[];  // NEW: For vehicles sync
  // Fuel sync fields
  id?: string;  // For Fuel Import/Transaction Delete
  data?: FuelImportPayload | FuelTransactionPayload;  // For Fuel Upsert
}

interface VehiclePayload {
  licensePlate: string;      // Biển kiểm soát (Primary Key)
  weightCapacity: number;    // Tải trọng
  weightUnit: string | null; // Đơn vị
  weightText: string | null; // Tải trọng bằng chữ
  brand: string | null;      // Hiệu xe
  bodyType: string | null;   // Loại xe
  currentStatus: string | null; // Tình trạng
  fuelNorm: number;          // Định mức dầu
  assignedDriverCodes: string | null; // Mã tài xế
  provider: string | null;   // Loại hình
}

interface FuelImportPayload {
  id: string;
  importDate: string;
  supplier: string | null;
  fuelType: string | null;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  avgPrice: number;
  createdBy: string | null;
}

interface FuelTransactionPayload {
  id: string;
  transactionDate: string;
  fuelSource: string | null;
  object: string | null;
  licensePlate: string | null;
  driverName: string | null;
  fuelType: string | null;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  odoNumber: number;
  status: string | null;
  category: string | null;
}

interface EmployeePayload {
  maNhanVien: string;
  hoVaTen: string;
  phongBan?: string | null;
  chucVu?: string | null;
  hinhAnh?: string | null;
  soDienThoai?: string | null;
  email?: string | null;
  chatId?: string | null;
  trangThai?: string | null;
  ngayVaoLam?: string | null;
  ngayNghiViec?: string | null;
  diaChi?: string | null;
  soCccd?: string | null;
  ngaySinh?: string | null;
  gioiTinh?: string | null;
  tinhTrangHonNhan?: string | null;
  nguoiLienHeKhanCap?: string | null;
  soDienThoaiKhanCap?: string | null;
  phanQuyen?: string | null;
  xem?: boolean;
  them?: boolean;
  sua?: boolean;
  xoa?: boolean;
}

interface NormalizedPayload {
  orderId: string;
  date: string;
  customer: string | null;
  revenue: number;  // Changed from cost - stores tongDoanhThu (revenue)
  cost: number;     // New - for actual expenses (chi phí)
  totalDistance: number;
  status: 'approved' | 'pending' | 'rejected';
  driverName: string | null;
  provider: 'NAK' | 'VENDOR' | 'OTHER';
  tripType: string | null;
  routeType: string | null;
  routeName: string;
  weight: number;
  note: string | null;  // NEW: Note field
  details: any;
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Parse number safely - return 0 if invalid
 */
function parseNumber(val: any): number {
  if (typeof val === 'number') return val;
  if (!val || val === '') return 0;
  
  const str = String(val).replace(/[^0-9.-]+/g, '');
  const parsed = parseFloat(str);
  
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(val: any): string {
  if (!val) return new Date().toISOString().split('T')[0];

  const str = String(val).trim();

  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // DD/MM/YYYY format
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

  return new Date().toISOString().split('T')[0];
}

/**
 * Normalize status to match Dashboard logic
 * CRITICAL: Map Vietnamese status to: approved, pending, rejected
 */
function normalizeStatus(val: any): 'approved' | 'pending' | 'rejected' {
  if (!val) return 'pending';
  
  const s = String(val).toLowerCase().trim();

  // Map to "approved" - Đã duyệt
  if (
    s === 'kết thúc' ||
    s === 'ket thuc' ||
    s === 'hoàn tất' ||
    s === 'hoan tat' ||
    s === 'completed' ||
    s === 'finish' ||
    s === 'approved' ||
    s === 'đã duyệt' ||
    s === 'da duyet'
  ) {
    return 'approved';
  }

  // Map to "rejected" - Hủy
  if (
    s === 'hủy' ||
    s === 'huy' ||
    s === 'cancel' ||
    s === 'cancelled' ||
    s === 'rejected' ||
    s === 'từ chối' ||
    s === 'tu choi'
  ) {
    return 'rejected';
  }

  // Map to "pending" - Mới, chờ duyệt
  // Default fallback
  return 'pending';
}

/**
 * Normalize provider
 */
function normalizeProvider(val: any): 'NAK' | 'VENDOR' | 'OTHER' {
  if (!val) return 'OTHER';
  
  const s = String(val).toUpperCase().trim();

  if (s.includes('NAK')) return 'NAK';
  if (s.includes('VENDOR') || s.includes('XE NGOAI') || s.includes('ĐỐI TÁC')) return 'VENDOR';

  return 'OTHER';
}

/**
 * Normalize trip type
 */
function normalizeTripType(val: any): string | null {
  if (!val) return null;
  
  const s = String(val).toLowerCase().trim();

  if (s.includes('một chiều') || s.includes('1 chiều') || s.includes('mot chieu')) return 'Một chiều';
  if (s.includes('hai chiều') || s.includes('2 chiều') || s.includes('khứ hồi') || s.includes('hai chieu')) return 'Hai chiều';
  if (s.includes('nhiều điểm') || s.includes('nhieu diem')) return 'Nhiều điểm';
  if (s.includes('theo tuyến') || s.includes('theo tuyen')) return 'Theo tuyến';
  if (s.includes('theo ca')) return 'Theo ca';
  if (s.includes('theo chuyến') || s.includes('theo chuyen')) return 'Theo chuyến';

  return val.toString();
}

/**
 * Normalize route type
 */
function normalizeRouteType(val: any): string | null {
  if (!val) return null;
  
  const s = String(val).toLowerCase().trim();

  if (s.includes('nội thành') || s.includes('noi thanh')) return 'Nội thành';
  if (s.includes('liên tỉnh') || s.includes('lien tinh')) return 'Liên tỉnh';
  if (s.includes('đường dài') || s.includes('duong dai')) return 'Đường dài';
  if (s.includes('cố định') || s.includes('co dinh')) return 'Cố định';
  if (s.includes('tăng cường') || s.includes('tang cuong')) return 'Tăng cường';

  return val.toString();
}

/**
 * Calculate total weight from chiTietLoTrinh
 */
function calculateTotalWeight(details: any): number {
  if (!details?.chiTietLoTrinh || !Array.isArray(details.chiTietLoTrinh)) {
    return 0;
  }
  
  return details.chiTietLoTrinh.reduce((sum: number, item: any) => {
    const weight = parseNumber(item.tai_trong || item.tai_trong_tinh_phi || 0);
    return sum + weight;
  }, 0);
}

/**
 * Generate route name if not provided
 * Format: "{loaiTuyen} - {tenKhachHang}"
 */
function generateRouteName(routeType: string | null, customer: string | null, providedName?: string): string {
  // If route name is provided, use it
  if (providedName && providedName.trim()) {
    return providedName.trim();
  }
  
  // Auto-generate
  const parts: string[] = [];
  
  if (routeType) parts.push(routeType);
  if (customer) parts.push(customer);
  
  if (parts.length > 0) {
    return parts.join(' - ');
  }
  
  return 'Chưa xác định';
}

/**
 * Parse data_json safely
 */
function parseDataJson(data: any): any {
  if (!data) return {};

  if (typeof data === 'object' && !Array.isArray(data)) {
    return data;
  }

  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('[ERROR] Failed to parse data_json:', e);
      return {};
    }
  }

  return {};
}

/**
 * Main normalization function
 * Maps GAS payload to database schema
 */
function normalizePayload(payload: GASPayload): NormalizedPayload {
  console.log('[NORMALIZE] Starting payload normalization...');
  
  // Parse details first
  const details = parseDataJson(payload.data_json);
  
  // Extract and normalize each field
  const orderId = payload.maChuyenDi || '';  // Add fallback for TypeScript
  const date = formatDate(payload.ngayTao);
  const customer = payload.tenKhachHang || null;
  
  // CRITICAL: Map tongDoanhThu -> revenue (doanh thu)
  const revenue = parseNumber(payload.tongDoanhThu);
  console.log(`[NORMALIZE] tongDoanhThu: ${payload.tongDoanhThu} -> revenue: ${revenue}`);
  
  // CRITICAL: Map tongChiPhi -> cost (chi phí)
  const cost = parseNumber(payload.tongChiPhi);
  console.log(`[NORMALIZE] tongChiPhi: ${payload.tongChiPhi} -> cost: ${cost}`);
  
  // CRITICAL: Map tongQuangDuong -> total_distance
  const totalDistance = parseNumber(payload.tongQuangDuong);
  console.log(`[NORMALIZE] tongQuangDuong: ${payload.tongQuangDuong} -> totalDistance: ${totalDistance}`);
  
  // CRITICAL: Normalize status correctly
  const status = normalizeStatus(payload.trangThai);
  console.log(`[NORMALIZE] trangThai: "${payload.trangThai}" -> status: "${status}"`);
  
  const driverName = payload.tenTaiXe || null;
  const provider = normalizeProvider(payload.donViVanChuyen);
  const tripType = normalizeTripType(payload.loaiChuyen);
  const routeType = normalizeRouteType(payload.loaiTuyen);

  // Generate route name if not provided
  const routeName = generateRouteName(routeType, customer, (payload as any).tenTuyen);
  console.log(`[NORMALIZE] Generated routeName: "${routeName}"`);

  const weight = calculateTotalWeight(details);

  // NEW: Extract note field
  const note = payload.ghiChu || null;
  console.log(`[NORMALIZE] ghiChu: "${payload.ghiChu}" -> note: "${note}"`);

  const normalized: NormalizedPayload = {
    orderId,
    date,
    customer,
    revenue,
    cost,
    totalDistance,
    status,
    driverName,
    provider,
    tripType,
    routeType,
    routeName,
    weight,
    note,
    details
  };
  
  console.log('[NORMALIZE] Normalization complete. Final values:');
  console.log(`  - revenue: ${normalized.revenue}`);
  console.log(`  - cost: ${normalized.cost}`);
  console.log('[NORMALIZE] Full normalized object:', JSON.stringify(normalized, null, 2));
  
  return normalized;
}

// ==================== MAIN WEBHOOK HANDLER ====================

export async function POST(request: Request) {
  try {
    console.log('========================================');
    console.log('📥 NEW WEBHOOK REQUEST');
    console.log('🕐 Timestamp:', new Date().toISOString());
    console.log('========================================');

    // 1. Read and parse request body
    let rawBody: string;
    try {
      rawBody = await request.text();
      console.log('📄 Raw Body Length:', rawBody.length);
    } catch (textError: any) {
      console.error('❌ ERROR reading raw body:', textError.message);
      return NextResponse.json({
        error: 'Failed to read request body',
        message: textError.message
      }, { status: 400 });
    }

    let payload: GASPayload;
    try {
      payload = JSON.parse(rawBody);
      console.log('✅ JSON parsed successfully');
      console.log('📦 Payload:', JSON.stringify(payload, null, 2));
    } catch (parseError: any) {
      console.error('❌ ERROR parsing JSON:', parseError.message);
      return NextResponse.json({
        error: 'Invalid JSON format',
        message: parseError.message,
        receivedBody: rawBody.substring(0, 500)
      }, { status: 400 });
    }

    // 2. Authentication
    const apiKey = request.headers.get('x-api-key');
    const expectedKey = process.env.APPSHEET_SECRET_KEY || process.env.MIGRATION_SECRET;

    if (apiKey !== expectedKey) {
      console.error('🔒 Authentication failed - Invalid API key');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔓 Authentication successful');

    // 3. Handle Employee Actions
    if (payload.Action === 'Employee_Add' || payload.Action === 'Employee_Edit') {
      console.log(`👤 Processing ${payload.Action} action...`);
      
      const employeeData: EmployeePayload = {
        maNhanVien: payload.maNhanVien!,
        hoVaTen: (payload as any).hoVaTen,
        phongBan: (payload as any).phongBan || null,
        chucVu: (payload as any).chucVu || null,
        hinhAnh: (payload as any).hinhAnh || null,
        soDienThoai: (payload as any).soDienThoai || null,
        email: (payload as any).email || null,
        chatId: (payload as any).chatId || null,
        trangThai: (payload as any).trangThai || 'Đang làm việc',
        ngayVaoLam: (payload as any).ngayVaoLam || null,
        ngayNghiViec: (payload as any).ngayNghiViec || null,
        diaChi: (payload as any).diaChi || null,
        soCccd: (payload as any).soCccd || null,
        ngaySinh: (payload as any).ngaySinh || null,
        gioiTinh: (payload as any).gioiTinh || null,
        tinhTrangHonNhan: (payload as any).tinhTrangHonNhan || null,
        nguoiLienHeKhanCap: (payload as any).nguoiLienHeKhanCap || null,
        soDienThoaiKhanCap: (payload as any).soDienThoaiKhanCap || null,
        phanQuyen: (payload as any).phanQuyen || 'user',
        xem: (payload as any).xem !== undefined ? (payload as any).xem : true,
        them: (payload as any).them !== undefined ? (payload as any).them : false,
        sua: (payload as any).sua !== undefined ? (payload as any).sua : false,
        xoa: (payload as any).xoa !== undefined ? (payload as any).xoa : false
      };

      try {
        await sql`
          INSERT INTO nhan_vien (
            ma_nhan_vien, ho_va_ten, phong_ban, chuc_vu, hinh_anh,
            so_dien_thoai, email, chat_id, trang_thai,
            ngay_vao_lam, ngay_nghi_viec, dia_chi, so_cccd, ngay_sinh,
            gioi_tinh, tinh_trang_hon_nhan, nguoi_lien_he_khan_cap,
            so_dien_thoai_khan_cap, phan_quyen, xem, them, sua, xoa
          ) VALUES (
            ${employeeData.maNhanVien}, ${employeeData.hoVaTen}, ${employeeData.phongBan},
            ${employeeData.chucVu}, ${employeeData.hinhAnh}, ${employeeData.soDienThoai},
            ${employeeData.email}, ${employeeData.chatId}, ${employeeData.trangThai},
            ${employeeData.ngayVaoLam}, ${employeeData.ngayNghiViec}, ${employeeData.diaChi},
            ${employeeData.soCccd}, ${employeeData.ngaySinh}, ${employeeData.gioiTinh},
            ${employeeData.tinhTrangHonNhan}, ${employeeData.nguoiLienHeKhanCap},
            ${employeeData.soDienThoaiKhanCap}, ${employeeData.phanQuyen},
            ${employeeData.xem}, ${employeeData.them}, ${employeeData.sua}, ${employeeData.xoa}
          )
          ON CONFLICT (ma_nhan_vien) DO UPDATE SET
            ho_va_ten = EXCLUDED.ho_va_ten,
            phong_ban = EXCLUDED.phong_ban,
            chuc_vu = EXCLUDED.chuc_vu,
            hinh_anh = EXCLUDED.hinh_anh,
            so_dien_thoai = EXCLUDED.so_dien_thoai,
            email = EXCLUDED.email,
            chat_id = EXCLUDED.chat_id,
            trang_thai = EXCLUDED.trang_thai,
            ngay_vao_lam = EXCLUDED.ngay_vao_lam,
            ngay_nghi_viec = EXCLUDED.ngay_nghi_viec,
            dia_chi = EXCLUDED.dia_chi,
            so_cccd = EXCLUDED.so_cccd,
            ngay_sinh = EXCLUDED.ngay_sinh,
            gioi_tinh = EXCLUDED.gioi_tinh,
            tinh_trang_hon_nhan = EXCLUDED.tinh_trang_hon_nhan,
            nguoi_lien_he_khan_cap = EXCLUDED.nguoi_lien_he_khan_cap,
            so_dien_thoai_khan_cap = EXCLUDED.so_dien_thoai_khan_cap,
            phan_quyen = EXCLUDED.phan_quyen,
            xem = EXCLUDED.xem,
            them = EXCLUDED.them,
            sua = EXCLUDED.sua,
            xoa = EXCLUDED.xoa,
            updated_at = CURRENT_TIMESTAMP
        `;

        console.log(`✅ Employee ${payload.Action} successful:`, employeeData.maNhanVien);
        return NextResponse.json({
          success: true,
          action: payload.Action,
          employeeCode: employeeData.maNhanVien,
          message: `Employee ${payload.Action === 'Employee_Add' ? 'created' : 'updated'} successfully`
        });
      } catch (dbError: any) {
        console.error('❌ Database error:', dbError.message);
        return NextResponse.json({
          error: 'Database error',
          message: dbError.message,
          code: dbError.code
        }, { status: 500 });
      }
    }

    // Handle Employee Delete
    if (payload.Action === 'Employee_Delete') {
      console.log('👤 Processing Employee_Delete action...');
      
      if (!payload.maNhanVien) {
        console.error('❌ Missing employee code');
        return NextResponse.json({
          error: 'Missing employee code'
        }, { status: 400 });
      }

      try {
        await sql`
          DELETE FROM nhan_vien
          WHERE ma_nhan_vien = ${payload.maNhanVien}
        `;

        console.log('✅ Employee deleted successfully:', payload.maNhanVien);
        return NextResponse.json({
          success: true,
          action: 'Employee_Delete',
          employeeCode: payload.maNhanVien,
          message: 'Employee deleted successfully'
        });
      } catch (dbError: any) {
        console.error('❌ Database error:', dbError.message);
        return NextResponse.json({
          error: 'Database error',
          message: dbError.message,
          code: dbError.code
        }, { status: 500 });
      }
    }

    // 4. Handle Fuel Import Actions
    if (payload.Action === 'FuelImport_Upsert') {
      console.log('⛽ Processing FuelImport_Upsert action...');
      
      if (!payload.data) {
        console.error('❌ Missing fuel import data');
        return NextResponse.json({
          error: 'Missing fuel import data'
        }, { status: 400 });
      }

      const fuelData = payload.data as FuelImportPayload;

      try {
        await sql`
          INSERT INTO fuel_imports (
            id,
            import_date,
            supplier,
            fuel_type,
            quantity,
            unit_price,
            total_amount,
            avg_price,
            created_by,
            updated_at
          ) VALUES (
            ${fuelData.id},
            ${fuelData.importDate},
            ${fuelData.supplier},
            ${fuelData.fuelType},
            ${fuelData.quantity || 0},
            ${fuelData.unitPrice || 0},
            ${fuelData.totalAmount || 0},
            ${fuelData.avgPrice || 0},
            ${fuelData.createdBy},
            NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            import_date = EXCLUDED.import_date,
            supplier = EXCLUDED.supplier,
            fuel_type = EXCLUDED.fuel_type,
            quantity = EXCLUDED.quantity,
            unit_price = EXCLUDED.unit_price,
            total_amount = EXCLUDED.total_amount,
            avg_price = EXCLUDED.avg_price,
            created_by = EXCLUDED.created_by,
            updated_at = NOW()
        `;

        console.log(`✅ Fuel import upserted: ${fuelData.id}`);

        return NextResponse.json({
          success: true,
          action: 'fuel_import_upsert',
          id: fuelData.id,
          message: 'Fuel import synchronized successfully'
        });

      } catch (dbError: any) {
        console.error('❌ Database error:', dbError.message);
        return NextResponse.json({
          error: 'Database error',
          message: dbError.message
        }, { status: 500 });
      }
    }

    if (payload.Action === 'FuelImport_Delete') {
      console.log('🗑️  Processing FuelImport_Delete action...');
      
      if (!payload.id) {
        console.error('❌ Missing fuel import ID');
        return NextResponse.json({
          error: 'Missing fuel import ID'
        }, { status: 400 });
      }

      try {
        await sql`
          DELETE FROM fuel_imports
          WHERE id = ${payload.id}
        `;

        console.log(`✅ Fuel import deleted: ${payload.id}`);

        return NextResponse.json({
          success: true,
          action: 'fuel_import_delete',
          id: payload.id,
          message: 'Fuel import deleted successfully'
        });

      } catch (dbError: any) {
        console.error('❌ Database error:', dbError.message);
        return NextResponse.json({
          error: 'Database error',
          message: dbError.message
        }, { status: 500 });
      }
    }

    // 4. Handle Fuel Transaction Actions with Auto-Calculation
    if (payload.Action === 'FuelTransaction_Upsert') {
      console.log('⛽ Processing FuelTransaction_Upsert action...');
      
      if (!payload.data) {
        console.error('❌ Missing fuel transaction data');
        return NextResponse.json({
          error: 'Missing fuel transaction data'
        }, { status: 400 });
      }

      const transData = payload.data as FuelTransactionPayload;

      try {
        // Step 1: Map category to is_full_tank flag
        const categoryUpper = (transData.category || '').trim();
        const isFullTank = ['CHỐT THÁNG', 'BÀN GIAO', 'KHỞI TẠO'].includes(categoryUpper.toUpperCase());
        const isInitialization = categoryUpper.toUpperCase() === 'KHỞI TẠO';

        console.log(`📊 Category: "${categoryUpper}" → is_full_tank: ${isFullTank}, is_init: ${isInitialization}`);

        // Step 2: Insert/Update the current record
        await sql`
          INSERT INTO fuel_transactions (
            id,
            transaction_date,
            fuel_source,
            object,
            license_plate,
            driver_name,
            fuel_type,
            quantity,
            unit_price,
            total_amount,
            odo_number,
            status,
            category,
            is_full_tank,
            updated_at
          ) VALUES (
            ${transData.id},
            ${transData.transactionDate},
            ${transData.fuelSource},
            ${transData.object},
            ${transData.licensePlate},
            ${transData.driverName},
            ${transData.fuelType},
            ${transData.quantity || 0},
            ${transData.unitPrice || 0},
            ${transData.totalAmount || 0},
            ${transData.odoNumber || 0},
            ${transData.status},
            ${transData.category},
            ${isFullTank},
            NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            transaction_date = EXCLUDED.transaction_date,
            fuel_source = EXCLUDED.fuel_source,
            object = EXCLUDED.object,
            license_plate = EXCLUDED.license_plate,
            driver_name = EXCLUDED.driver_name,
            fuel_type = EXCLUDED.fuel_type,
            quantity = EXCLUDED.quantity,
            unit_price = EXCLUDED.unit_price,
            total_amount = EXCLUDED.total_amount,
            odo_number = EXCLUDED.odo_number,
            status = EXCLUDED.status,
            category = EXCLUDED.category,
            is_full_tank = EXCLUDED.is_full_tank,
            updated_at = NOW()
        `;

        console.log(`✅ Fuel transaction upserted: ${transData.id}`);

        // Step 3: Auto-Calculation Logic (Look-back Algorithm)
        if (isFullTank && !isInitialization && transData.licensePlate) {
          console.log(`🔄 Starting auto-calculation for ${transData.id}...`);

          try {
            // 3.1: Find previous full-tank record (Start Point)
            const previousResult = await sql`
              SELECT id, odo_number, transaction_date
              FROM fuel_transactions
              WHERE license_plate = ${transData.licensePlate}
                AND is_full_tank = TRUE
                AND transaction_date < ${transData.transactionDate}
              ORDER BY transaction_date DESC, updated_at DESC
              LIMIT 1
            `;

            if (previousResult.rows.length === 0) {
              console.log(`⚠️  No previous full-tank record found. Skipping calculation.`);
            } else {
              const previous = previousResult.rows[0];
              const prevOdo = parseFloat(previous.odo_number) || 0;
              const currentOdo = parseFloat(String(transData.odoNumber)) || 0;

              console.log(`📍 Previous: ID=${previous.id}, ODO=${prevOdo}, Date=${previous.transaction_date}`);
              console.log(`📍 Current: ID=${transData.id}, ODO=${currentOdo}`);

              // 3.2: Calculate km_traveled
              const kmTraveled = currentOdo - prevOdo;

              if (kmTraveled <= 0) {
                console.log(`⚠️  Invalid km_traveled (${kmTraveled}). Skipping calculation.`);
              } else {
                // 3.3: Sum intermediate "Đổ dặm" transactions
                const intermediateResult = await sql`
                  SELECT COALESCE(SUM(quantity), 0) as total_intermediate
                  FROM fuel_transactions
                  WHERE license_plate = ${transData.licensePlate}
                    AND is_full_tank = FALSE
                    AND transaction_date > ${previous.transaction_date}
                    AND transaction_date < ${transData.transactionDate}
                `;

                const totalIntermediate = parseFloat(intermediateResult.rows[0]?.total_intermediate) || 0;
                const currentQuantity = parseFloat(String(transData.quantity)) || 0;
                const totalFuelPeriod = totalIntermediate + currentQuantity;

                console.log(`⛽ Intermediate fuel: ${totalIntermediate}L, Current: ${currentQuantity}L, Total: ${totalFuelPeriod}L`);

                // 3.4: Calculate efficiency (L/100km)
                const efficiency = (totalFuelPeriod / kmTraveled) * 100;

                console.log(`📊 Results: km=${kmTraveled}, fuel=${totalFuelPeriod}L, efficiency=${efficiency.toFixed(4)}L/100km`);

                // 3.5: Update current record with calculated values
                await sql`
                  UPDATE fuel_transactions
                  SET 
                    km_traveled = ${kmTraveled},
                    total_fuel_period = ${totalFuelPeriod},
                    efficiency = ${efficiency}
                  WHERE id = ${transData.id}
                `;

                console.log(`✅ Auto-calculation completed for ${transData.id}`);
              }
            }

          } catch (calcError: any) {
            console.error(`❌ Calculation error for ${transData.id}:`, calcError.message);
            // Don't fail the entire request - calculation is non-critical
          }
        } else {
          if (isInitialization) {
            console.log(`🎯 Initialization record - skipping calculation`);
          } else if (!isFullTank) {
            console.log(`⏭️  Not a full-tank record - skipping calculation`);
          }
        }

        return NextResponse.json({
          success: true,
          action: 'fuel_transaction_upsert',
          id: transData.id,
          message: 'Fuel transaction synchronized successfully',
          calculated: isFullTank && !isInitialization
        });

      } catch (dbError: any) {
        console.error('❌ Database error:', dbError.message);
        return NextResponse.json({
          error: 'Database error',
          message: dbError.message
        }, { status: 500 });
      }
    }

    if (payload.Action === 'FuelTransaction_Delete') {
      console.log('🗑️  Processing FuelTransaction_Delete action...');
      
      if (!payload.id) {
        console.error('❌ Missing fuel transaction ID');
        return NextResponse.json({
          error: 'Missing fuel transaction ID'
        }, { status: 400 });
      }

      try {
        await sql`
          DELETE FROM fuel_transactions
          WHERE id = ${payload.id}
        `;

        console.log(`✅ Fuel transaction deleted: ${payload.id}`);

        return NextResponse.json({
          success: true,
          action: 'fuel_transaction_delete',
          id: payload.id,
          message: 'Fuel transaction deleted successfully'
        });

      } catch (dbError: any) {
        console.error('❌ Database error:', dbError.message);
        return NextResponse.json({
          error: 'Database error',
          message: dbError.message
        }, { status: 500 });
      }
    }

    // 5. Handle UpsertVehicles action
    if (payload.Action === 'UpsertVehicles') {
      console.log('🚗 Processing UpsertVehicles action...');
      
      if (!payload.vehicles || !Array.isArray(payload.vehicles)) {
        console.error('❌ Missing or invalid vehicles array');
        return NextResponse.json({
          error: 'Missing or invalid vehicles array'
        }, { status: 400 });
      }

      console.log(`📦 Received ${payload.vehicles.length} vehicles`);

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Process each vehicle
      for (const vehicle of payload.vehicles) {
        try {
          // Validate required field
          if (!vehicle.licensePlate || vehicle.licensePlate.trim() === '') {
            throw new Error('licensePlate is required');
          }

          // Upsert vehicle
          await sql`
            INSERT INTO vehicles (
              license_plate,
              weight_capacity,
              weight_unit,
              weight_text,
              brand,
              body_type,
              current_status,
              fuel_norm,
              assigned_driver_codes,
              provider,
              updated_at
            ) VALUES (
              ${vehicle.licensePlate.trim()},
              ${vehicle.weightCapacity || 0},
              ${vehicle.weightUnit},
              ${vehicle.weightText},
              ${vehicle.brand},
              ${vehicle.bodyType},
              ${vehicle.currentStatus},
              ${vehicle.fuelNorm || 0},
              ${vehicle.assignedDriverCodes},
              ${vehicle.provider},
              NOW()
            )
            ON CONFLICT (license_plate) DO UPDATE SET
              weight_capacity = EXCLUDED.weight_capacity,
              weight_unit = EXCLUDED.weight_unit,
              weight_text = EXCLUDED.weight_text,
              brand = EXCLUDED.brand,
              body_type = EXCLUDED.body_type,
              current_status = EXCLUDED.current_status,
              fuel_norm = EXCLUDED.fuel_norm,
              assigned_driver_codes = EXCLUDED.assigned_driver_codes,
              provider = EXCLUDED.provider,
              updated_at = NOW()
          `;

          successCount++;
          console.log(`✅ Vehicle upserted: ${vehicle.licensePlate}`);

        } catch (vehicleError: any) {
          errorCount++;
          const errorMsg = `${vehicle.licensePlate || 'UNKNOWN'}: ${vehicleError.message}`;
          errors.push(errorMsg);
          console.error(`❌ Vehicle error: ${errorMsg}`);
        }
      }

      console.log(`========================================`);
      console.log(`✅ UpsertVehicles completed`);
      console.log(`   Success: ${successCount}`);
      console.log(`   Errors: ${errorCount}`);
      console.log(`========================================`);

      return NextResponse.json({
        success: true,
        action: 'upsert_vehicles',
        total: payload.vehicles.length,
        successCount,
        errorCount,
        errors: errors.length > 0 ? errors : undefined
      });
    }

    // 6. Validate required fields for reconciliation actions
    if (!payload.maChuyenDi) {
      console.error('❌ Missing required field: maChuyenDi');
      return NextResponse.json({
        error: 'Missing required field: maChuyenDi'
      }, { status: 400 });
    }

    console.log('🎬 Action:', payload.Action);
    console.log('🆔 Order ID:', payload.maChuyenDi);

    // 7. Handle DELETE action
    if (payload.Action === 'Delete') {
      console.log('🗑️  Processing DELETE action...');
      
      await sql`
        DELETE FROM reconciliation_orders
        WHERE order_id = ${payload.maChuyenDi}
      `;

      console.log('✅ Delete successful:', payload.maChuyenDi);

      return NextResponse.json({
        success: true,
        action: 'delete',
        orderId: payload.maChuyenDi,
        message: 'Record deleted successfully'
      });
    }

    // 8. Handle ADD/EDIT - Normalize payload
    console.log('🔄 Processing ADD/EDIT action...');
    console.log('📊 Starting payload normalization...');
    
    const normalized = normalizePayload(payload);
    
    console.log('✅ Payload normalized successfully');
    console.log('📋 Normalized Data:');
    console.log(`   - Order ID: ${normalized.orderId}`);
    console.log(`   - Date: ${normalized.date}`);
    console.log(`   - Customer: ${normalized.customer}`);
    console.log(`   - Revenue: ${normalized.revenue} (from tongDoanhThu: ${payload.tongDoanhThu})`);
    console.log(`   - Cost: ${normalized.cost} (chi phí)`);
    console.log(`   - Distance: ${normalized.totalDistance} (from tongQuangDuong: ${payload.tongQuangDuong})`);
    console.log(`   - Status: ${normalized.status} (from trangThai: "${payload.trangThai}")`);
    console.log(`   - Provider: ${normalized.provider}`);
    console.log(`   - Driver: ${normalized.driverName}`);
    console.log(`   - Trip Type: ${normalized.tripType}`);
    console.log(`   - Route Type: ${normalized.routeType}`);
    console.log(`   - Route Name: ${normalized.routeName}`);
    console.log(`   - Weight: ${normalized.weight}`);

    // 9. Execute UPSERT with normalized data
    console.log('💾 Executing database UPSERT...');
    console.log('[DB INSERT] Values to insert:');
    console.log(`  - revenue: ${normalized.revenue}`);
    console.log(`  - cost: ${normalized.cost}`);
    
    const detailsJson = JSON.stringify(normalized.details);
    
    try {
      await sql`
        INSERT INTO reconciliation_orders (
          order_id,
          date,
          customer,
          trip_type,
          route_type,
          route_name,
          driver_name,
          provider,
          total_distance,
          cost,
          revenue,
          status,
          weight,
          note,
          details
        ) VALUES (
          ${normalized.orderId},
          ${normalized.date},
          ${normalized.customer},
          ${normalized.tripType},
          ${normalized.routeType},
          ${normalized.routeName},
          ${normalized.driverName},
          ${normalized.provider},
          ${normalized.totalDistance},
          ${normalized.cost},
          ${normalized.revenue},
          ${normalized.status},
          ${normalized.weight},
          ${normalized.note},
          ${detailsJson}
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
          revenue = EXCLUDED.revenue,
          status = EXCLUDED.status,
          weight = EXCLUDED.weight,
          note = EXCLUDED.note,
          details = EXCLUDED.details,
          updated_at = CURRENT_TIMESTAMP
      `;

      console.log('✅ Database UPSERT successful');
      console.log('========================================');

    } catch (dbError: any) {
      console.error('========================================');
      console.error('❌ DATABASE ERROR');
      console.error('Error:', dbError.message);
      console.error('Code:', dbError.code);
      console.error('Order ID:', normalized.orderId);
      console.error('========================================');

      return NextResponse.json({
        error: 'Database error',
        message: dbError.message,
        code: dbError.code,
        orderId: normalized.orderId
      }, { status: 500 });
    }

    // 10. Return success response
    return NextResponse.json({
      success: true,
      action: payload.Action.toLowerCase(),
      orderId: normalized.orderId,
      message: 'Record synchronized successfully',
      normalized: {
        cost: normalized.cost,
        totalDistance: normalized.totalDistance,
        status: normalized.status,
        provider: normalized.provider,
        routeName: normalized.routeName,
        weight: normalized.weight
      }
    });

  } catch (error: any) {
    console.error('========================================');
    console.error('❌ GLOBAL ERROR');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('========================================');

    return NextResponse.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
}
