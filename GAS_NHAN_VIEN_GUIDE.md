# Google Apps Script - Hướng Dẫn Sử Dụng getNhanVien()

## 📋 Tổng Quan

Function `getNhanVien()` được thêm vào Google Apps Script để đọc dữ liệu nhân viên từ Google Sheets và trả về dạng JSON.

---

## 🔧 Cài Đặt

### 1. Cập nhật Config.gs

Đã thêm vào `Config.gs`:

```javascript
SHEET_NAMES: {
  // ... các sheet khác
  EMPLOYEES: 'nhan_vien'  // Sheet chứa thông tin nhân viên
}

EMPLOYEES_COLUMNS: {
  'ma_nhan_vien': 'maNhanVien',
  'ho_va_ten': 'hoVaTen',
  'phong_ban': 'phongBan',
  'chuc_vu': 'chucVu',
  'hinh_anh': 'hinhAnh',
  'so_dien_thoai': 'soDienThoai',
  'email': 'email',
  'chat_id': 'chatId',
  'trang_thai': 'trangThai',
  'ngay_vao_lam': 'ngayVaoLam',
  'ngay_nghi_viec': 'ngayNghiViec',
  'dia_chi': 'diaChi',
  'so_cccd': 'soCccd',
  'ngay_sinh': 'ngaySinh',
  'gioi_tinh': 'gioiTinh',
  'tinh_trang_hon_nhan': 'tinhTrangHonNhan',
  'nguoi_lien_he_khan_cap': 'nguoiLienHeKhanCap',
  'so_dien_thoai_khan_cap': 'soDienThoaiKhanCap',
  'phan_quyen': 'phanQuyen',
  'xem': 'xem',
  'them': 'them',
  'sua': 'sua',
  'xoa': 'xoa'
}
```

### 2. Triển Khai (Deploy) Apps Script

1. Mở project GAS của bạn: https://script.google.com
2. Click **Deploy** > **New deployment**
3. Chọn type: **Web app**
4. Cấu hình:
   - Description: `v2.1 - Add getNhanVien function`
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Click **Deploy**
6. Copy **Web app URL** (dạng: `https://script.google.com/macros/s/{SCRIPT_ID}/exec`)

---

## 🚀 Sử Dụng

### Cách 1: Gọi trực tiếp từ trình duyệt (Testing)

```
https://script.google.com/macros/s/{SCRIPT_ID}/exec?action=getNhanVien
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "maNhanVien": "NV001",
      "hoVaTen": "Nguyễn Văn A",
      "phongBan": "Kinh doanh",
      "chucVu": "Giám đốc",
      "soDienThoai": "0901234567",
      "email": "nva@nak.com",
      "chatId": null,
      "trangThai": "Đang làm việc",
      "ngayVaoLam": "2020-01-15",
      "phanQuyen": "admin",
      "xem": true,
      "them": true,
      "sua": true,
      "xoa": true
    }
    // ... more employees
  ]
}
```

### Cách 2: Gọi từ Next.js API (Import vào Database)

File: `app/api/employees/import/route.ts`

```typescript
const GAS_ENDPOINT = 'https://script.google.com/macros/s/{SCRIPT_ID}/exec?action=getNhanVien';

const response = await fetch(GAS_ENDPOINT);
const result = await response.json();

if (result.success) {
  const employees = result.data;
  // Import to database...
}
```

### Cách 3: Test bằng curl

```bash
curl "https://script.google.com/macros/s/{SCRIPT_ID}/exec?action=getNhanVien"
```

### Cách 4: Test ngay trên Apps Script

1. Mở project GAS
2. Chọn function `getNhanVien` từ dropdown
3. Click **Run**
4. Xem kết quả trong Logs (View > Logs)

---

## 📊 Data Mapping

| Google Sheets Column | JSON Key | Type | Example |
|---------------------|----------|------|---------|
| ma_nhan_vien | maNhanVien | string | "NV001" |
| ho_va_ten | hoVaTen | string | "Nguyễn Văn A" |
| phong_ban | phongBan | string | "Kinh doanh" |
| chuc_vu | chucVu | string | "Giám đốc" |
| so_dien_thoai | soDienThoai | string | "0901234567" |
| email | email | string | "nva@nak.com" |
| chat_id | chatId | string | "123456789" |
| trang_thai | trangThai | string | "Đang làm việc" |
| ngay_vao_lam | ngayVaoLam | date | "2020-01-15" |
| ngay_nghi_viec | ngayNghiViec | date | "2024-12-31" |
| phan_quyen | phanQuyen | string | "admin" |
| xem | xem | boolean | true |
| them | them | boolean | true |
| sua | sua | boolean | false |
| xoa | xoa | boolean | false |

