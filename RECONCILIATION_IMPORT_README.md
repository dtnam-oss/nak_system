# 📥 Reconciliation Import System - User Guide

> **Hệ thống so sánh file đối soát khách hàng với dữ liệu NAK**

---

## 🚀 Quick Start

### **1. Upload File Đối Soát**

Truy cập: `/reconciliation/upload`

1. Chọn loại mẫu đối soát:
   - 🔍 **Tự động nhận diện** (Recommended)
   - 📋 **J&T - Theo Tuyến**
   - 📋 **J&T - Theo Ca**
   - 📋 **GHN**

2. Chọn file Excel từ khách hàng (.xlsx, .xls)

3. Click **"Upload & Parse"**

4. Hệ thống tự động parse và chuyển sang trang so sánh

---

### **2. Xem Kết Quả So Sánh**

Truy cập: `/reconciliation/compare`

Kết quả hiển thị 4 loại:

#### ✅ **Khớp Hoàn Toàn** (Matched)
- Dữ liệu khớp 100% giữa NAK và khách hàng
- Không có sự khác biệt nào
- Không cần action

#### ⚠️ **Khớp Có Khác Biệt** (Mismatched)
- Tìm thấy trong cả 2 bên nhưng có giá trị khác nhau
- VD: Ngày khác, biển số khác
- **CẦN REVIEW** để xác nhận

#### ❌ **Thiếu Ở Khách Hàng** (Missing in Customer)
- NAK có chuyến, nhưng file khách hàng không có
- Có thể do:
  - Khách hàng chưa ghi nhận
  - Khách hàng loại bỏ (hủy chuyến)
- **CẦN CONFIRM** với khách hàng

#### ❌ **Thiếu Ở NAK** (Missing in NAK)
- File khách hàng có, nhưng NAK không có
- Có thể do:
  - NAK chưa nhập vào hệ thống
  - Khách hàng ghi nhận thêm
- **CẦN KIỂM TRA** và nhập vào NAK nếu hợp lệ

---

## 📊 Supported Templates

### **1. J&T - Theo Tuyến**

**Cấu trúc:**
- 1 order = 1 row
- Tem chiều đi + Tem chiều về

**Columns:**
| Column | Description |
|--------|-------------|
| STT | Row number |
| Ngày | Date (dd/MM/yyyy) |
| Biển số xe | License plate |
| Điểm đi - Điểm đến | Route name |
| Tem chiều đi | Outbound stamp (maTuyen[0]) |
| Tem chiều về | Inbound stamp (maTuyen[last]) |
| Thể tích | Volume |

**Matching Logic:**
```
uniqueKey = date|stampOut|stampIn
Example: "2026-01-10|JT001|JT002"
```

---

### **2. J&T - Theo Ca**

**Cấu trúc:**
- 1 order = 1 row
- Multi-line cells (stamps separated by \n)

**Columns:**
| Column | Description |
|--------|-------------|
| Ngày | Date (dd/MM/yyyy) |
| Biển số xe | License plate |
| Mã tem | Stamps (multi-line) |
| Điểm đi - Điểm đến | Routes (multi-line) |
| Thể tích | Volume (multi-line) |
| Loại ca | Shift type (multi-line) |

**Matching Logic:**
```
uniqueKey = date|sortedStamps
Example: "2026-01-10|JT001|JT002|JT003"
```

---

### **3. GHN**

**Cấu trúc:**
- 1 order = N rows (flattened)
- Each detail item = separate row

**Columns:**
| Column | Description |
|--------|-------------|
| STT | Row number |
| Ngày | Date (dd/MM/yyyy) |
| Biển số xe | License plate |
| Trọng tải yêu cầu | Weight |
| Hình thức tính giá | Pricing method |
| Lộ trình | Route detail |
| Số KM | Distance |
| Đơn giá khung | Unit price |
| Tên tuyến | Route name |
| Mã chuyến | Trip code (maTuyen) |

**Matching Logic:**
```
uniqueKey = tripCode (maTuyen)
Example: "GHN-2026-001"
```

---

## 🔧 Technical Details

### **API Endpoints**

#### **1. Upload API**
```
POST /api/reconciliation/upload

Request:
- FormData with 'file' (Excel file)
- Optional: 'templateType' (jnt_route | jnt_shift | ghn | auto)

Response:
{
  "success": true,
  "templateType": "jnt_route",
  "rowCount": 150,
  "rows": [...],
  "metadata": { ... }
}
```

#### **2. Compare API**
```
POST /api/reconciliation/compare

Request:
{
  "customerRows": [...],
  "dateRange": {
    "from": "2026-01-01",
    "to": "2026-12-31"
  },
  "customer": "J&T Express" // optional
}

Response:
{
  "success": true,
  "result": {
    "summary": { ... },
    "details": { ... },
    "metadata": { ... }
  }
}
```

