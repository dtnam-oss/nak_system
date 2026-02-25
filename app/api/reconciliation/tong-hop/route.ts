import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ── GET /api/reconciliation/tong-hop ─────────────────────────────────────────
// Lấy dữ liệu từ chi_tiet_chuyen_di JOIN chuyen_di
// Group theo ma_chuyen_di + ma_khach_hang + loai_chuyen
// Merge các cột chi tiết thành 1 cell (mảng giá trị)
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const from_date    = searchParams.get('from_date');
  const to_date      = searchParams.get('to_date');
  const ma_khach_hang = searchParams.get('ma_khach_hang');
  const loai_chuyen  = searchParams.get('loai_chuyen');
  const search       = searchParams.get('search');

  const conditions: string[] = [];
  const values: any[]        = [];
  let   i = 1;

  if (from_date) {
    conditions.push(`cd.ngay_tao >= $${i++}`);
    values.push(from_date);
  }
  if (to_date) {
    conditions.push(`cd.ngay_tao <= $${i++}`);
    values.push(to_date + ' 23:59:59');
  }
  if (ma_khach_hang && ma_khach_hang !== 'all') {
    conditions.push(`cd.ma_khach_hang = $${i++}`);
    values.push(ma_khach_hang);
  }
  if (loai_chuyen && loai_chuyen !== 'all') {
    conditions.push(`cd.loai_chuyen = $${i++}`);
    values.push(loai_chuyen);
  }
  if (search) {
    conditions.push(
      `(cd.ma_chuyen_di ILIKE $${i} OR cd.ten_khach_hang ILIKE $${i} OR cd.ten_tuyen ILIKE $${i} OR cd.ma_khach_hang ILIKE $${i})`
    );
    values.push(`%${search}%`);
    i++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    // Lấy tất cả rows để group trong JS (linh hoạt hơn STRING_AGG)
    const [rowsResult, filterResult] = await Promise.all([
      query(
        `SELECT
          cd.ma_chuyen_di,
          cd.ngay_tao,
          cd.ma_khach_hang,
          cd.ten_khach_hang,
          cd.loai_chuyen,
          cd.ten_tuyen,
          cd.trang_thai_chuyen_di,
          ct.id           AS ct_id,
          ct.lo_trinh,
          ct.lo_trinh_chi_tiet_theo_diem,
          ct.ma_chuyen_di_kh,
          ct.bien_kiem_soat,
          ct.tai_trong,
          ct.quang_duong,
          ct.so_chieu
        FROM chuyen_di cd
        LEFT JOIN chi_tiet_chuyen_di ct ON ct.ma_chuyen_di = cd.ma_chuyen_di
        ${where}
        ORDER BY cd.ngay_tao DESC, cd.ma_chuyen_di ASC, ct.id ASC`,
        values
      ),
      query(
        `SELECT
          (SELECT json_agg(DISTINCT jsonb_build_object('ma', ma_khach_hang, 'ten', ten_khach_hang))
           FROM chuyen_di
           WHERE ma_khach_hang IS NOT NULL AND ma_khach_hang != '') AS khach_hang,
          (SELECT json_agg(DISTINCT loai_chuyen ORDER BY loai_chuyen)
           FROM chuyen_di
           WHERE loai_chuyen IS NOT NULL AND loai_chuyen != '') AS loai_chuyen`
      ),
    ]);

    // Group rows theo ma_chuyen_di (key duy nhất)
    const groupMap = new Map<string, {
      ma_chuyen_di: string;
      ngay_tao: string;
      ma_khach_hang: string;
      ten_khach_hang: string;
      loai_chuyen: string;
      ten_tuyen: string;
      trang_thai: string;
      so_dong: number;
      lo_trinh: string[];
      lo_trinh_chi_tiet: string[];
      ma_chuyen_di_kh: string[];
      bien_kiem_soat: string[];
      tai_trong: string[];
      quang_duong: string[];
      so_chieu: string[];
    }>();

    for (const row of rowsResult.rows) {
      const key = row.ma_chuyen_di as string;

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          ma_chuyen_di:     row.ma_chuyen_di   || '',
          ngay_tao:         row.ngay_tao instanceof Date
                              ? row.ngay_tao.toISOString().split('T')[0]
                              : String(row.ngay_tao || '').split('T')[0],
          ma_khach_hang:    row.ma_khach_hang  || '',
          ten_khach_hang:   row.ten_khach_hang || '',
          loai_chuyen:      row.loai_chuyen    || '',
          ten_tuyen:        row.ten_tuyen      || '',
          trang_thai:       row.trang_thai_chuyen_di || '',
          so_dong:          0,
          lo_trinh:              [],
          lo_trinh_chi_tiet:     [],
          ma_chuyen_di_kh:       [],
          bien_kiem_soat:        [],
          tai_trong:             [],
          quang_duong:           [],
          so_chieu:              [],
        });
      }

      const grp = groupMap.get(key)!;

      // Chỉ thêm nếu có ct_id (không phải LEFT JOIN null)
      if (row.ct_id !== null) {
        grp.so_dong++;
        pushUnique(grp.lo_trinh,          row.lo_trinh);
        pushUnique(grp.lo_trinh_chi_tiet, row.lo_trinh_chi_tiet_theo_diem);
        pushUnique(grp.ma_chuyen_di_kh,   row.ma_chuyen_di_kh);
        pushUnique(grp.bien_kiem_soat,    row.bien_kiem_soat);
        pushUnique(grp.tai_trong,         String(row.tai_trong ?? ''));
        pushUnique(grp.quang_duong,       String(row.quang_duong ?? ''));
        pushUnique(grp.so_chieu,          String(row.so_chieu ?? ''));
      }
    }

    const rows = Array.from(groupMap.values());

    const filterRow = filterResult.rows[0];
    const khachHangRaw: { ma: string; ten: string }[] = filterRow?.khach_hang || [];

    // Dedup khach_hang by ma
    const seenKH = new Set<string>();
    const khachHang: { ma: string; ten: string }[] = [];
    for (const kh of khachHangRaw) {
      if (kh.ma && !seenKH.has(kh.ma)) {
        seenKH.add(kh.ma);
        khachHang.push(kh);
      }
    }

    return NextResponse.json({
      rows,
      total: rows.length,
      filters: {
        khach_hang:  khachHang.sort((a, b) => a.ma.localeCompare(b.ma)),
        loai_chuyen: (filterRow?.loai_chuyen as string[] | null) || [],
      },
    });
  } catch (error) {
    console.error('❌ [tong-hop API] GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Thêm vào mảng nếu giá trị chưa có và không rỗng
function pushUnique(arr: string[], val: string | null | undefined) {
  const v = (val ?? '').trim();
  if (v && !arr.includes(v)) arr.push(v);
}