---

## 🔄 Import Flow

```
┌─────────────────┐
│ Google Sheets   │
│ (nhan_vien)     │
└────────┬────────┘
         │
         │ 1. Read data
         ▼
┌─────────────────┐
│ Apps Script     │
│ getNhanVien()   │
└────────┬────────┘
         │
         │ 2. Return JSON
         ▼
┌─────────────────┐
│ Next.js API     │
│ /api/employees  │
│ /import         │
└────────┬────────┘
         │
         │ 3. Upsert data
         ▼
┌─────────────────┐
│ PostgreSQL      │
│ nhan_vien table │
└─────────────────┘
```

---

## ✅ Kiểm Tra

### 1. Test function trên Apps Script

```javascript
// Run this in Apps Script
function testGetNhanVien() {
  const employees = getNhanVien();
  Logger.log(`Found ${employees.length} employees`);
  Logger.log(JSON.stringify(employees[0], null, 2)); // Log first employee
}
```

### 2. Test Web App endpoint

```bash
# Replace {SCRIPT_ID} with your actual script ID
curl "https://script.google.com/macros/s/{YOUR_SCRIPT_ID}/exec?action=getNhanVien"
```

### 3. Test import vào database

```bash
# Run from terminal
cd /Users/mac/Desktop/nak-logistic-system
chmod +x scripts/test-employee-import.sh
./scripts/test-employee-import.sh
```

---

## 🛠️ Troubleshooting

### Lỗi: "Sheet 'nhan_vien' not found"

**Nguyên nhân:** Sheet name không đúng trong Google Sheets

**Giải pháp:** 
1. Kiểm tra tên sheet trong Google Sheets
2. Update `Config.gs`:
   ```javascript
   SHEET_NAMES: {
     EMPLOYEES: 'ten_sheet_dung' // Sửa lại cho đúng
   }
   ```

### Lỗi: "Authorization required"

**Nguyên nhân:** Chưa authorize Apps Script

**Giải pháp:**
1. Run function `getNhanVien()` lần đầu trong Apps Script Editor
2. Click **Review Permissions**
3. Chọn Google account
4. Click **Allow**

### Lỗi: "The script completed but did not return anything"

**Nguyên nhân:** doGet() không được deploy đúng

**Giải pháp:**
1. Deploy lại as **Web app**
2. Đảm bảo "Execute as" = **Me**
3. Đảm bảo "Who has access" = **Anyone**

### Lỗi: Column mapping không đúng

**Nguyên nhân:** Tên cột trong Google Sheets khác với Config

**Giải pháp:**
1. Xem log để biết tên cột thực tế:
   ```javascript
   Logger.log('Headers:', headers);
   ```
2. Update `EMPLOYEES_COLUMNS` trong `Config.gs`

---

## 📝 Notes

- **Auto-convert dates:** Tất cả date columns tự động format thành `YYYY-MM-DD`
- **Auto-convert booleans:** String "TRUE"/"FALSE" tự động convert thành boolean
- **Skip empty rows:** Rows không có `ma_nhan_vien` sẽ bị bỏ qua
- **Trim whitespace:** Tất cả string values tự động trim()
- **Null handling:** Empty values được convert thành `null`

---

## 🔗 Related Files

- `backend-gas/Code.gs` - Main GAS script với function getNhanVien()
- `backend-gas/Config.gs` - Configuration với EMPLOYEES_COLUMNS mapping
- `sql/create_nhan_vien_table.sql` - Database schema
- `app/api/employees/import/route.ts` - Import API endpoint
- `scripts/test-employee-import.sh` - Test script
- `EMPLOYEES_IMPORT_GUIDE.md` - Hướng dẫn import đầy đủ

---

## 🎯 Next Steps

1. **Deploy Apps Script:**
   - Deploy as Web app
   - Copy Web app URL
   
2. **Test endpoint:**
   ```bash
   curl "https://script.google.com/macros/s/{SCRIPT_ID}/exec?action=getNhanVien"
   ```

3. **Update import API:**
   - Thay `{SCRIPT_ID}` trong `app/api/employees/import/route.ts`
   
4. **Run import:**
   ```bash
   curl "https://nak-system.vercel.app/api/employees/import?secret=your_secret"
   ```

5. **Verify data:**
   ```bash
   ./scripts/test-employee-import.sh
   ```

---

## 📞 Support

Nếu gặp vấn đề, check:
1. Apps Script Logs: View > Logs
2. Execution logs: View > Executions
3. API logs: Vercel Dashboard > Logs
4. Database: Connect to PostgreSQL và query `SELECT * FROM nhan_vien LIMIT 10;`
