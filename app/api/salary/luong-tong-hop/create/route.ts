import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { month, year } = body;

    // Validate month and year
    if (!month || !year || month < 1 || month > 12) {
      return NextResponse.json(
        { success: false, error: 'Invalid month or year' },
        { status: 400 }
      );
    }

    console.log(`📝 Creating salary slips for month=${month}, year=${year}`);

    // Step 1: Get all active drivers from nhan_vien table
    const driversResult = await query(`
      SELECT
        ma_nhan_vien,
        ho_va_ten,
        chuc_vu,
        email
      FROM nhan_vien
      WHERE chuc_vu = 'Tài xế'
        AND tinh_trang_cong_tac = 'Đang làm việc'
      ORDER BY ma_nhan_vien
    `);

    if (driversResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Không tìm thấy tài xế nào đang làm việc',
          total_drivers: 0,
          created_count: 0,
        },
        { status: 404 }
      );
    }

    console.log(`👥 Found ${driversResult.rows.length} active drivers`);

    // Step 2: Check existing records for this period
    const existingResult = await query(`
      SELECT ma_nhan_vien
      FROM luong_tong_hop
      WHERE thang = $1 AND nam = $2
    `, [month, year]);

    const existingDriverIds = new Set(existingResult.rows.map(row => row.ma_nhan_vien));
    console.log(`📋 Found ${existingResult.rows.length} existing salary slips for this period`);

    // Step 3: Create salary slips for drivers who don't have one yet
    let createdCount = 0;
    let skippedCount = 0;

    for (const driver of driversResult.rows) {
      if (existingDriverIds.has(driver.ma_nhan_vien)) {
        console.log(`⏭️  Skipping ${driver.ma_nhan_vien} - already exists`);
        skippedCount++;
        continue;
      }

      try {
        const newId = randomUUID(); // Generate UUID in Node.js
        await query(`
          INSERT INTO luong_tong_hop (
            id,
            ma_nhan_vien,
            ten_nhan_vien,
            chuc_vu,
            email,
            thang,
            nam,
            luong_bat_dau,
            tong_chi_phi_sua_chua,
            hoan_coc,
            chi_phi_do_dau_ngoai,
            chi_phi_phat_sinh_new,
            thuong,
            truy_thu_dau,
            truy_thu_ontime,
            tru_coc,
            tam_ung,
            phat_che_tai,
            truy_thu_vetc,
            phat_nguoi,
            tien_lam_the,
            bhxh,
            khac,
            tong_thu_nhap,
            tong_khau_tru,
            luong_thuc_lanh
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0
          )
        `, [
          newId,
          driver.ma_nhan_vien,
          driver.ho_va_ten,
          driver.chuc_vu,
          driver.email,
          month,
          year,
        ]);

        createdCount++;
        console.log(`✅ Created salary slip for ${driver.ma_nhan_vien}`);
      } catch (error: any) {
        console.error(`❌ Failed to create salary slip for ${driver.ma_nhan_vien}:`, error.message);
        // Continue with other drivers even if one fails
      }
    }

    console.log(`✅ Summary: Created ${createdCount}, Skipped ${skippedCount}, Total drivers ${driversResult.rows.length}`);

    return NextResponse.json({
      success: true,
      message: `Created ${createdCount} salary slips successfully`,
      total_drivers: driversResult.rows.length,
      created_count: createdCount,
      skipped_count: skippedCount,
      month,
      year,
    }, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });

  } catch (error: any) {
    console.error('❌ Create Salary Slips Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create salary slips',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
