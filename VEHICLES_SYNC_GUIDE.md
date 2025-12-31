# 🚗 VEHICLES SYNC MODULE - Hướng Dẫn Sử Dụng

## 📋 Tổng Quan

Module đồng bộ danh sách xe từ Google Sheet `phuong_tien` sang database Vercel Postgres (bảng `vehicles`).

**Ngày tạo:** 31/12/2025  
**Phiên bản:** 1.0  
**Tác giả:** Senior GAS Developer

---

## 🏗️ Kiến Trúc

```
Google Sheet (phuong_tien)
         ↓
  [Code.gs] syncVehiclesToDB()
         ↓
  Transform & Validate Data
         ↓
  POST → /api/webhook/appsheet
         ↓
  [route.ts] Handle "UpsertVehicles"
         ↓
  Vercel Postgres (vehicles table)
```

---

## 📊 Sheet Requirements

### Sheet Name
`phuong_tien`

### Header Row
**Row 1** phải chứa các cột sau (thứ tự không quan trọng):

| Tên Cột (Sheet) | Mapping (DB) | Type | Required | Description |
|-----------------|--------------|------|----------|-------------|
| `bien_kiem_soat` | `license_plate` | TEXT | ✅ | Biển kiểm soát (Primary Key) |
| `tai_trong` | `weight_capacity` | NUMBER | ❌ | Tải trọng (VD: 1,9 hoặc 1.9) |
| `don_vi` | `weight_unit` | TEXT | ❌ | Đơn vị (kg, tấn, ...) |
| `tai_trong_chu` | `weight_text` | TEXT | ❌ | Tải trọng bằng chữ |
| `hieu_xe` | `brand` | TEXT | ❌ | Hiệu xe (Hino, Isuzu, ...) |
| `loai_xe` | `body_type` | TEXT | ❌ | Loại thùng xe |
| `tinh_trang` | `current_status` | TEXT | ❌ | Tình trạng hoạt động |
| `dinh_muc_d` | `fuel_norm` | NUMBER | ❌ | Định mức dầu (lít/100km) |
| `tai_xe_theo_` | `assigned_driver_codes` | TEXT | ❌ | Mã tài xế |
| `loai_hinh` | `provider` | TEXT | ❌ | Loại hình (Xe thuê/Tự có) |

### Ví Dụ Data

| bien_kiem_soat | tai_trong | don_vi | hieu_xe | loai_xe | dinh_muc_d |
|----------------|-----------|--------|---------|---------|------------|
| 51C-12345 | 1,9 | tấn | Hino | Thùng kín | 25 |
| 59A-67890 | 3.5 | tấn | Isuzu | Mui bạt | 28.5 |

**Lưu ý:**
- Cột `tai_trong` có thể dùng dấu phẩy (1,9) hoặc dấu chấm (1.9) - code sẽ tự convert
- Nếu `dinh_muc_d` để trống → mặc định = 0
- `bien_kiem_soat` trống → row đó sẽ bị skip

---

## 🔧 Setup Guide

### 1. Chạy Migration SQL

Trước tiên, tạo bảng `vehicles` trên Vercel Postgres:

```bash
# Copy nội dung file này:
database/005_create_vehicles_table.sql

# Paste vào Vercel Postgres Dashboard > Query
# Hoặc chạy qua psql client
```

Verify table đã tạo:

```sql
SELECT * FROM vehicles LIMIT 5;
```

### 2. Update Config.gs

File `backend-gas/Config.gs` đã được update với:

```javascript
SHEET_NAMES: {
  VEHICLES: 'phuong_tien'  // ✅ Đã thêm
},

VEHICLES_COLUMNS: {
  'bien_kiem_soat': 'licensePlate',
  'tai_trong': 'weightCapacity',
  // ... (các cột khác)
}
```

### 3. Deploy Code.gs

Push code lên Google Apps Script:

```bash
cd backend-gas
clasp push
```

