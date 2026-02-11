/**
 * Google Apps Script - Send Payslip Email
 * Deploy as Web App with "Execute as: Me" and "Who has access: Anyone"
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    const {
      recipientEmail,
      recipientName,
      month,
      year,
      pdfTongHopBase64,
      pdfChiTietBase64
    } = data;
    
    // Validate input
    if (!recipientEmail || !recipientName || !month || !year || !pdfTongHopBase64 || !pdfChiTietBase64) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Missing required fields'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Decode base64 PDFs
    const pdfTongHop = Utilities.newBlob(
      Utilities.base64Decode(pdfTongHopBase64),
      'application/pdf',
      `Phieu_Luong_Tong_Hop_${month}_${year}_${recipientName}.pdf`
    );
    
    const pdfChiTiet = Utilities.newBlob(
      Utilities.base64Decode(pdfChiTietBase64),
      'application/pdf',
      `Phieu_Luong_Chi_Tiet_${month}_${year}_${recipientName}.pdf`
    );
    
    // Email HTML template
    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .logo-container {
              background: white;
              width: 80px;
              height: 80px;
              border-radius: 50%;
              margin: 0 auto 15px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .logo {
              font-size: 32px;
              font-weight: bold;
              color: #667eea;
            }
            .header h1 {
              color: white;
              margin: 0;
              font-size: 24px;
            }
            .content {
              background: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .greeting {
              font-size: 18px;
              margin-bottom: 20px;
              color: #2c3e50;
            }
            .info-box {
              background: white;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 4px solid #667eea;
            }
            .info-box p {
              margin: 10px 0;
            }
            .info-box strong {
              color: #667eea;
            }
            .attachments {
              background: white;
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .attachments h3 {
              color: #667eea;
              margin-top: 0;
            }
            .attachment-item {
              padding: 10px;
              background: #f0f4ff;
              margin: 10px 0;
              border-radius: 5px;
              display: flex;
              align-items: center;
            }
            .attachment-item::before {
              content: "📄";
              margin-right: 10px;
              font-size: 20px;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 2px solid #e0e0e0;
              text-align: center;
              color: #666;
              font-size: 14px;
            }
            .note {
              background: #fff3cd;
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 4px solid #ffc107;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-container">
              <div class="logo">NAK</div>
            </div>
            <h1>PHIẾU LƯƠNG THÁNG ${month}/${year}</h1>
          </div>
          
          <div class="content">
            <p class="greeting">Xin chào <strong>${recipientName}</strong>,</p>
            
            <p>Phòng Nhân sự NAK gửi bạn phiếu lương tháng ${month}/${year}.</p>
            
            <div class="info-box">
              <p><strong>📅 Kỳ lương:</strong> Tháng ${month}/${year}</p>
              <p><strong>👤 Nhân viên:</strong> ${recipientName}</p>
              <p><strong>📧 Email:</strong> ${recipientEmail}</p>
            </div>
            
            <div class="attachments">
              <h3>📎 File đính kèm:</h3>
              <div class="attachment-item">
                Phiếu lương tổng hợp tháng ${month}/${year}
              </div>
              <div class="attachment-item">
                Phiếu lương chi tiết tháng ${month}/${year}
              </div>
            </div>
            
            <div class="note">
              <strong>⚠️ Lưu ý:</strong> Đây là email tự động, vui lòng không trả lời email này. 
              Nếu có thắc mắc, vui lòng liên hệ Phòng Nhân sự.
            </div>
            
            <p>Trân trọng,<br>
            <strong>Phòng Nhân sự - NAK Logistics</strong></p>
          </div>
          
          <div class="footer">
            <p>© ${year} NAK Logistics. All rights reserved.</p>
            <p>Email này được gửi tự động từ Hệ thống Quản lý NAK</p>
          </div>
        </body>
      </html>
    `;
    
    // Send email with attachments
    GmailApp.sendEmail(
      recipientEmail,
      `Phiếu lương tháng ${month}/${year} - ${recipientName}`,
      `Phiếu lương tháng ${month}/${year}\n\nXin chào ${recipientName},\n\nVui lòng xem file đính kèm.\n\nTrân trọng,\nPhòng Nhân sự NAK`,
      {
        htmlBody: htmlBody,
        attachments: [pdfTongHop, pdfChiTiet],
        name: 'Phòng Nhân sự NAK'
      }
    );
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: `Email sent successfully to ${recipientEmail}`
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('Error: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Test function (optional - for testing in Apps Script editor)
function testSendEmail() {
  // Create sample base64 PDFs for testing
  const testData = {
    recipientEmail: 'test@example.com',
    recipientName: 'Nguyễn Văn A',
    month: '1',
    year: '2026',
    pdfTongHopBase64: 'JVBERi0xLjMKJcfs...(base64)', // Replace with real base64
    pdfChiTietBase64: 'JVBERi0xLjMKJcfs...(base64)'  // Replace with real base64
  };
  
  const mockEvent = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };
  
  const result = doPost(mockEvent);
  Logger.log(result.getContent());
}
