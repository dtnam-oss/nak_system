# Employee Sync Implementation - Complete Guide

## 📋 Tổng Quan

Đã implement đầy đủ logic sync nhân viên từ Google Sheets → Backend API → PostgreSQL, tương tự như logic của bảng `chuyen_di`.

---

## 🏗️ Architecture

```
┌──────────────────┐
│  AppSheet Bot    │  ← Trigger khi Add/Edit/Delete employee
│  (nhan_vien)     │
└────────┬─────────┘
         │
         │ syncEmployeeToBackend(ma_nhan_vien, eventType)
         ▼
┌──────────────────┐
│ Google Apps      │  ← Read from Google Sheets
│ Script (Code.gs) │  ← Map columns to JSON
└────────┬─────────┘
         │
         │ POST with Action: Employee_Add/Edit/Delete
         ▼
┌──────────────────┐
│ Backend API      │  ← Webhook handler
│ /webhook/appsheet│  ← Authentication
└────────┬─────────┘
         │
         │ UPSERT/DELETE
         ▼
┌──────────────────┐
│ PostgreSQL       │
│ nhan_vien table  │
└──────────────────┘
```

---

## 🔧 Implementation Details

### 1. Google Apps Script Functions

#### **syncEmployeeToBackend(employeeCode, eventType)**
Main entry point được gọi từ AppSheet Bot.

**Parameters:**
- `employeeCode` (string): Mã nhân viên (ma_nhan_vien)
- `eventType` (string): 'Add', 'Edit', hoặc 'Delete'

**Usage trong AppSheet Bot:**
```javascript
// Khi thêm nhân viên mới
syncEmployeeToBackend([ma_nhan_vien], "Add")

// Khi sửa thông tin nhân viên
syncEmployeeToBackend([ma_nhan_vien], "Edit")

// Khi xóa nhân viên
syncEmployeeToBackend([ma_nhan_vien], "Delete")
```

#### **getEmployeeData(employeeCode)**
Đọc dữ liệu nhân viên từ Sheet 'nhan_vien'.

**Returns:**
```javascript
{
  maNhanVien: "NV001",
  hoVaTen: "Nguyễn Văn A",
  phongBan: "Kinh doanh",
  chucVu: "Giám đốc",
  hinhAnh: "https://...",
  soDienThoai: "0901234567",
  email: "nva@nak.com",
  chatId: null,
  trangThai: "Đang làm việc",
  ngayVaoLam: "2020-01-15",
  ngayNghiViec: null,
  diaChi: "123 Đường ABC",
  soCccd: "001234567890",
  ngaySinh: "1990-05-20",
  gioiTinh: "Nam",
  tinhTrangHonNhan: "Độc thân",
  nguoiLienHeKhanCap: "Nguyễn Thị B",
  soDienThoaiKhanCap: "0987654321",
  phanQuyen: "admin",
  xem: true,
  them: true,
  sua: true,
  xoa: true
}
```

#### **mapEmployeeRow(row, headers)**
Map row từ Google Sheets sang JSON object với:
- **Date handling**: Auto-format dates to YYYY-MM-DD
- **Boolean handling**: Convert string "TRUE"/"FALSE" to boolean
- **Null handling**: Empty strings → null
- **Column mapping**: Dynamic mapping từ Config.EMPLOYEES_COLUMNS

### 2. Backend API Handler

File: `app/api/webhook/appsheet/route.ts`

#### **Employee_Add / Employee_Edit**

**Request:**
```json
POST /api/webhook/appsheet
Headers:
  x-api-key: {APPSHEET_SECRET_KEY}
  Content-Type: application/json

Body:
{
  "Action": "Employee_Add",  // or "Employee_Edit"
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
  // ... other fields
}
```

**Response (Success):**
```json
{
  "success": true,
  "action": "Employee_Add",
  "employeeCode": "NV001",
  "message": "Employee created successfully"
}
```

#### **Employee_Delete**

**Request:**
```json
{
  "Action": "Employee_Delete",
  "maNhanVien": "NV001"
}
```

**Response (Success):**
```json
{
  "success": true,
  "action": "Employee_Delete",
  "employeeCode": "NV001",
  "message": "Employee deleted successfully"
}
```

### 3. Database Operations

#### UPSERT (Add/Edit)
```sql
INSERT INTO nhan_vien (
  ma_nhan_vien, ho_va_ten, phong_ban, chuc_vu, hinh_anh,
  so_dien_thoai, email, chat_id, trang_thai,
  ngay_vao_lam, ngay_nghi_viec, dia_chi, so_cccd, ngay_sinh,
  gioi_tinh, tinh_trang_hon_nhan, nguoi_lien_he_khan_cap,
  so_dien_thoai_khan_cap, phan_quyen, xem, them, sua, xoa
) VALUES (...)
ON CONFLICT (ma_nhan_vien) DO UPDATE SET
  ho_va_ten = EXCLUDED.ho_va_ten,
  phong_ban = EXCLUDED.phong_ban,
  -- ... all fields
  updated_at = CURRENT_TIMESTAMP
```

