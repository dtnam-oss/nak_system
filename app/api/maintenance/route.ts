import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Optional filters
    const maNhanVien = searchParams.get('ma_nhan_vien');
    const bienSoXe = searchParams.get('bien_so_xe');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('📊 Fetching chi_phi_sua_chua data with filters:', {
      maNhanVien,
      bienSoXe,
      fromDate,
      toDate,
      limit,
      offset,
    });

    // Build WHERE clause dynamically
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (maNhanVien) {
      conditions.push(`ma_nhan_vien = $${paramIndex}`);
      params.push(maNhanVien);
      paramIndex++;
    }

    if (bienSoXe) {
      conditions.push(`bien_so_xe = $${paramIndex}`);
      params.push(bienSoXe);
      paramIndex++;
    }

    if (fromDate) {
      conditions.push(`ngay >= $${paramIndex}`);
      params.push(fromDate);
      paramIndex++;
    }

    if (toDate) {
      conditions.push(`ngay <= $${paramIndex}`);
      params.push(toDate);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';

    // Add limit and offset to params
    params.push(limit);
    const limitParam = `$${paramIndex}`;
    paramIndex++;
    
    params.push(offset);
    const offsetParam = `$${paramIndex}`;

    // Query maintenance records
    const result = await query(`
      SELECT
        id,
        ngay,
        loai_xe,
        bien_so_xe,
        loai_phu_tung,
        ma_phu_tung,
        ten_phu_tung,
        COALESCE(so_luong, 0) as so_luong,
        COALESCE(don_gia, 0) as don_gia,
        COALESCE(thanh_tien, 0) as thanh_tien,
        COALESCE(km_sua_chua, 0) as km_sua_chua,
        COALESCE(so_tien, 0) as so_tien,
        ca_nhan_thanh_toan,
        dia_chi_sua_chua,
        ma_nhan_vien,
        ten_nhan_vien
      FROM chi_phi_sua_chua
      ${whereClause}
      ORDER BY ngay DESC
      LIMIT ${limitParam}
      OFFSET ${offsetParam}
    `, params);

    // Get total count for pagination
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM chi_phi_sua_chua
      ${whereClause}
    `, params.slice(0, -2)); // Remove limit and offset params

    const totalRecords = parseInt(countResult.rows[0]?.total || '0');

    // Calculate summary statistics
    const summaryResult = await query(`
      SELECT
        COUNT(*) as total_records,
        SUM(COALESCE(so_tien, 0)) as total_cost,
        COUNT(DISTINCT bien_so_xe) as total_vehicles,
        COUNT(DISTINCT ma_nhan_vien) as total_drivers
      FROM chi_phi_sua_chua
      ${whereClause}
    `, params.slice(0, -2));

    // Process data - convert numeric fields from strings to numbers
    const processedData = result.rows.map(row => ({
      ...row,
      so_luong: parseFloat(row.so_luong) || 0,
      don_gia: parseFloat(row.don_gia) || 0,
      thanh_tien: parseFloat(row.thanh_tien) || 0,
      km_sua_chua: parseFloat(row.km_sua_chua) || 0,
      so_tien: parseFloat(row.so_tien) || 0,
    }));

    const summary = summaryResult.rows[0];

    return NextResponse.json({
      success: true,
      data: processedData,
      count: processedData.length,
      total: totalRecords,
      pagination: {
        limit,
        offset,
        hasMore: offset + processedData.length < totalRecords,
      },
      summary: {
        total_records: parseInt(summary.total_records || '0'),
        total_cost: parseFloat(summary.total_cost || '0'),
        total_vehicles: parseInt(summary.total_vehicles || '0'),
        total_drivers: parseInt(summary.total_drivers || '0'),
      },
      filters: {
        ma_nhan_vien: maNhanVien,
        bien_so_xe: bienSoXe,
        from_date: fromDate,
        to_date: toDate,
      },
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });

  } catch (error: any) {
    console.error('❌ Maintenance Cost Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch maintenance cost data',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
