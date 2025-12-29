import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Hàm helper để làm sạch số (xóa dấu chấm, phẩy)
function cleanNumber(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  // Xóa tất cả ký tự không phải số và dấu chấm thập phân, sau đó parse
  const str = String(val).replace(/[^0-9.-]+/g, ""); 
  return parseFloat(str) || 0;
}

export async function POST(request: Request) {
  try {
    const secret = request.headers.get('x-migration-secret');
    if (secret !== process.env.MIGRATION_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { records } = body;

    if (!records || !Array.isArray(records)) {
      return NextResponse.json({ error: 'Invalid records' }, { status: 400 });
    }

    let successCount = 0;
    let failedCount = 0;
    const errors = [];

    for (const record of records) {
      try {
        // Parse JSON Details
        let detailsObj = record.data_json;
        if (typeof detailsObj === 'string') {
          try {
            detailsObj = JSON.parse(detailsObj);
          } catch (e) {
            detailsObj = {};
          }
        }

        const licensePlate = detailsObj?.thongTinChuyenDi?.soXe || '';
        
        let totalWeight = 0;
        if (Array.isArray(detailsObj?.chiTietLoTrinh)) {
          totalWeight = detailsObj.chiTietLoTrinh.reduce((sum: any, item: any) => sum + cleanNumber(item.taiTrong), 0);
        }

        // Map status
        let status = 'pending';
        const stt = String(record.trangThai || '').toLowerCase();
        if (stt.includes('đã duyệt') || stt.includes('approved')) status = 'approved';
        else if (stt.includes('từ chối') || stt.includes('rejected')) status = 'rejected';

        // Xử lý dữ liệu thô trước khi insert
        const dist = cleanNumber(record.tongQuangDuong);
        const cost = cleanNumber(record.tongDoanhThu);

        // Debug log để xem dữ liệu có bị NaN không
        if (isNaN(cost) || isNaN(dist)) {
            throw new Error(`Lỗi định dạng số: Cost=${record.tongDoanhThu}, Dist=${record.tongQuangDuong}`);
        }

        await sql`
          INSERT INTO reconciliation_orders (
            order_id, date, customer, 
            trip_type, route_type, route_name, 
            driver_name, provider, 
            total_distance, cost, status,
            license_plate, weight, details
          ) VALUES (
            ${record.maChuyenDi}, ${record.ngayTao}, ${record.tenKhachHang},
            ${record.loaiChuyen}, ${record.loaiTuyen}, ${record.tenTuyen},
            ${record.tenTaiXe}, ${record.donViVanChuyen},
            ${dist}, ${cost}, ${status},
            ${licensePlate}, ${totalWeight}, ${JSON.stringify(detailsObj)}
          )
          ON CONFLICT (order_id) DO UPDATE SET
            cost = EXCLUDED.cost,
            status = EXCLUDED.status,
            details = EXCLUDED.details; 
            -- Đổi thành UPDATE để nếu chạy lại thì nó sửa cái cũ
        `;
        
        successCount++;
      } catch (err: any) {
        console.error(`Import Error [${record.maChuyenDi}]:`, err.message);
        failedCount++;
        errors.push({ id: record.maChuyenDi, msg: err.message });
      }
    }

    // Quan trọng: Trả về danh sách lỗi để GAS biết
    return NextResponse.json({
      success: successCount,
      failed: failedCount,
      errors: errors.slice(0, 10) // Chỉ trả về 10 lỗi đầu tiên để debug
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}