#### DELETE
```sql
DELETE FROM nhan_vien
WHERE ma_nhan_vien = ${employeeCode}
```

---

## 🔄 Comparison with Trip Sync Logic

| Feature | Trip Sync | Employee Sync |
|---------|-----------|---------------|
| **Main Function** | `syncTripToBackend(tripId, eventType)` | `syncEmployeeToBackend(employeeCode, eventType)` |
| **Data Fetcher** | `getMasterData(tripId)` + `getDetailData(tripId)` | `getEmployeeData(employeeCode)` |
| **Row Mapper** | `mapMasterRow()` + `mapDetailRow()` | `mapEmployeeRow()` |
| **Delete Payload** | `{ Action: 'Delete', maChuyenDi: ... }` | `{ Action: 'Employee_Delete', maNhanVien: ... }` |
| **Add/Edit Actions** | `'Add'` / `'Edit'` | `'Employee_Add'` / `'Employee_Edit'` |
| **Foreign Key** | `ma_chuyen_di` | `ma_nhan_vien` |
| **Nested Data** | ✅ (chi_tiet_chuyen_di) | ❌ (single table) |
| **Auto Pricing** | ✅ | ❌ |
| **Column Mapping** | `MASTER_COLUMNS` + `DETAIL_COLUMNS` | `EMPLOYEES_COLUMNS` |

---

## 📝 Configuration (Config.gs)

### Sheet Name
```javascript
SHEET_NAMES: {
  EMPLOYEES: 'nhan_vien'
}
```

### Column Mapping
```javascript
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

---

## 🧪 Testing

### 1. Test Google Apps Script Function

Trong Google Apps Script Editor:

```javascript
function testEmployeeSync() {
  // Test Add
  const resultAdd = syncEmployeeToBackend('NV001', 'Add');
  Logger.log('Add Result:', JSON.stringify(resultAdd));
  
  // Test Edit
  const resultEdit = syncEmployeeToBackend('NV001', 'Edit');
  Logger.log('Edit Result:', JSON.stringify(resultEdit));
  
  // Test Delete
  const resultDelete = syncEmployeeToBackend('NV001', 'Delete');
  Logger.log('Delete Result:', JSON.stringify(resultDelete));
}
```

### 2. Test API Directly

**Test Add/Edit:**
```bash
curl -X POST "https://nak-system.vercel.app/api/webhook/appsheet" \
  -H "x-api-key: your_secret_key" \
  -H "Content-Type: application/json" \
  -d '{
    "Action": "Employee_Add",
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
  }'
```

**Test Delete:**
```bash
curl -X POST "https://nak-system.vercel.app/api/webhook/appsheet" \
  -H "x-api-key: your_secret_key" \
  -H "Content-Type: application/json" \
  -d '{
    "Action": "Employee_Delete",
    "maNhanVien": "NV001"
  }'
```

### 3. Verify in Database

```sql
-- Check if employee exists
SELECT * FROM nhan_vien WHERE ma_nhan_vien = 'NV001';

-- Check all employees
SELECT ma_nhan_vien, ho_va_ten, phong_ban, chuc_vu, trang_thai 
FROM nhan_vien 
ORDER BY created_at DESC 
LIMIT 10;

-- Check updated timestamp
SELECT ma_nhan_vien, ho_va_ten, created_at, updated_at 
FROM nhan_vien 
WHERE ma_nhan_vien = 'NV001';
```

---

## 🔗 AppSheet Integration

### Setup Bot trong AppSheet

1. **Tạo Bot mới:**
   - Name: `Sync Employee on Add`
   - Event: `Adds only`
   - Table: `nhan_vien`

2. **Configure Task:**
   - Type: `Call a script`
   - Script: Chọn Google Apps Script project
   - Function: `syncEmployeeToBackend`
   - Parameters:
     ```
     [ma_nhan_vien], "Add"
     ```

3. **Tạo Bot cho Edit:**
   - Name: `Sync Employee on Edit`
   - Event: `Updates only`
   - Table: `nhan_vien`
   - Function: `syncEmployeeToBackend`
   - Parameters: `[ma_nhan_vien], "Edit"`

4. **Tạo Bot cho Delete:**
   - Name: `Sync Employee on Delete`
   - Event: `Deletes only`
   - Table: `nhan_vien`
   - Function: `syncEmployeeToBackend`
   - Parameters: `[ma_nhan_vien], "Delete"`

---

## 🎯 Data Flow Example

### Add Employee Flow

```
1. User adds employee in AppSheet
   ↓
2. AppSheet Bot triggers: syncEmployeeToBackend("NV001", "Add")
   ↓
3. GAS reads from Sheet 'nhan_vien'
   ↓
4. GAS maps columns → JSON:
   {
     maNhanVien: "NV001",
     hoVaTen: "Nguyễn Văn A",
     ...
   }
   ↓
5. GAS sends POST to /api/webhook/appsheet:
   {
     Action: "Employee_Add",
     maNhanVien: "NV001",
     ...
   }
   ↓
6. Backend validates API key
   ↓
7. Backend UPSERTs to PostgreSQL
   ↓