---

### **System Architecture**

```
┌─────────────────┐
│  Customer File  │
│   (Excel)       │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│  ParserRegistry     │ ← Auto-detect template
│  - JnTRouteParser   │
│  - JnTShiftParser   │
│  - GHNParser        │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  ReconciliationRow  │ ← Normalized data
│  - date             │
│  - uniqueKey        │
│  - rawData          │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  ComparisonEngine   │ ← Match with NAK DB
│  1. Build key maps  │
│  2. Customer → NAK  │
│  3. NAK → Customer  │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  ComparisonResult   │
│  - matched          │
│  - mismatched       │
│  - missingInCustomer│
│  - missingInNak     │
└─────────────────────┘
```

---

## 📋 Workflow Example

### **Scenario: Đối soát J&T tháng 1/2026**

1. **Kế toán nhận file từ J&T:**
   - File: `JnT_DoiSoat_Thang1_2026.xlsx`
   - Template: J&T - Theo Tuyến
   - Rows: 245 chuyến

2. **Upload lên hệ thống:**
   ```
   Visit: /reconciliation/upload
   → Chọn: J&T - Theo Tuyến
   → Upload: JnT_DoiSoat_Thang1_2026.xlsx
   → Parse: 245 rows thành công
   ```

3. **Hệ thống so sánh với DB:**
   ```
   Date range: 2026-01-01 to 2026-01-31
   NAK orders: 250 chuyến
   Comparing...
   ```

4. **Kết quả:**
   ```
   ✅ Matched: 240 chuyến (96% match rate)
   ⚠️ Mismatched: 3 chuyến
      - NAK001: Ngày khác (01/01 vs 02/01)
      - NAK045: Biển số khác (29C-123 vs 29C-124)
      - NAK089: Tem chiều về khác

   ❌ Missing in Customer: 7 chuyến
      - NAK010, NAK023, NAK056, ...
      → Liên hệ J&T confirm

   ❌ Missing in NAK: 2 chuyến
      - Row 89: JT-2026-089
      - Row 123: JT-2026-123
      → Check AppSheet, nhập vào DB
   ```

5. **Action:**
   - Review 3 chuyến Mismatched → Sửa data
   - Confirm 7 chuyến với J&T
   - Nhập 2 chuyến thiếu vào NAK
   - Export report → Email cho J&T

---

## ⚠️ Common Issues

### **1. "Could not auto-detect template type"**

**Cause:** File không match với bất kỳ template nào

**Solution:**
- Kiểm tra cột header trong Excel
- Chọn đúng template type thủ công
- Liên hệ dev nếu là template mới

---

### **2. "No NAK orders found in date range"**

**Cause:** Database không có dữ liệu trong khoảng thời gian

**Solution:**
- Kiểm tra date range trong file khách hàng
- Verify dữ liệu đã import vào DB chưa
- Check filter customer (nếu có)

---

### **3. Match rate thấp (<80%)**

**Cause:** Dữ liệu có nhiều sai lệch

**Solution:**
- Kiểm tra file khách hàng có đúng format không
- Verify template type có đúng không
- Check date range có overlap không
- Review từng record Mismatched/Missing

---

## 🎯 Best Practices

### **1. Before Upload**
- ✅ Kiểm tra file có đúng format khách hàng
- ✅ Verify date range hợp lý (không quá rộng)
- ✅ Đảm bảo NAK đã import hết dữ liệu tháng đó

### **2. During Comparison**
- ✅ Review Matched trước (để hiểu baseline)
- ✅ Ưu tiên fix Mismatched (có trong cả 2 bên)
- ✅ Confirm Missing với khách hàng trước khi nhập

### **3. After Comparison**
- ✅ Export comparison report
- ✅ Send email cho khách hàng với Missing list
- ✅ Update NAK database nếu cần
- ✅ Archive file đối soát đã xử lý

---

## 📞 Support

**Issues:**
- Template mới cần add: Contact dev team
- Bug trong matching logic: Check logs in Vercel
- Database issues: Check Postgres console

**Logs:**
- Upload API: `/api/reconciliation/upload`
- Compare API: `/api/reconciliation/compare`
- Vercel Dashboard: https://vercel.com/dam-thanh-nams-projects/nak-system/logs

---

## 🎉 Changelog

### **v1.0.0 - 2026-01-09**
- ✅ Initial release
- ✅ Support 3 templates: J&T Route, J&T Shift, GHN
- ✅ Auto-detection
- ✅ Two-way comparison
- ✅ Web UI for upload and results

---

**📚 Related Documentation:**
- [Design Document](RECONCILIATION_IMPORT_DESIGN.md)
- [Export Templates Guide](app/api/reconciliation/export/EXPORT_TEMPLATES_GUIDE.md)

**🚀 Happy Reconciling!**
