import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Tự động tạo bảng và cột nếu chưa có
async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS hinh_anh_chi_tiet (
      id          SERIAL PRIMARY KEY,
      chi_tiet_id INTEGER NOT NULL,
      ten_file    TEXT,
      loai_file   TEXT,
      kich_thuoc  INTEGER,
      du_lieu     BYTEA NOT NULL,
      ngay_tao    TIMESTAMP DEFAULT NOW()
    )
  `);
  // Đảm bảo cột hinh_anh tồn tại trong chi_tiet_chuyen_di
  await query(`ALTER TABLE chi_tiet_chuyen_di ADD COLUMN IF NOT EXISTS hinh_anh TEXT`);
}

// ── GET /api/trips/upload?id=X ───────────────────────────────────────────────
// Trả về binary image để hiển thị trực tiếp qua <img src="...">
export async function GET(req: NextRequest) {
  const id = parseInt(req.nextUrl.searchParams.get('id') || '');
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Thiếu id' }, { status: 400 });
  }

  try {
    const result = await query(
      'SELECT du_lieu, loai_file, ten_file FROM hinh_anh_chi_tiet WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy ảnh' }, { status: 404 });
    }

    const { du_lieu, loai_file, ten_file } = result.rows[0];

    return new NextResponse(du_lieu, {
      headers: {
        'Content-Type':        loai_file || 'image/jpeg',
        'Content-Disposition': `inline; filename="${ten_file || 'image'}"`,
        'Cache-Control':       'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('❌ [upload GET] error:', error);
    return NextResponse.json({ error: 'Lỗi tải ảnh' }, { status: 500 });
  }
}

// ── POST /api/trips/upload ───────────────────────────────────────────────────
// Upload ảnh, lưu BYTEA vào bảng hinh_anh_chi_tiet
// Form fields: file, chi_tiet_id
export async function POST(req: NextRequest) {
  try {
    await ensureTable();

    const formData   = await req.formData();
    const file       = formData.get('file') as File | null;
    const idRaw      = formData.get('chi_tiet_id') as string | null;

    if (!file)   return NextResponse.json({ error: 'Không có file' },      { status: 400 });
    if (!idRaw)  return NextResponse.json({ error: 'Thiếu chi_tiet_id' },  { status: 400 });

    const chiTietId = parseInt(idRaw);
    if (isNaN(chiTietId)) {
      return NextResponse.json({ error: 'chi_tiet_id không hợp lệ' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Chỉ chấp nhận file hình ảnh' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File quá lớn (tối đa 5MB)' }, { status: 400 });
    }

    // Đọc file thành Buffer để lưu BYTEA
    const buffer = Buffer.from(await file.arrayBuffer());

    // Xóa ảnh cũ nếu có (1 chi_tiet chỉ có 1 ảnh)
    await query('DELETE FROM hinh_anh_chi_tiet WHERE chi_tiet_id = $1', [chiTietId]);

    // Lưu ảnh mới
    const result = await query(
      `INSERT INTO hinh_anh_chi_tiet (chi_tiet_id, ten_file, loai_file, kich_thuoc, du_lieu)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [chiTietId, file.name, file.type, file.size, buffer]
    );

    const newId = result.rows[0].id;
    const imageUrl = `/api/trips/upload?id=${newId}`;

    // Ghi URL trực tiếp vào chi_tiet_chuyen_di.hinh_anh
    await query(
      `UPDATE chi_tiet_chuyen_di SET hinh_anh = $1 WHERE id::TEXT = $2`,
      [imageUrl, String(chiTietId)]
    );

    return NextResponse.json({ id: newId, url: imageUrl });
  } catch (error) {
    console.error('❌ [upload POST] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload thất bại' },
      { status: 500 }
    );
  }
}

// ── DELETE /api/trips/upload?chi_tiet_id=X ──────────────────────────────────
// Xóa ảnh của một chi_tiet row
export async function DELETE(req: NextRequest) {
  try {
    const id = parseInt(req.nextUrl.searchParams.get('chi_tiet_id') || '');
    if (isNaN(id)) {
      return NextResponse.json({ error: 'chi_tiet_id không hợp lệ' }, { status: 400 });
    }

    await query('DELETE FROM hinh_anh_chi_tiet WHERE chi_tiet_id = $1', [id]);
    // Xóa URL trong chi_tiet_chuyen_di
    await query(`UPDATE chi_tiet_chuyen_di SET hinh_anh = NULL WHERE id::TEXT = $1`, [String(id)]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Xóa ảnh thất bại' },
      { status: 500 }
    );
  }
}
