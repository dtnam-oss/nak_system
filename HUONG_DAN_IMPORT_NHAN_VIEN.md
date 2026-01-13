# 📋 Hướng Dẫn Import Dữ Liệu Nhân Viên

## 🎯 Tổng Quan

Hướng dẫn này giúp bạn import dữ liệu nhân viên từ Google Sheets vào PostgreSQL database.

---

## 📊 Chuẩn Bị

### 1. Kiểm tra Google Sheets

Đảm bảo sheet `nhan_vien` có đầy đủ columns:

```
ma_nhan_vien | ho_va_ten | phong_ban | chuc_vu | so_dien_thoai | email | ...
NV001        | Nguyễn A  | Kinh doanh| Giám đốc| 0901234567    | a@nak.com | ...
```

### 2. Kiểm tra Database

Table `nhan_vien` đã được tạo (đã có sẵn từ file `sql/create_nhan_vien_table.sql`)

---

## 🚀 Cách 1: Import Tự Động (Khuyến Nghị)

### **Bước 1: Deploy Google Apps Script**

1. Mở project: https://script.google.com

2. Click **Deploy** → **New deployment**

3. Settings:
   ```
   Type: Web app
   Description: v2.1 - Add employee functions
   Execute as: Me
   Who has access: Anyone
   ```

4. Click **Deploy**

5. **Copy Web App URL** (dạng: `https://script.google.com/macros/s/ABC123.../exec`)

### **Bước 2: Test Function getNhanVien()**

1. Trong Apps Script Editor, chạy:
   ```javascript
   function testGetNhanVien() {
     const employees = getNhanVien();
     Logger.log(`Found ${employees.length} employees`);
     Logger.log(JSON.stringify(employees[0], null, 2));
   }
   ```

2. Click **Run** và xem **View → Logs**

3. Kiểm tra output:
   ```json
   {
     "maNhanVien": "NV001",
     "hoVaTen": "Nguyễn Văn A",
     "phongBan": "Kinh doanh",
     ...
   }
   ```

### **Bước 3: Test Web App Endpoint**

1. Mở terminal và edit script:
   ```bash
   cd /Users/mac/Desktop/nak-logistic-system
   nano scripts/test-gas-employee.sh
   ```

2. Thay `{YOUR_SCRIPT_ID}` bằng Web App URL của bạn:
   ```bash
   GAS_URL="https://script.google.com/macros/s/YOUR_ACTUAL_SCRIPT_ID/exec?action=getNhanVien"
   ```

3. Chạy test:
   ```bash
   ./scripts/test-gas-employee.sh
   ```

4. Kết quả mong đợi:
   ```
   ✅ Valid JSON response
   ✅ Request successful!
   📊 Total employees: 10
   👤 First employee: { ... }
   ```

### **Bước 4: Import vào Database**

#### **Option A: Sử dụng Script (Dễ nhất)**

1. Edit script:
   ```bash
   nano scripts/import-employees.sh
   ```

2. Thay secret key:
   ```bash
   SECRET_KEY="your_actual_secret_here"  # Lấy từ env MIGRATION_SECRET
   ```

3. Chạy import:
   ```bash
   ./scripts/import-employees.sh
   ```

4. Kết quả:
   ```
   ✅ Import successful!
   📊 Import Statistics:
      Total records: 10
      ✅ Imported: 8
      🔄 Updated: 2
   👥 Sample imported employees:
      - NV001: Nguyễn Văn A (Giám đốc)
      - NV002: Trần Văn B (Quản lý)
   ```

#### **Option B: Sử dụng curl (Manual)**

```bash
curl "https://nak-system.vercel.app/api/employees/import?secret=YOUR_SECRET_KEY"
```

#### **Option C: Sử dụng Browser**

Mở link trong browser:
```
https://nak-system.vercel.app/api/employees/import?secret=YOUR_SECRET_KEY
```

### **Bước 5: Verify Dữ Liệu**

#### **Option A: Test Script có sẵn**

```bash
./scripts/test-employee-import.sh
```

