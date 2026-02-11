import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateTongHopPDF, generateChiTietPDF } from '@/lib/payslip-pdf-generator';
import { sendPayslipEmail, logEmailSend } from '@/lib/email-service';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ma_nhan_vien = searchParams.get('ma_nhan_vien');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const test_email = searchParams.get('test_email'); // Email test (optional)

    if (!ma_nhan_vien || !month || !year) {
      return NextResponse.json(
        { error: 'ma_nhan_vien, month and year are required' },
        { status: 400 }
      );
    }

    // Get employee salary data
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
      WHERE ma_nhan_vien = $1 AND thang = $2 AND nam = $3`,
      [ma_nhan_vien, parseInt(month), parseInt(year)]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Salary data not found for this employee' },
        { status: 404 }
      );
    }

    const employee = result.rows[0];

    // Use test_email if provided, otherwise use employee email
    const targetEmail = test_email || employee.email;

    if (!test_email && (!employee.email || employee.email.trim() === '')) {
      return NextResponse.json(
        { error: 'Employee does not have an email address' },
        { status: 400 }
      );
    }

    try {
      const emailType = test_email ? 'TEST' : 'Resending';
      console.log(`📧 ${emailType} payslip to ${employee.ten_nhan_vien} (${targetEmail})...`);

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
        to: targetEmail,
        employeeName: employee.ten_nhan_vien,
        month: parseInt(month),
        year: parseInt(year),
        pdfTongHop,
        pdfChiTiet
      });

      if (emailResult.success) {
        // Log success
        await logEmailSend(
          employee.ma_nhan_vien,
          employee.ten_nhan_vien,
          targetEmail,
          `${test_email ? '[TEST]' : '[Resend]'} Phiếu lương tháng ${month}/${year} - ${employee.ten_nhan_vien}`,
          parseInt(month),
          parseInt(year),
          'success'
        );

        console.log(`  ✅ Success`);

        return NextResponse.json({
          message: test_email ? 'Test payslip sent successfully' : 'Payslip sent successfully',
          employee: {
            ma_nhan_vien: employee.ma_nhan_vien,
            ten_nhan_vien: employee.ten_nhan_vien,
            email: targetEmail
          }
        });
      } else {
        throw new Error(emailResult.error || 'Email send failed');
      }

    } catch (error: any) {
      console.error(`  ❌ Failed:`, error.message);

      // Log failure
      await logEmailSend(
        employee.ma_nhan_vien,
        employee.ten_nhan_vien,
        targetEmail,
        `${test_email ? '[TEST]' : '[Resend]'} Phiếu lương tháng ${month}/${year} - ${employee.ten_nhan_vien}`,
        parseInt(month),
        parseInt(year),
        'failed',
        error.message
      );

      return NextResponse.json(
        { error: 'Failed to send payslip', details: error.message },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Error in resend-payslip API:', error);
    return NextResponse.json(
      { error: 'Failed to resend payslip', details: error.message },
      { status: 500 }
    );
  }
}