Hoặc copy-paste thủ công vào Apps Script Editor.

### 4. Test API Endpoint

Verify Next.js API đã nhận được code mới:

```bash
# Local test
curl -X POST http://localhost:3000/api/webhook/appsheet \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secret-key" \
  -d '{"Action":"UpsertVehicles","vehicles":[{"licensePlate":"TEST-001","weightCapacity":1.5,"fuelNorm":25}]}'

# Expected response:
{
  "success": true,
  "action": "upsert_vehicles",
  "total": 1,
  "successCount": 1,
  "errorCount": 0
}
```

---

## 🚀 Usage

### Method 1: Manual Sync (GAS Editor)

1. Mở Google Apps Script Editor
2. Chọn function `syncVehiclesToDB`
3. Click **Run** (▶️)
4. Xem logs trong **Executions** tab

### Method 2: Scheduled Trigger

Tự động chạy mỗi ngày:

1. GAS Editor → **Triggers** (⏰)
2. Click **Add Trigger**
3. Chọn:
   - Function: `syncVehiclesToDB`
   - Event source: **Time-driven**
   - Type: **Day timer**
   - Time: **2AM to 3AM** (hoặc thời gian khác)
4. Save

### Method 3: AppSheet Bot (Future)

Có thể tích hợp với AppSheet Bot để sync khi có thay đổi.

---

## 📝 Data Transformation

### Number Parsing

Code tự động xử lý format Việt Nam:

```javascript
// Input → Output
"1,9"   → 1.9
"1.9"   → 1.9
"15"    → 15
""      → 0 (default)
null    → 0 (default)
```

Áp dụng cho:
- `tai_trong` (weightCapacity)
- `dinh_muc_d` (fuelNorm)

### String Trimming

Tất cả text fields đều được `.trim()`:

```javascript
"  51C-12345  " → "51C-12345"
```

### Null Handling

Empty cells → `null` trong database (trừ số = 0)

---

## 🔍 Monitoring & Logs

### GAS Logs

Sau khi chạy `syncVehiclesToDB()`, check logs:

```
========== START VEHICLES SYNC ==========
Sheet: phuong_tien
✅ Read 25 vehicles from sheet
📤 Sending 25 vehicles to Backend...
========== VEHICLES SYNC SUCCESS ==========
✅ 25 vehicles synchronized successfully
```

### API Response

```json
{
  "success": true,
  "action": "upsert_vehicles",
  "total": 25,
  "successCount": 25,
  "errorCount": 0
}
```

Nếu có lỗi:

```json
{
  "success": true,
  "action": "upsert_vehicles",
  "total": 25,
  "successCount": 23,
  "errorCount": 2,
  "errors": [
    "BLANK-PLATE: licensePlate is required",
    "INVALID-001: duplicate key value violates unique constraint"
  ]
}
```

### Database Query

Verify data đã sync:

```sql
-- Count total vehicles
SELECT COUNT(*) FROM vehicles;

-- View recent updates
SELECT 
  license_plate,
  brand,
  body_type,
  fuel_norm,
  updated_at
FROM vehicles
ORDER BY updated_at DESC
LIMIT 10;

-- Check specific vehicle
SELECT * FROM vehicles
WHERE license_plate = '51C-12345';
```

---

## ⚠️ Troubleshooting

### Issue 1: "Sheet phuong_tien not found"

**Nguyên nhân:** Tên sheet không đúng hoặc sheet không tồn tại

**Giải pháp:**
1. Kiểm tra tên sheet trong Google Sheets (phải là `phuong_tien`)
2. Check `SPREADSHEET_ID` trong `Config.gs`
3. Đảm bảo GAS có quyền truy cập sheet

### Issue 2: "licensePlate is required"

**Nguyên nhân:** Cột `bien_kiem_soat` trống

**Giải pháp:**
- Điền biển kiểm soát cho tất cả xe
- Hoặc xóa row trống

