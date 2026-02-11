import { NextResponse } from 'next/server';
import { preparePayslipData } from '@/lib/payslip-data-preparer';
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

    try {
      const emailType = test_email ? 'TEST' : 'Resending';
      console.log(`\n📧 ${emailType} payslip for ${ma_nhan_vien} - ${month}/${year}...`);

      // Chuẩn bị data từ database
      const payslipData = await preparePayslipData(
        ma_nhan_vien,
        parseInt(month),
        parseInt(year),
        test_email || undefined
      );

      // Gửi email qua GAS (GAS sẽ generate PDF từ Google Docs templates)
      const emailResult = await sendPayslipEmail(payslipData);

      if (emailResult.success) {
        // Log success
        await logEmailSend(
          payslipData.ma_nhan_vien,
          payslipData.ten_nhan_vien,
          payslipData.recipientEmail,
          `${test_email ? '[TEST]' : '[Resend]'} Phiếu lương tháng ${month}/${year} - ${payslipData.ten_nhan_vien}`,
          parseInt(month),
          parseInt(year),
          'success'
        );

        console.log(`  ✅ Success - Email sent to ${payslipData.recipientEmail}`);

        return NextResponse.json({
          message: test_email ? 'Test payslip sent successfully' : 'Payslip sent successfully',
          employee: {
            ma_nhan_vien: payslipData.ma_nhan_vien,
            ten_nhan_vien: payslipData.ten_nhan_vien,
            email: payslipData.recipientEmail
          }
        });
      } else {
        throw new Error(emailResult.error || 'Email send failed');
      }

    } catch (error: any) {
      console.error(`  ❌ Failed:`, error.message);

      // Log failure
      try {
        await logEmailSend(
          ma_nhan_vien,
          'Unknown',
          test_email || 'unknown@email.com',
          `${test_email ? '[TEST]' : '[Resend]'} Phiếu lương tháng ${month}/${year}`,
          parseInt(month),
          parseInt(year),
          'failed',
          error.message
        );
      } catch (logError) {
        // Ignore log errors
      }

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
