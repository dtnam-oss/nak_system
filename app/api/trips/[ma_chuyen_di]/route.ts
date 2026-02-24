import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type Params = { params: { ma_chuyen_di: string } };

// ── GET /api/trips/[ma_chuyen_di] ────────────────────────────────────────────
// Returns trip header + chi_tiet_chuyen_di rows
export async function GET(_req: NextRequest, { params }: Params) {
  const { ma_chuyen_di } = params;
  try {
    const [tripResult, chiTietResult] = await Promise.all([
      query(
        `SELECT
          cd.ma_chuyen_di,
          cd.ngay_tao,
          cd.ma_khach_hang,
          cd.ten_khach_hang,
          cd.ten_tuyen,
          cd.ten_tai_xe,
          cd.don_vi_van_chuyen,
          cd.loai_chuyen,
          cd.loai_tuyen,
          cd.trang_thai_chuyen_di,
          cd.ghi_chu,
          CASE
            WHEN cd.doanh_thu::TEXT IS NULL OR cd.doanh_thu::TEXT = '' THEN 0
            WHEN cd.doanh_thu::TEXT !~ '^-?[0-9]*\\.?[0-9]+$' THEN 0
            ELSE cd.doanh_thu::NUMERIC
          END AS doanh_thu,
          CASE
            WHEN cd.so_km_theo_odo::TEXT IS NULL OR cd.so_km_theo_odo::TEXT = '' THEN 0
            WHEN cd.so_km_theo_odo::TEXT !~ '^-?[0-9]*\\.?[0-9]+$' THEN 0
            ELSE cd.so_km_theo_odo::NUMERIC
          END AS so_km
        FROM chuyen_di cd
        WHERE cd.ma_chuyen_di = $1`,
        [ma_chuyen_di]
      ),
      query(
        `SELECT
          ct.id,
          ct.ma_chuyen_di,
          ct.ma_chuyen_di_kh,
          ct.lo_trinh,
          ct.lo_trinh_chi_tiet_theo_diem,
          ct.bien_kiem_soat,
          ct.tai_trong,
          ct.quang_duong,
          ct.so_chieu,
          ct.don_gia,
          ct.loai_ca,
          ct.tai_trong_tinh_phi,
          ct.hinh_thuc_tinh_gia
        FROM chi_tiet_chuyen_di ct
        WHERE ct.ma_chuyen_di = $1
        ORDER BY ct.id ASC`,
        [ma_chuyen_di]
      ),
    ]);

    if (tripResult.rows.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy chuyến đi' }, { status: 404 });
    }

    const row = tripResult.rows[0];
    const trip = {
      ma_chuyen_di:      row.ma_chuyen_di,
      ngay_tao:          row.ngay_tao instanceof Date
                           ? row.ngay_tao.toISOString().split('T')[0]
                           : String(row.ngay_tao || '').split('T')[0],
      ma_khach_hang:     row.ma_khach_hang || '',
      ten_khach_hang:    row.ten_khach_hang || '',
      ten_tuyen:         row.ten_tuyen || '',
      ten_tai_xe:        row.ten_tai_xe || '',
      don_vi_van_chuyen: row.don_vi_van_chuyen || '',
      loai_chuyen:       row.loai_chuyen || '',
      loai_tuyen:        row.loai_tuyen || '',
      trang_thai:        row.trang_thai_chuyen_di || '',
      ghi_chu:           row.ghi_chu || '',
      doanh_thu:         parseFloat(row.doanh_thu || '0'),
      so_km:             parseFloat(row.so_km || '0'),
    };

    const chiTiet = chiTietResult.rows.map((ct: any) => ({
      id:                       ct.id,
      ma_chuyen_di:             ct.ma_chuyen_di,
      ma_chuyen_di_kh:          ct.ma_chuyen_di_kh || '',
      lo_trinh:                 ct.lo_trinh || '',
      lo_trinh_chi_tiet_theo_diem: ct.lo_trinh_chi_tiet_theo_diem || '',
      bien_kiem_soat:           ct.bien_kiem_soat || '',
      tai_trong:                ct.tai_trong || '',
      quang_duong:              ct.quang_duong || '',
      so_chieu:                 ct.so_chieu || '',
      don_gia:                  ct.don_gia || '',
      loai_ca:                  ct.loai_ca || '',
      tai_trong_tinh_phi:       ct.tai_trong_tinh_phi || '',
      hinh_thuc_tinh_gia:       ct.hinh_thuc_tinh_gia || '',
    }));

    return NextResponse.json({ trip, chiTiet });
  } catch (error) {
    console.error('❌ [trips detail API] GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ── PUT /api/trips/[ma_chuyen_di] ────────────────────────────────────────────
// Updates editable fields of a trip
export async function PUT(req: NextRequest, { params }: Params) {
  const { ma_chuyen_di } = params;
  try {
    const body = await req.json();
    const {
      ten_tuyen,
      ten_tai_xe,
      don_vi_van_chuyen,
      loai_chuyen,
      loai_tuyen,
      trang_thai,
      doanh_thu,
      so_km,
      ghi_chu,
    } = body;

    const fields: string[] = [];
    const values: any[]    = [];
    let i = 1;

    if (ten_tuyen         !== undefined) { fields.push(`ten_tuyen = $${i++}`);              values.push(ten_tuyen); }
    if (ten_tai_xe        !== undefined) { fields.push(`ten_tai_xe = $${i++}`);             values.push(ten_tai_xe); }
    if (don_vi_van_chuyen !== undefined) { fields.push(`don_vi_van_chuyen = $${i++}`);      values.push(don_vi_van_chuyen); }
    if (loai_chuyen       !== undefined) { fields.push(`loai_chuyen = $${i++}`);            values.push(loai_chuyen); }
    if (loai_tuyen        !== undefined) { fields.push(`loai_tuyen = $${i++}`);             values.push(loai_tuyen); }
    if (trang_thai        !== undefined) { fields.push(`trang_thai_chuyen_di = $${i++}`);   values.push(trang_thai); }
    if (doanh_thu         !== undefined) { fields.push(`doanh_thu = $${i++}`);              values.push(doanh_thu); }
    if (so_km             !== undefined) { fields.push(`so_km_theo_odo = $${i++}`);         values.push(so_km); }
    if (ghi_chu           !== undefined) { fields.push(`ghi_chu = $${i++}`);                values.push(ghi_chu); }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'Không có trường nào để cập nhật' }, { status: 400 });
    }

    values.push(ma_chuyen_di);
    await query(
      `UPDATE chuyen_di SET ${fields.join(', ')} WHERE ma_chuyen_di = $${i}`,
      values
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ [trips detail API] PUT error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ── DELETE /api/trips/[ma_chuyen_di] ─────────────────────────────────────────
// Hard deletes a trip and its chi_tiet records
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { ma_chuyen_di } = params;
  try {
    // Delete chi_tiet first (FK constraint)
    await query(`DELETE FROM chi_tiet_chuyen_di WHERE ma_chuyen_di = $1`, [ma_chuyen_di]);
    await query(`DELETE FROM chuyen_di WHERE ma_chuyen_di = $1`, [ma_chuyen_di]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ [trips detail API] DELETE error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
