import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateTongHopPDF, generateChiTietPDF } from '@/lib/payslip-pdf-generator';
import { sendPayslipEmail, logEmailSend, delay } from '@/lib/email-service';

export const maxDuration = 300; // 5 minutes for bulk sending

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    if (!month || !year) {
      return NextResponse.json(
        { error: 'Month and year are required' },
        { status: 400 }
      );
    }

    // Get all employees with salary data for the month
    const result = await query(
      `SELECT 
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
      FROM luong_tong_hop
      WHERE thang = $1 AND nam = $2
        AND email IS NOT NULL
        AND email != ''
        AND luong_thuc_lanh IS NOT NULL
      ORDER BY ten_nhan_vien ASC`,
      [parseInt(month), parseInt(year)]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'No employees with salary data found for this month' },
        { status: 404 }
      );
    }

    const employees = result.rows;
    const results = {
      total: employees.length,
      success: 0,
      failed: 0,
      logs: [] as any[]
    };

    // Process each employee
    for (const employee of employees) {
      try {
        console.log(`📧 Sending payslip to ${employee.ten_nhan_vien} (${employee.email})...`);

        // Generate PDFs
        const pdfTongHop = await generateTongHopPDF(employee);
        const pdfChiTiet = await generateChiTietPDF(
          employee.ma_nhan_vien,
          employee.ten_nhan_vien,
          parseInt(month),
          parseInt(year)
        );

        // Send email
        const emailResult = await sendPayslipEmail({
          to: employee.email,
          employeeName: employee.ten_nhan_vien,
          month: parseInt(month),
          year: parseInt(year),
          pdfTongHop,
          pdfChiTiet
        });

        if (emailResult.success) {
          results.success++;
          results.logs.push({
            ma_nhan_vien: employee.ma_nhan_vien,
            ten_nhan_vien: employee.ten_nhan_vien,
            email: employee.email,
            status: 'success'
          });

          // Log success
          await logEmailSend(
            employee.ma_nhan_vien,
            employee.ten_nhan_vien,
            employee.email,
            `Phiếu lương tháng ${month}/${year} - ${employee.ten_nhan_vien}`,
            parseInt(month),
            parseInt(year),
            'success'
          );

          console.log(`  ✅ Success`);
        } else {
          throw new Error(emailResult.error || 'Email send failed');
        }

        // Delay to avoid rate limiting (1.5 seconds between emails)
        await delay(1500);

      } catch (error: any) {
        console.error(`  ❌ Failed for ${employee.ten_nhan_vien}:`, error.message);
        
        results.failed++;
        results.logs.push({
          ma_nhan_vien: employee.ma_nhan_vien,
          ten_nhan_vien: employee.ten_nhan_vien,
          email: employee.email,
          status: 'failed',
          error: error.message
        });

        // Log failure
        await logEmailSend(
          employee.ma_nhan_vien,
          employee.ten_nhan_vien,
          employee.email,
          `Phiếu lương tháng ${month}/${year} - ${employee.ten_nhan_vien}`,
          parseInt(month),
          parseInt(year),
          'failed',
          error.message
        );
      }
    }

    return NextResponse.json({
      message: `Completed sending payslips`,
      results
    });

  } catch (error: any) {
    console.error('Error in send-payslips API:', error);
    return NextResponse.json(
      { error: 'Failed to send payslips', details: error.message },
      { status: 500 }
    );
  }
}
