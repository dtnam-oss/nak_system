import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// UPDATE salary record
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    console.log(`📝 Updating salary record ${id}`);

    // Update all financial fields
    const result = await query(`
      UPDATE luong_tong_hop
      SET
        luong_chuyen = $1,
        cp_sua_chua = $2,
        cp_do_dau = $3,
        cp_phat_sinh = $4,
        cp_ccdc = $5,
        ho_tro = $6,
        truy_thu = $7,
        tru_coc = $8,
        hoan_coc = $9,
        tam_ung = $10,
        phat_nguoi = $11,
        bhxh = $12,
        khac = $13
      WHERE id = $14
      RETURNING *
    `, [
      body.luong_chuyen || 0,
      body.cp_sua_chua || 0,
      body.cp_do_dau || 0,
      body.cp_phat_sinh || 0,
      body.cp_ccdc || 0,
      body.ho_tro || 0,
      body.truy_thu || 0,
      body.tru_coc || 0,
      body.hoan_coc || 0,
      body.tam_ung || 0,
      body.phat_nguoi || 0,
      body.bhxh || 0,
      body.khac || 0,
      id,
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Salary record not found' },
        { status: 404 }
      );
    }

    console.log(`✅ Updated salary record ${id}`);

    return NextResponse.json({
      success: true,
      message: 'Salary record updated successfully',
      data: result.rows[0],
    });

  } catch (error: any) {
    console.error('❌ Update Salary Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update salary record',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// DELETE salary record
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log(`🗑️  Deleting salary record ${id}`);

    const result = await query(`
      DELETE FROM luong_tong_hop
      WHERE id = $1
      RETURNING ma_nhan_vien, ten_nhan_vien, thang, nam
    `, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Salary record not found' },
        { status: 404 }
      );
    }

    console.log(`✅ Deleted salary record ${id}`);

    return NextResponse.json({
      success: true,
      message: 'Salary record deleted successfully',
      data: result.rows[0],
    });

  } catch (error: any) {
    console.error('❌ Delete Salary Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete salary record',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
