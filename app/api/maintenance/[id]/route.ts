import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// UPDATE maintenance record
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    console.log(`📝 Updating maintenance record ${id}`);

    // Calculate thanh_tien if so_luong and don_gia are provided
    const thanhTien = body.thanh_tien || (
      (body.so_luong || 0) * (body.don_gia || 0)
    );

    const result = await query(`
      UPDATE chi_phi_sua_chua
      SET
        ngay = COALESCE($1, ngay),
        loai_xe = COALESCE($2, loai_xe),
        bien_so_xe = COALESCE($3, bien_so_xe),
        loai_phu_tung = COALESCE($4, loai_phu_tung),
        ma_phu_tung = COALESCE($5, ma_phu_tung),
        ten_phu_tung = COALESCE($6, ten_phu_tung),
        so_luong = COALESCE($7, so_luong),
        don_gia = COALESCE($8, don_gia),
        thanh_tien = COALESCE($9, thanh_tien),
        km_sua_chua = COALESCE($10, km_sua_chua),
        so_tien = COALESCE($11, so_tien),
        ca_nhan_thanh_toan = COALESCE($12, ca_nhan_thanh_toan),
        dia_chi_sua_chua = COALESCE($13, dia_chi_sua_chua),
        ma_nhan_vien = COALESCE($14, ma_nhan_vien),
        ten_nhan_vien = COALESCE($15, ten_nhan_vien)
      WHERE id = $16
      RETURNING *
    `, [
      body.ngay,
      body.loai_xe,
      body.bien_so_xe,
      body.loai_phu_tung,
      body.ma_phu_tung,
      body.ten_phu_tung,
      body.so_luong,
      body.don_gia,
      thanhTien,
      body.km_sua_chua,
      body.so_tien,
      body.ca_nhan_thanh_toan,
      body.dia_chi_sua_chua,
      body.ma_nhan_vien,
      body.ten_nhan_vien,
      id,
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Maintenance record not found' },
        { status: 404 }
      );
    }

    console.log(`✅ Updated maintenance record ${id}`);

    // Convert numeric fields to actual numbers
    const updatedRecord = {
      ...result.rows[0],
      so_luong: parseFloat(result.rows[0].so_luong) || 0,
      don_gia: parseFloat(result.rows[0].don_gia) || 0,
      thanh_tien: parseFloat(result.rows[0].thanh_tien) || 0,
      km_sua_chua: parseFloat(result.rows[0].km_sua_chua) || 0,
      so_tien: parseFloat(result.rows[0].so_tien) || 0,
    };

    return NextResponse.json({
      success: true,
      message: 'Maintenance record updated successfully',
      data: updatedRecord,
    });

  } catch (error: any) {
    console.error('❌ Update Maintenance Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update maintenance record',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// DELETE maintenance record
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log(`🗑️  Deleting maintenance record ${id}`);

    const result = await query(`
      DELETE FROM chi_phi_sua_chua
      WHERE id = $1
      RETURNING bien_so_xe, ten_phu_tung, ngay
    `, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Maintenance record not found' },
        { status: 404 }
      );
    }

    console.log(`✅ Deleted maintenance record ${id}`);

    return NextResponse.json({
      success: true,
      message: 'Maintenance record deleted successfully',
      data: result.rows[0],
    });

  } catch (error: any) {
    console.error('❌ Delete Maintenance Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete maintenance record',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
