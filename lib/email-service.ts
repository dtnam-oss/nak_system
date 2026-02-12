/**
 * Email Service for sending payslips
 * Uses Google Apps Script to generate PDFs from Google Docs templates
 */

import { query } from '@/lib/db';
import { PayslipData } from '@/lib/payslip-data-preparer';

// Google Apps Script Web App URL
const GAS_WEB_APP_URL = process.env.GAS_WEB_APP_URL;

/**
 * HTML Email template with logo
 */
const getEmailTemplate = (employeeName: string, month: number, year: number) => {
  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Phiếu lương ${month}/${year}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header with logo -->
          <tr>
            <td style="padding: 30px; text-align: center; background: linear-gradient(135deg, #4272c4 0%, #2c5aa0 100%);">
              <div style="width: 80px; height: 80px; margin: 0 auto 15px; background-color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 32px; font-weight: bold; color: #4272c4;">NAK</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                NAK Logistics
              </h1>
              <p style="margin: 5px 0 0; color: #e8f0fe; font-size: 14px;">
                Phòng Nhân sự
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; color: #333333; font-size: 20px;">
                Kính gửi anh/chị <strong>${employeeName}</strong>,
              </h2>
              
              <p style="margin: 0 0 15px; color: #555555; font-size: 15px; line-height: 1.6;">
                Công ty gửi anh/chị phiếu lương tháng <strong>${month}/${year}</strong>.
              </p>
              
              <p style="margin: 0 0 15px; color: #555555; font-size: 15px; line-height: 1.6;">
                Vui lòng xem các file đính kèm để biết chi tiết:
              </p>
              
              <ul style="margin: 0 0 20px; padding-left: 20px; color: #555555; font-size: 15px; line-height: 1.8;">
                <li><strong>Phiếu lương tổng hợp:</strong> Tổng quan thu nhập và khấu trừ</li>
                <li><strong>Phiếu lương chi tiết:</strong> Chi tiết từng khoản thu nhập</li>
              </ul>
              
              <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-left: 4px solid #4272c4; border-radius: 4px;">
                <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                  <strong>📌 Lưu ý:</strong> Nếu có thắc mắc hoặc phát hiện sai sót, vui lòng liên hệ Phòng Nhân sự trong vòng 3 ngày làm việc kể từ ngày nhận email này.
                </p>
              </div>
              
              <p style="margin: 20px 0 0; color: #555555; font-size: 15px; line-height: 1.6;">
                Trân trọng,
              </p>
              <p style="margin: 5px 0 0; color: #333333; font-size: 15px; font-weight: 600;">
                Phòng Nhân sự<br>
                NAK Logistics
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background-color: #f8f9fa; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 8px; color: #888888; font-size: 12px; text-align: center;">
                Email: phongnhansunak@nakvn.com
              </p>
              <p style="margin: 0; color: #888888; font-size: 12px; text-align: center;">
                © ${year} NAK Logistics. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

/**
 * Send payslip email via Google Apps Script
 * GAS will generate PDFs from Google Docs templates
 */
export async function sendPayslipEmail(data: PayslipData): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (!GAS_WEB_APP_URL) {
      throw new Error('GAS_WEB_APP_URL not configured. Please set it in .env.local');
    }

    console.log(`📧 Sending payslip data to GAS for ${data.ten_nhan_vien}...`);
    console.log(`   Data summary:`, {
      ma_nhan_vien: data.ma_nhan_vien,
      recipientEmail: data.recipientEmail,
      month: data.month,
      year: data.year,
      luongChuyenCount: data.luongChuyen?.length || 0
    });

    // Send data to Google Apps Script (GAS generates PDFs from templates)
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    console.log(`   GAS response status:`, response.status);
    
    const responseText = await response.text();
    console.log(`   GAS response body:`, responseText.substring(0, 500));

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`GAS returned invalid JSON: ${responseText.substring(0, 200)}`);
    }

    if (!result.success) {
      throw new Error(result.error || 'Failed to send email via GAS');
    }

    return { success: true };
  } catch (error: any) {
    console.error('❌ Error sending email via GAS:', error.message);
    return {
      success: false,
      error: error.message || 'Unknown error occurred'
    };
  }
}

/**
 * Log email send result to database
 */
export async function logEmailSend(
  ma_nhan_vien: string,
  ten_nhan_vien: string,
  email_to: string,
  subject: string,
  thang: number,
  nam: number,
  status: 'success' | 'failed',
  error_message?: string,
  pdf_tong_hop_generated: boolean = true,
  pdf_chi_tiet_generated: boolean = true
): Promise<void> {
  try {
    await query(
      `INSERT INTO email_logs (
        ma_nhan_vien, ten_nhan_vien, email_to, subject, thang, nam,
        status, error_message, pdf_tong_hop_generated, pdf_chi_tiet_generated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        ma_nhan_vien,
        ten_nhan_vien,
        email_to,
        subject,
        thang,
        nam,
        status,
        error_message || null,
        pdf_tong_hop_generated,
        pdf_chi_tiet_generated
      ]
    );
  } catch (error) {
    console.error('Error logging email:', error);
  }
}

/**
 * Get email send history for an employee
 */
export async function getEmailHistory(
  ma_nhan_vien: string,
  thang: number,
  nam: number
): Promise<any[]> {
  try {
    const result = await query(
      `SELECT * FROM email_logs
       WHERE ma_nhan_vien = $1 AND thang = $2 AND nam = $3
       ORDER BY sent_at DESC`,
      [ma_nhan_vien, thang, nam]
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching email history:', error);
    return [];
  }
}

/**
 * Delay helper for rate limiting
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