8. Response: { success: true, employeeCode: "NV001" }
   ↓
9. GAS logs success
```

### Edit Employee Flow

Similar to Add, but:
- EventType: `"Edit"`
- Action: `"Employee_Edit"`
- SQL: `ON CONFLICT ... DO UPDATE`

### Delete Employee Flow

```
1. User deletes employee in AppSheet
   ↓
2. AppSheet Bot triggers: syncEmployeeToBackend("NV001", "Delete")
   ↓
3. GAS builds payload:
   {
     Action: "Employee_Delete",
     maNhanVien: "NV001"
   }
   ↓
4. Backend executes:
   DELETE FROM nhan_vien WHERE ma_nhan_vien = 'NV001'
   ↓
5. Response: { success: true, employeeCode: "NV001" }
```

---

## ⚠️ Important Notes

### 1. Data Type Handling

- **Dates:** Auto-convert to `YYYY-MM-DD` format
- **Booleans:** String `"TRUE"`/`"FALSE"` → boolean `true`/`false`
- **Empty values:** Empty strings → `null`
- **Strings:** Auto-trim whitespace

### 2. Default Values

- `trangThai`: Default = "Đang làm việc"
- `phanQuyen`: Default = "user"
- `xem`: Default = `true`
- `them`, `sua`, `xoa`: Default = `false`

### 3. Required Fields

- `ma_nhan_vien`: **REQUIRED** (Primary Key)
- `ho_va_ten`: **REQUIRED**
- All other fields: Optional

### 4. Unique Constraints

- `ma_nhan_vien`: Unique (Primary Key)
- `email`: Unique (if provided)
- `chat_id`: Unique (if provided)

---

## 🐛 Troubleshooting

### Error: "Sheet 'nhan_vien' not found"

**Solution:** Check sheet name in Google Sheets matches `Config.SHEET_NAMES.EMPLOYEES`

### Error: "Column not found"

**Solution:** Verify column names in Google Sheets header match keys in `Config.EMPLOYEES_COLUMNS`

### Error: "Unauthorized"

**Solution:** 
- Check API key in GAS: `Config.API.KEY`
- Check environment variable: `APPSHEET_SECRET_KEY` in Vercel
- Ensure header: `x-api-key: {KEY}`

### Error: "Employee not found"

**Solution:** Check `ma_nhan_vien` value exists in Google Sheets

### Error: "Duplicate key violation"

**Solution:** 
- For `ma_nhan_vien`: Employee code already exists (should use Edit instead of Add)
- For `email` or `chat_id`: Value already exists, use different value

---

## 📊 Logs & Monitoring

### Google Apps Script Logs

View logs in GAS Editor:
- View > Logs
- View > Executions

**Example logs:**
```
========== START EMPLOYEE SYNC ==========
Employee Code: NV001
Event Type: Add
ADD/EDIT event - Full payload created
[EMPLOYEE PAYLOAD] maNhanVien: NV001, hoVaTen: Nguyễn Văn A
========== EMPLOYEE SYNC SUCCESS ==========
```

### Backend API Logs

View in Vercel Dashboard:
- Project > Deployments > Logs
- Filter by function: `/api/webhook/appsheet`

**Example logs:**
```
🧑 Processing Employee_Add action...
✅ Employee Employee_Add successful: NV001
```

### Database Logs

```sql
-- Check recent updates
SELECT ma_nhan_vien, ho_va_ten, updated_at 
FROM nhan_vien 
ORDER BY updated_at DESC 
LIMIT 10;

-- Check creation timestamps
SELECT ma_nhan_vien, ho_va_ten, created_at 
FROM nhan_vien 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 🚀 Deployment Checklist

- [ ] Update `Config.gs` với EMPLOYEES config
- [ ] Deploy Google Apps Script as Web app
- [ ] Copy Web app URL
- [ ] Set API key trong Config.gs
- [ ] Set `APPSHEET_SECRET_KEY` trong Vercel
- [ ] Deploy backend code to Vercel
- [ ] Create AppSheet Bots (Add/Edit/Delete)
- [ ] Test Add flow
- [ ] Test Edit flow
- [ ] Test Delete flow
- [ ] Verify database records
- [ ] Check logs for errors
- [ ] Monitor performance

---

## 📚 Related Documentation

- `backend-gas/Code.gs` - All sync functions
- `backend-gas/Config.gs` - Configuration
- `app/api/webhook/appsheet/route.ts` - Backend handler
- `sql/create_nhan_vien_table.sql` - Database schema
- `GAS_NHAN_VIEN_GUIDE.md` - getNhanVien() function guide
- `EMPLOYEES_IMPORT_GUIDE.md` - Import from Google Sheets guide

---

## ✅ Summary

Đã hoàn thiện:
- ✅ Sync function tương tự trip sync
- ✅ Support Add/Edit/Delete events
- ✅ Dynamic column mapping
- ✅ Type-safe data conversion
- ✅ Error handling & logging
- ✅ Backend API handlers
- ✅ Database UPSERT/DELETE
- ✅ Complete documentation

System đã sẵn sàng để sync nhân viên từ AppSheet → Backend → Database!
