import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 1. Check authentication
    const session = await getSession();
    if (!session?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const { id, status, ngay_thanh_toan } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Salary record ID is required' },
        { status: 400 }
      );
    }

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Status is required' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['chua_thanh_toan', 'da_xac_nhan', 'da_thanh_toan'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // 3. Check if record exists
    const checkResult = await query(`
      SELECT id, ma_nhan_vien, ho_va_ten, trang_thai
      FROM bang_luong
      WHERE id = $1
    `, [id]);

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Salary record not found' },
        { status: 404 }
      );
    }

    // 4. Update status
    const updateParams: any[] = [status];
    let updateQuery = 'UPDATE bang_luong SET trang_thai = $1';
    let paramIndex = 2;

    // If status is 'da_thanh_toan' and ngay_thanh_toan is provided, update it
    if (status === 'da_thanh_toan' && ngay_thanh_toan) {
      updateQuery += `, ngay_thanh_toan = $${paramIndex++}`;
      updateParams.push(ngay_thanh_toan);
    } else if (status === 'da_thanh_toan' && !ngay_thanh_toan) {
      // Auto-set to today if not provided
      updateQuery += `, ngay_thanh_toan = CURRENT_DATE`;
    }

    updateQuery += `, updated_at = NOW() WHERE id = $${paramIndex}`;
    updateParams.push(id);

    await query(updateQuery, updateParams);

    // 5. Fetch updated record
    const updatedResult = await query(`
      SELECT
        id,
        ma_nhan_vien,
        ho_va_ten,
        trang_thai,
        ngay_thanh_toan,
        thuc_lanh,
        updated_at
      FROM bang_luong
      WHERE id = $1
    `, [id]);

    return NextResponse.json({
      success: true,
      message: `Cập nhật trạng thái thành công`,
      data: updatedResult.rows[0],
    });

  } catch (error: any) {
    console.error('❌ Update Salary Status Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update salary status',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
