import { NextRequest, NextResponse } from 'next/server';
import { sql, query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Get employees list
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

    let query = sql`
      SELECT 
        id,
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
        is_active,
        last_login
      FROM nhan_vien
      WHERE 1=1
    `;

    // Build dynamic query based on filters
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

    if (active !== null) {
      conditions.push(`is_active = ${active === 'true'}`);
    }

    if (phongBan) {
      conditions.push(`phong_ban = '${phongBan}'`);
    }

    if (phanQuyen) {
      conditions.push(`phan_quyen = '${phanQuyen}'`);
    }

    let queryStr = `
      SELECT 
        id,
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
        is_active,
        last_login
      FROM nhan_vien
    `;

    if (conditions.length > 0) {
      queryStr += ' WHERE ' + conditions.join(' AND ');
    }

    queryStr += ' ORDER BY ma_nhan_vien ASC';

    const result = await query(queryStr);

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
 * Update employee (e.g., update chat_id, last_login)
 * 
 * PUT /api/employees
 * Body: { ma_nhan_vien: 'NAK001', chat_id: '123456789' }
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { ma_nhan_vien, chat_id, last_login } = body;

    if (!ma_nhan_vien) {
      return NextResponse.json(
        { error: 'ma_nhan_vien is required' },
        { status: 400 }
      );
    }

    // Build update query
    const updates: string[] = [];
    if (chat_id !== undefined) updates.push(`chat_id = '${chat_id}'`);
    if (last_login) updates.push(`last_login = NOW()`);
    updates.push(`updated_at = NOW()`);

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const queryStr = `
      UPDATE nhan_vien 
      SET ${updates.join(', ')}
      WHERE ma_nhan_vien = '${ma_nhan_vien}'
      RETURNING *
    `;

    const result = await query(queryStr);

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
