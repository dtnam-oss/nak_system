import { put } from '@vercel/blob';
import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/trips/upload
 * Uploads an image for a chi_tiet_chuyen_di row.
 *
 * Form fields:
 *   - file       : the image file
 *   - chi_tiet_id: id of the chi_tiet_chuyen_di row
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file     = formData.get('file') as File | null;
    const idRaw    = formData.get('chi_tiet_id') as string | null;

    if (!file)   return NextResponse.json({ error: 'Không có file' }, { status: 400 });
    if (!idRaw)  return NextResponse.json({ error: 'Thiếu chi_tiet_id' }, { status: 400 });

    const chiTietId = parseInt(idRaw);
    if (isNaN(chiTietId)) return NextResponse.json({ error: 'chi_tiet_id không hợp lệ' }, { status: 400 });

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Chỉ chấp nhận file hình ảnh' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File quá lớn (tối đa 5MB)' }, { status: 400 });
    }

    // Ensure hinh_anh column exists
    await query(`
      ALTER TABLE chi_tiet_chuyen_di
      ADD COLUMN IF NOT EXISTS hinh_anh TEXT
    `);

    // Upload to Vercel Blob
    const ext      = file.name.split('.').pop() || 'jpg';
    const filename = `trips/chi_tiet_${chiTietId}_${Date.now()}.${ext}`;
    const blob     = await put(filename, file, { access: 'public' });

    // Save URL to database
    await query(
      `UPDATE chi_tiet_chuyen_di SET hinh_anh = $1 WHERE id = $2`,
      [blob.url, chiTietId]
    );

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error('❌ [upload API] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload thất bại' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/trips/upload?chi_tiet_id=123
 * Removes the image for a chi_tiet row (clears hinh_anh column).
 */
export async function DELETE(req: NextRequest) {
  try {
    const id = parseInt(req.nextUrl.searchParams.get('chi_tiet_id') || '');
    if (isNaN(id)) return NextResponse.json({ error: 'chi_tiet_id không hợp lệ' }, { status: 400 });

    await query(`UPDATE chi_tiet_chuyen_di SET hinh_anh = NULL WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Xóa ảnh thất bại' },
      { status: 500 }
    );
  }
}