Kết quả:
```
✅ Test 1: Import from Google Sheets - PASSED
✅ Test 2: List all employees - PASSED
✅ Test 3: Filter active employees - PASSED
```

#### **Option B: Manual API Test**

```bash
# Get all employees
curl "https://nak-system.vercel.app/api/employees"

# Get specific employee
curl "https://nak-system.vercel.app/api/employees?ma_nhan_vien=NV001"

# Get by department
curl "https://nak-system.vercel.app/api/employees?phong_ban=Kinh%20doanh"
```

#### **Option C: Direct Database Query**

Nếu có access PostgreSQL:

```sql
-- Check total count
SELECT COUNT(*) FROM nhan_vien;

-- View all employees
SELECT ma_nhan_vien, ho_va_ten, phong_ban, chuc_vu, trang_thai 
FROM nhan_vien 
ORDER BY created_at DESC;

-- Check specific employee
SELECT * FROM nhan_vien WHERE ma_nhan_vien = 'NV001';

-- Check by department
SELECT ma_nhan_vien, ho_va_ten, chuc_vu 
FROM nhan_vien 
WHERE phong_ban = 'Kinh doanh';
```

---

## 🔄 Cách 2: Import Thủ Công (Advanced)

Nếu muốn import từ file JSON hoặc CSV:

### **Từ JSON File**

1. Chuẩn bị file `employees.json`:
   ```json
   [
     {
       "maNhanVien": "NV001",
       "hoVaTen": "Nguyễn Văn A",
       "phongBan": "Kinh doanh",
       "chucVu": "Giám đốc",
       "soDienThoai": "0901234567",
       "email": "nva@nak.com",
       "trangThai": "Đang làm việc",
       "phanQuyen": "admin",
       "xem": true,
       "them": true,
       "sua": true,
       "xoa": true
     }
   ]
   ```

2. Import bằng script:
   ```bash
   # Create import script
   cat > scripts/import-from-json.js << 'EOF'
   const fs = require('fs');
   const employees = JSON.parse(fs.readFileSync('employees.json'));
   
   async function importEmployees() {
     for (const emp of employees) {
       const response = await fetch('https://nak-system.vercel.app/api/webhook/appsheet', {
         method: 'POST',
         headers: {
           'x-api-key': process.env.APPSHEET_SECRET_KEY,
           'Content-Type': 'application/json'
         },
         body: JSON.stringify({
           Action: 'Employee_Add',
           ...emp
         })
       });
       const result = await response.json();
       console.log(`${emp.maNhanVien}: ${result.success ? '✅' : '❌'}`);
     }
   }
   
   importEmployees();
   EOF
   
   # Run
   node scripts/import-from-json.js
   ```

### **Từ CSV File**

1. Export Google Sheets thành CSV

2. Convert CSV → JSON:
   ```bash
   # Using online tool or script
   # https://csvjson.com/csv2json
   ```

3. Import như trên

---

## 🔧 Troubleshooting

### ❌ Error: "Authorization required"

**Nguyên nhân:** Chưa authorize Apps Script

**Giải pháp:**
1. Run function `getNhanVien()` trong GAS Editor lần đầu
2. Click **Review Permissions**
3. Chọn Google account và click **Allow**

### ❌ Error: "Sheet 'nhan_vien' not found"

**Nguyên nhân:** Tên sheet không đúng

**Giải pháp:**
1. Kiểm tra tên sheet trong Google Sheets
2. Update `Config.gs`:
   ```javascript
   SHEET_NAMES: {
     EMPLOYEES: 'ten_sheet_dung'  // Sửa lại
   }
   ```

### ❌ Error: "Invalid secret key"

**Nguyên nhân:** Secret key không đúng

**Giải pháp:**
1. Check environment variable trong Vercel:
   ```
   MIGRATION_SECRET=your_secret_key
   ```
2. Update script với key đúng

### ❌ Error: "Duplicate key violation"

**Nguyên nhân:** Employee code đã tồn tại

