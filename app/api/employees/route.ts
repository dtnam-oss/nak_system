import { NextRequest, NextResponse } from 'next/server';
import { sql, query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Get employees list
 * API endpoint for employee management
 * 
 * GET /api/employees?active=true
 * GET /api/employees?ma_nhan_vien=NAK001
 * GET /api/employees?phong_ban=IT
 * GET /api/employees?phan_quyen=admin
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const maNhanVien = searchParams.get('ma_nhan_vien');
    const active = searchParams.get('active');
    const phongBan = searchParams.get('phong_ban');
    const phanQuyen = searchParams.get('phan_quyen');
    const chatId = searchParams.get('chat_id');

    // Handle specific queries
    if (maNhanVien) {
      const result = await sql`
        SELECT * FROM nhan_vien WHERE ma_nhan_vien = ${maNhanVien}
      `;
      
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      }
      
      return NextResponse.json(result.rows[0]);
    }

    if (chatId) {
      const result = await sql`
        SELECT * FROM nhan_vien WHERE chat_id = ${chatId}
      `;
      
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      }
      
      return NextResponse.json(result.rows[0]);
    }

    // Apply filters
    const conditions: string[] = [];
    const params: any[] = [];

    if (active !== null && active === 'true') {
      // Filter active employees (not "Đã nghỉ việc")
      conditions.push(`(trang_thai IS NULL OR trang_thai NOT ILIKE '%nghỉ việc%')`);
    } else if (active !== null && active === 'false') {
      // Filter inactive employees
      conditions.push(`trang_thai ILIKE '%nghỉ việc%'`);
    }

    if (phongBan) {
      conditions.push(`phong_ban = '${phongBan}'`);
    }

    if (phanQuyen) {
      conditions.push(`phan_quyen = '${phanQuyen}'`);
    }

    let queryStr = `
      SELECT 
        ma_nhan_vien,
        ho_va_ten,
        phong_ban,
        chuc_vu,
        hinh_anh,
        so_dien_thoai,
        email,
        chat_id,
        tinh_trang_cong_tac,
        ngay_vao_lam,
        phan_quyen,
        xem,
        them,
        sua,
        xoa,
        trang_thai,
        ngay_sinh,
        so_can_cuoc
      FROM nhan_vien
    `;

    if (conditions.length > 0) {
      queryStr += ' WHERE ' + conditions.join(' AND ');
    }

    queryStr += ' ORDER BY ma_nhan_vien ASC';

    const result = await query(queryStr, []);

    return NextResponse.json({
      total: result.rows.length,
      employees: result.rows,
    });

  } catch (error) {
    console.error('❌ Error fetching employees:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Create new employee
 *
 * POST /api/employees
 * Body: { ma_nhan_vien: 'NAK001', ho_va_ten: 'Nguyen Van A', ... }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      ma_nhan_vien,
      ho_va_ten,
      phong_ban,
      chuc_vu,
      hinh_anh,
      so_dien_thoai,
      email,
      chat_id,
      tinh_trang_cong_tac,
      ngay_vao_lam,
      ngay_ky_hdld,
      ngay_tham_gia_cong_doan,
      ngay_tham_gia_bhxh,
      giam_tru_gia_canh,
      luong_thoa_thuan,
      tien_coc,
      phan_quyen,
      xem,
      them,
      sua,
      xoa,
    } = body;

    // Validation
    if (!ma_nhan_vien || !ho_va_ten) {
      return NextResponse.json(
        { error: 'ma_nhan_vien và ho_va_ten là bắt buộc' },
        { status: 400 }
      );
    }

    // Validate ma_nhan_vien format
    if (!/^NAK\d{3,}$/.test(ma_nhan_vien)) {
      return NextResponse.json(
        { error: 'Mã nhân viên phải có định dạng NAK001, NAK002, ...' },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Email không hợp lệ' },
        { status: 400 }
      );
    }

    // Check if ma_nhan_vien already exists
    const existingEmployee = await sql`
      SELECT ma_nhan_vien FROM nhan_vien WHERE ma_nhan_vien = ${ma_nhan_vien}
    `;

    if (existingEmployee.rows.length > 0) {
      return NextResponse.json(
        { error: 'Mã nhân viên đã tồn tại' },
        { status: 409 }
      );
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await sql`
        SELECT email FROM nhan_vien WHERE email = ${email}
      `;

      if (existingEmail.rows.length > 0) {
        return NextResponse.json(
          { error: 'Email đã được sử dụng' },
          { status: 409 }
        );
      }
    }

    // Insert new employee
    const result = await sql`
      INSERT INTO nhan_vien (
        ma_nhan_vien,
        ho_va_ten,
        phong_ban,
        chuc_vu,
        hinh_anh,
        so_dien_thoai,
        email,
        chat_id,
        tinh_trang_cong_tac,
        ngay_vao_lam,
        ngay_ky_hdld,
        ngay_tham_gia_cong_doan,
        ngay_tham_gia_bhxh,
        giam_tru_gia_canh,
        luong_thoa_thuan,
        tien_coc,
        phan_quyen,
        xem,
        them,
        sua,
        xoa,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        ${ma_nhan_vien},
        ${ho_va_ten},
        ${phong_ban || null},
        ${chuc_vu || null},
        ${hinh_anh || null},
        ${so_dien_thoai || null},
        ${email || null},
        ${chat_id || null},
        ${tinh_trang_cong_tac || null},
        ${ngay_vao_lam || null},
        ${ngay_ky_hdld || null},
        ${ngay_tham_gia_cong_doan || null},
        ${ngay_tham_gia_bhxh || null},
        ${giam_tru_gia_canh || 0},
        ${luong_thoa_thuan || 0},
        ${tien_coc || 0},
        ${phan_quyen || 'user'},
        ${xem !== undefined ? xem : true},
        ${them !== undefined ? them : false},
        ${sua !== undefined ? sua : false},
        ${xoa !== undefined ? xoa : false},
        true,
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    return NextResponse.json({
      success: true,
      employee: result.rows[0],
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Error creating employee:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Update employee
 *
 * PUT /api/employees
 * Body: { ma_nhan_vien: 'NAK001', ... }
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { ma_nhan_vien } = body;

    if (!ma_nhan_vien) {
      return NextResponse.json(
        { error: 'ma_nhan_vien is required' },
        { status: 400 }
      );
    }

    // Build update query dynamically
    const updateableFields = [
      'ho_va_ten', 'phong_ban', 'chuc_vu', 'hinh_anh',
      'so_dien_thoai', 'email', 'chat_id',
      'tinh_trang_cong_tac', 'ngay_vao_lam', 'ngay_ky_hdld',
      'ngay_tham_gia_cong_doan', 'ngay_tham_gia_bhxh', 'ngay_thoi_viec',
      'giam_tru_gia_canh', 'luong_thoa_thuan', 'tien_coc',
      'phan_quyen', 'xem', 'them', 'sua', 'xoa'
    ];

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const field of updateableFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(body[field]);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Add updated_at
    updates.push(`updated_at = NOW()`);

    // Add ma_nhan_vien to values for WHERE clause
    values.push(ma_nhan_vien);

    const queryStr = `
      UPDATE nhan_vien
      SET ${updates.join(', ')}
      WHERE ma_nhan_vien = $${paramIndex}
      RETURNING *
    `;

    const result = await query(queryStr, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      employee: result.rows[0],
    });

  } catch (error) {
    console.error('❌ Error updating employee:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Delete employee (soft delete)
 *
 * DELETE /api/employees?ma_nhan_vien=NAK001
 */
export async function DELETE(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const maNhanVien = searchParams.get('ma_nhan_vien');

    if (!maNhanVien) {
      return NextResponse.json(
        { error: 'ma_nhan_vien is required' },
        { status: 400 }
      );
    }

    // Soft delete: set is_active = false and ngay_thoi_viec = NOW()
    const result = await sql`
      UPDATE nhan_vien
      SET
        is_active = false,
        ngay_thoi_viec = NOW(),
        updated_at = NOW()
      WHERE ma_nhan_vien = ${maNhanVien}
      RETURNING *
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error('❌ Error deleting employee:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
