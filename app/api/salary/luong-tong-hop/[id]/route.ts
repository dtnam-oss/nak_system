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

    // Update all financial fields with new structure
    const result = await query(`
      UPDATE luong_tong_hop
      SET
        luong_bat_dau = $1,
        tong_chi_phi_sua_chua = $2,
        hoan_coc = $3,
        chi_phi_do_dau_ngoai = $4,
        chi_phi_phat_sinh_new = $5,
        truy_thu_dau = $6,
        truy_thu_ontime = $7,
        tru_coc = $8,
        tam_ung = $9,
        phat_che_tai = $10,
        truy_thu_vetc = $11,
        phat_nguoi = $12,
        tien_lam_the = $13,
        bhxh = $14,
        khac = $15,
        updated_at = NOW()
      WHERE id = $16
      RETURNING *
    `, [
      body.luong_bat_dau || 0,
      body.tong_chi_phi_sua_chua || 0,
      body.hoan_coc || 0,
      body.chi_phi_do_dau_ngoai || 0,
      body.chi_phi_phat_sinh_new || 0,
      body.truy_thu_dau || 0,
      body.truy_thu_ontime || 0,
      body.tru_coc || 0,
      body.tam_ung || 0,
      body.phat_che_tai || 0,
      body.truy_thu_vetc || 0,
      body.phat_nguoi || 0,
      body.tien_lam_the || 0,
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

    // Convert numeric fields to actual numbers
    const updatedRecord = {
      ...result.rows[0],
      luong_bat_dau: parseFloat(result.rows[0].luong_bat_dau) || 0,
      tong_chi_phi_sua_chua: parseFloat(result.rows[0].tong_chi_phi_sua_chua) || 0,
      hoan_coc: parseFloat(result.rows[0].hoan_coc) || 0,
      chi_phi_do_dau_ngoai: parseFloat(result.rows[0].chi_phi_do_dau_ngoai) || 0,
      chi_phi_phat_sinh_new: parseFloat(result.rows[0].chi_phi_phat_sinh_new) || 0,
      truy_thu_dau: parseFloat(result.rows[0].truy_thu_dau) || 0,
      truy_thu_ontime: parseFloat(result.rows[0].truy_thu_ontime) || 0,
      tru_coc: parseFloat(result.rows[0].tru_coc) || 0,
      tam_ung: parseFloat(result.rows[0].tam_ung) || 0,
      phat_che_tai: parseFloat(result.rows[0].phat_che_tai) || 0,
      truy_thu_vetc: parseFloat(result.rows[0].truy_thu_vetc) || 0,
      phat_nguoi: parseFloat(result.rows[0].phat_nguoi) || 0,
      tien_lam_the: parseFloat(result.rows[0].tien_lam_the) || 0,
      bhxh: parseFloat(result.rows[0].bhxh) || 0,
      khac: parseFloat(result.rows[0].khac) || 0,
    };

    return NextResponse.json({
      success: true,
      message: 'Salary record updated successfully',
      data: updatedRecord,
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