**Giải pháp:**
1. Check existing records:
   ```sql
   SELECT ma_nhan_vien FROM nhan_vien WHERE ma_nhan_vien = 'NV001';
   ```
2. Delete existing record nếu cần:
   ```sql
   DELETE FROM nhan_vien WHERE ma_nhan_vien = 'NV001';
   ```
3. Hoặc sử dụng Employee_Edit thay vì Employee_Add

### ❌ Error: "Column not found"

**Nguyên nhân:** Tên column trong Sheets khác Config

**Giải pháp:**
1. Xem log để biết tên column thực tế:
   ```javascript
   function debugColumns() {
     const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
       .getSheetByName('nhan_vien');
     const headers = sheet.getDataRange().getValues()[0];
     Logger.log('Headers:', headers);
   }
   ```
2. Update `EMPLOYEES_COLUMNS` trong Config.gs

---

## 📊 Monitoring

### Check Import Status

```bash
# Count records in database
curl "https://nak-system.vercel.app/api/employees" | jq '.employees | length'

# Get recent imports
curl "https://nak-system.vercel.app/api/employees" | jq '.employees[0:5]'
```

### View Logs

**Google Apps Script:**
- View → Logs
- View → Executions

**Vercel:**
- Dashboard → Project → Logs
- Filter by `/api/employees/import`

**Database:**
```sql
-- Recent updates
SELECT ma_nhan_vien, ho_va_ten, updated_at 
FROM nhan_vien 
ORDER BY updated_at DESC 
LIMIT 10;
```

---

## 🎯 Quick Reference

### Import Command (One-liner)

```bash
curl "https://nak-system.vercel.app/api/employees/import?secret=YOUR_SECRET" | jq '.'
```

### Verify Command

```bash
curl "https://nak-system.vercel.app/api/employees" | jq '.employees | length'
```

### Test All

```bash
./scripts/test-employee-import.sh
```

---

## 📚 Related Files

- `scripts/test-gas-employee.sh` - Test Google Apps Script endpoint
- `scripts/import-employees.sh` - Import to database
- `scripts/test-employee-import.sh` - Verify import
- `GAS_NHAN_VIEN_GUIDE.md` - Google Apps Script guide
- `EMPLOYEE_SYNC_COMPLETE_GUIDE.md` - Complete sync guide
- `EMPLOYEES_IMPORT_GUIDE.md` - API documentation

---

## ✅ Success Checklist

Sau khi import thành công:

- [ ] ✅ Google Apps Script deployed
- [ ] ✅ getNhanVien() returns data
- [ ] ✅ Web app endpoint accessible
- [ ] ✅ Import API call successful
- [ ] ✅ Data visible in database
- [ ] ✅ API endpoints return employees
- [ ] ✅ All test scripts pass
- [ ] ✅ Logs show no errors

---

## 🚀 Next Steps

Sau khi import xong:

1. **Setup AppSheet Bots** để auto-sync khi Add/Edit/Delete
   - Xem: `EMPLOYEE_SYNC_COMPLETE_GUIDE.md`

2. **Integrate với Telegram Bot** để authenticate users
   - Check user permissions từ `nhan_vien` table

3. **Setup scheduled re-sync** (optional)
   - Cron job chạy import mỗi ngày
   - Đảm bảo data luôn đồng bộ

---

## 💡 Tips

- **Lần đầu import:** Dùng script `import-employees.sh` để dễ dàng
- **Re-import:** API tự động UPSERT, không bị duplicate
- **Verify ngay:** Luôn chạy test script sau import
- **Check logs:** Nếu có lỗi, check logs trong Vercel Dashboard
- **Backup trước:** Export database trước khi import lần đầu

---

## 📞 Support

Nếu gặp vấn đề:

1. Check logs trong Google Apps Script (View → Executions)
2. Check logs trong Vercel Dashboard
3. Run test scripts để xác định lỗi
4. Xem troubleshooting guide ở trên
5. Check database trực tiếp với SQL queries

---

**Happy importing! 🎉**
