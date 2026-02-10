import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('📝 Creating new maintenance record');

    // Validate required fields
    if (!body.ngay || !body.bien_so_xe) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: ngay, bien_so_xe' },
        { status: 400 }
      );
    }

    // Calculate thanh_tien if not provided
    const thanhTien = body.thanh_tien || (
      (body.so_luong || 0) * (body.don_gia || 0)
    );

    const newId = randomUUID();

    const result = await query(`
      INSERT INTO chi_phi_sua_chua (
        id,
        ngay,
        loai_xe,
        bien_so_xe,
        loai_phu_tung,
        ma_phu_tung,
        ten_phu_tung,
        so_luong,
        don_gia,
        thanh_tien,
        km_sua_chua,
        so_tien,
        ca_nhan_thanh_toan,
        dia_chi_sua_chua,
        ma_nhan_vien,
        ten_nhan_vien
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      )
      RETURNING *
    `, [
      newId,
      body.ngay,
      body.loai_xe || null,
      body.bien_so_xe,
      body.loai_phu_tung || null,
      body.ma_phu_tung || null,
      body.ten_phu_tung || null,
      body.so_luong || 0,
      body.don_gia || 0,
      thanhTien,
      body.km_sua_chua || 0,
      body.so_tien || 0,
      body.ca_nhan_thanh_toan || null,
      body.dia_chi_sua_chua || null,
      body.ma_nhan_vien || null,
      body.ten_nhan_vien || null,
    ]);

    console.log(`✅ Created maintenance record ${newId}`);

    // Convert numeric fields to actual numbers
    const createdRecord = {
      ...result.rows[0],
      so_luong: parseFloat(result.rows[0].so_luong) || 0,
      don_gia: parseFloat(result.rows[0].don_gia) || 0,
      thanh_tien: parseFloat(result.rows[0].thanh_tien) || 0,
      km_sua_chua: parseFloat(result.rows[0].km_sua_chua) || 0,
      so_tien: parseFloat(result.rows[0].so_tien) || 0,
    };

    return NextResponse.json({
      success: true,
      message: 'Maintenance record created successfully',
      data: createdRecord,
    }, {
      status: 201,
      headers: {
        'Cache-Control': 'no-store',
      },
    });

  } catch (error: any) {
    console.error('❌ Create Maintenance Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create maintenance record',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