### Issue 3: "Unauthorized"

**Nguyên nhân:** API key không đúng

**Giải pháp:**
```javascript
// Check Config.gs
API: {
  KEY: 'nak_logistics_2025_secure_key'  // Phải khớp với .env.local
}

// Check .env.local
APPSHEET_SECRET_KEY=nak_logistics_2025_secure_key
```

### Issue 4: "Table vehicles does not exist"

**Nguyên nhân:** Chưa chạy migration SQL

**Giải pháp:**
Chạy file `database/005_create_vehicles_table.sql`

### Issue 5: Number không parse đúng

**Ví dụ:** "1,9" → 19 (sai)

**Nguyên nhân:** GAS locale settings

**Giải pháp:**
Hàm `parseVietnameseNumber()` đã xử lý, nhưng check lại:

```javascript
// Test trong GAS Editor:
function testParse() {
  Logger.log(parseVietnameseNumber("1,9"));  // Should be 1.9
  Logger.log(parseVietnameseNumber("2.5"));  // Should be 2.5
}
```

---

## 🧪 Testing Checklist

Trước khi deploy production:

- [ ] Migration SQL đã chạy thành công
- [ ] Config.gs có VEHICLES_COLUMNS mapping
- [ ] Sheet `phuong_tien` có đúng header columns
- [ ] Test sync với 1-2 vehicles trước
- [ ] Verify data trong database
- [ ] Check API logs không có errors
- [ ] Test với empty/null values
- [ ] Test với special characters trong biển số

---

## 📈 Performance

### Batch Size

Hiện tại sync **toàn bộ sheet** mỗi lần.

**Ước tính:**
- 100 vehicles → ~5-10 seconds
- 500 vehicles → ~20-30 seconds
- 1000 vehicles → ~40-60 seconds

### Optimization Tips

Nếu số lượng xe > 1000:

1. **Batch Processing:** Chia nhỏ thành nhiều requests
2. **Incremental Sync:** Chỉ sync rows thay đổi (cần thêm timestamp column)
3. **Async Processing:** Dùng queue system

---

## 🔐 Security

### API Authentication

```javascript
// GAS gửi API key trong header
headers: {
  'x-api-key': CONFIG.API.KEY
}

// Next.js verify
if (apiKey !== expectedKey) {
  return 401 Unauthorized
}
```

### Data Validation

- `licensePlate`: Required, trimmed
- Numbers: Auto-convert, default 0
- SQL Injection: Protected bởi Vercel Postgres parameterized queries

---

## 📚 Related Files

```
backend-gas/
├── Config.gs              # ✅ Updated: VEHICLES_COLUMNS mapping
├── Code.gs                # ✅ Updated: syncVehiclesToDB() function

app/api/webhook/appsheet/
└── route.ts               # ✅ Updated: UpsertVehicles handler

database/
└── 005_create_vehicles_table.sql  # 🆕 Migration SQL
```

---

## 🎯 Next Steps

1. **Chạy migration** (`005_create_vehicles_table.sql`)
2. **Test sync** với vài vehicles
3. **Setup trigger** để tự động sync hàng ngày
4. **Monitor logs** trong vài ngày đầu
5. **(Optional)** Tạo UI để quản lý vehicles trên dashboard

---

## 💡 Tips

- Luôn backup database trước khi sync lần đầu
- Dùng `UPSERT` nên an toàn chạy nhiều lần
- Check logs sau mỗi lần sync
- Nếu có lỗi, sửa data trong sheet rồi chạy lại

---

## 🆘 Support

Nếu gặp vấn đề:

1. Check logs trong GAS Executions
2. Check API response trong Network tab
3. Query database để verify data
4. Review error messages trong console

**Contact:** [Your team contact info]

---

**Last Updated:** December 31, 2025  
**Version:** 1.0.0  
**Status:** ✅ Ready for Testing
