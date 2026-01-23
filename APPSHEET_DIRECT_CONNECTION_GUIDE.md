# 🔌 AppSheet Direct PostgreSQL Connection Guide

## Mục tiêu

Thay vì AppSheet → Google Sheets → GAS → Webhook → Next.js, giờ sẽ là:
**AppSheet → PostgreSQL trực tiếp**

---

## Bước 1: Setup Database User cho AppSheet

### 1.1. Tạo Read-Only User (Recommended)

```sql
-- Connect to database
psql "postgresql://postgres:123@163.223.12.189:5432/nak_vn"

-- Create AppSheet user with limited permissions
CREATE USER appsheet_user WITH PASSWORD 'AppSheet2026@Secure!';

-- Grant SELECT, INSERT, UPDATE permissions (NO DELETE for safety)
GRANT CONNECT ON DATABASE nak_vn TO appsheet_user;
GRANT USAGE ON SCHEMA public TO appsheet_user;

-- Tables for reconciliation
GRANT SELECT, INSERT, UPDATE ON chuyen_di TO appsheet_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON chi_tiet_chuyen_di TO appsheet_user;
GRANT USAGE, SELECT ON SEQUENCE chuyen_di_id_seq TO appsheet_user;
GRANT USAGE, SELECT ON SEQUENCE chi_tiet_chuyen_di_id_seq TO appsheet_user;

-- Tables for fuel management
GRANT SELECT, INSERT, UPDATE ON fuel_transactions TO appsheet_user;
GRANT SELECT, INSERT, UPDATE ON fuel_imports TO appsheet_user;

-- Tables for vehicles
GRANT SELECT, INSERT, UPDATE ON vehicles TO appsheet_user;

-- Tables for employees
GRANT SELECT ON nhan_vien TO appsheet_user;

-- Verify permissions
\du appsheet_user
```

---

## Bước 2: Configure AppSheet Data Source

### 2.1. Add New Data Source

1. Mở AppSheet Editor: https://www.appsheet.com/
2. Chọn App của bạn
3. Click **Data** → **Add Data**
4. Chọn **Cloud Database** → **PostgreSQL**

### 2.2. Connection Details

```
Host: 163.223.12.189
Port: 5432
Database: nak_vn
Username: appsheet_user
Password: AppSheet2026@Secure!
SSL Mode: Disable (vì self-hosted không có SSL)
```

### 2.3. Test Connection

Click **Test Connection** → Should show "✅ Connection successful"

---

## Bước 3: Add Tables to AppSheet

### 3.1. Add Master Table: `chuyen_di`

1. Click **Add Table**
2. Chọn schema: `public`
3. Chọn table: `chuyen_di`
4. Click **Add**

**Column Mapping:**
- `id` → Hidden (auto-increment)
- `ma_chuyen_di` → Key, Show, Editable = FALSE (auto-generated)
- `ngay_tao` → Date, Show
- `ten_khach_hang` → Text, Show, Enum (dropdown customers)
- `ten_tuyen` → Text, Show
- `ten_tai_xe` → Text, Show, Enum (dropdown drivers)
- `don_vi_van_chuyen` → Enum: ["NAK", "VENDOR", "OTHER"]
- `loai_chuyen` → Enum: ["Một chiều", "Hai chiều", "Nhiều điểm"]
- `loai_tuyen` → Enum: ["Nội thành", "Liên tỉnh", "Đường dài"]
- `trang_thai` → Enum: ["pending", "approved", "rejected"]
- `tong_quang_duong` → Number (Decimal)
- `tong_doanh_thu` → Number (Price)
- `tong_chi_phi` → Number (Price)
- `ghi_chu` → LongText
- `created_at` → DateTime, Show = FALSE, Editable = FALSE
- `updated_at` → DateTime, Show = FALSE, Editable = FALSE

### 3.2. Add Detail Table: `chi_tiet_chuyen_di`

1. Click **Add Table**
2. Chọn table: `chi_tiet_chuyen_di`

**Column Mapping:**
- `id` → Hidden
- `ma_chuyen_di` → **Ref** to `chuyen_di.ma_chuyen_di` (FOREIGN KEY)
- `thu_tu` → Number (Order)
- `loai_tuyen_kh` → Text
- `ma_tuyen` → Text, Enum (từ bảng giá)
- `lo_trinh` → Text, Show
- `lo_trinh_chi_tiet` → LongText
- `bien_kiem_soat` → Text, Enum (từ table vehicles)
- `tai_trong` → Decimal
- `tai_trong_tinh_phi` → Decimal
- `quang_duong` → Decimal
- `so_chieu` → Number
- `don_gia` → Price (Auto-filled từ bảng giá)
- `thanh_tien` → Price (Formula: `[don_gia] * [so_chieu] * [quang_duong]`)
- `hinh_thuc_tinh_gia` → Enum: ["Theo tuyến", "Theo ca"]
- `loai_ca` → Enum: ["Ca ngày", "Ca đêm", "Ca hỗn hợp"]
- `ten_khach_hang_cap_1` → Text
- `ngay_tren_tem` → Date

### 3.3. Setup Relationship

```
chuyen_di (Master)
  ↓ 1:N
chi_tiet_chuyen_di (Detail)
  Foreign Key: ma_chuyen_di → chuyen_di.ma_chuyen_di
```

**In AppSheet:**
- Go to `chuyen_di` table
- Add Virtual Column: `ChiTiet`
- Type: `List`
- Formula: `REF_ROWS("chi_tiet_chuyen_di", "ma_chuyen_di")`

---

## Bước 4: Create Views in AppSheet

### 4.1. Master-Detail View

**View: ChuyenDiForm**
- Type: Form
- For: `chuyen_di`
- Show Related: `chi_tiet_chuyen_di` (inline table)

**View: ChiTietTable**
- Type: Table
- For: `chi_tiet_chuyen_di`
- Parent: `ChuyenDiForm`

### 4.2. Dashboard View

**View: Dashboard**
- Type: Dashboard
- Cards:
  - Total Revenue Today
  - Total Trips Today
  - Pending Approvals

---

## Bước 5: Configure Workflows (Thay thế Bots)

### 5.1. Disable Old Bots (Google Sheets based)

1. Go to **Automation** → **Bots**
2. Tắt các bots cũ:
   - `syncTripToBackend_Add`
   - `syncTripToBackend_Edit`
   - `syncTripToBackend_Delete`

### 5.2. Create Database Triggers (Optional)

Nếu bạn vẫn muốn gửi notification khi có thay đổi:

**Option A: PostgreSQL Triggers → Webhook**
```sql
CREATE OR REPLACE FUNCTION notify_trip_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Send HTTP POST to Next.js API
    PERFORM pg_notify(
        'trip_changed',
        json_build_object(
            'action', TG_OP,
            'ma_chuyen_di', NEW.ma_chuyen_di,
            'timestamp', NOW()
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chuyen_di_changed
AFTER INSERT OR UPDATE OR DELETE ON chuyen_di
FOR EACH ROW
EXECUTE FUNCTION notify_trip_change();
```

**Option B: AppSheet Workflows**
- Workflow: `OnTripSaved`
- Event: `Data Change` → `chuyen_di` → `Adds or Updates`
- Action: `Call Webhook`
  - URL: `https://nak-system.vercel.app/api/webhook/trip-notification`
  - Method: POST
  - Body: `{"action": "update", "trip_id": <<[ma_chuyen_di]>>}`

---

## Bước 6: Security Best Practices

### 6.1. IP Whitelisting (Recommended)

```sql
-- Allow only AppSheet IPs (check AppSheet documentation for IP ranges)
-- In PostgreSQL pg_hba.conf:
# host    nak_vn    appsheet_user    52.0.0.0/8    md5
# host    nak_vn    appsheet_user    35.0.0.0/8    md5
```

### 6.2. Row-Level Security (RLS)

```sql
-- Enable RLS on sensitive tables
ALTER TABLE chuyen_di ENABLE ROW LEVEL SECURITY;

-- Policy: AppSheet can only see non-deleted records
CREATE POLICY appsheet_chuyen_di_select ON chuyen_di
    FOR SELECT
    TO appsheet_user
    USING (trang_thai != 'deleted');

-- Policy: AppSheet can insert/update
CREATE POLICY appsheet_chuyen_di_write ON chuyen_di
    FOR INSERT
    TO appsheet_user
    WITH CHECK (true);
```

### 6.3. Audit Logging

```sql
-- Create audit log table
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    table_name TEXT,
    action TEXT,
    user_name TEXT,
    old_data JSONB,
    new_data JSONB,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger function
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (table_name, action, user_name, old_data, new_data)
    VALUES (
        TG_TABLE_NAME,
        TG_OP,
        current_user,
        row_to_json(OLD),
        row_to_json(NEW)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER audit_chuyen_di
AFTER INSERT OR UPDATE OR DELETE ON chuyen_di
FOR EACH ROW EXECUTE FUNCTION audit_trigger();
```

---

## Bước 7: Testing & Validation

### 7.1. Test CRUD Operations

**Test 1: Create New Trip**
1. Mở AppSheet App
2. Tạo chuyến đi mới
3. Verify trong database:
```sql
SELECT * FROM chuyen_di ORDER BY created_at DESC LIMIT 1;
```

**Test 2: Add Trip Details**
1. Thêm chi tiết lộ trình
2. Verify:
```sql
SELECT * FROM chi_tiet_chuyen_di 
WHERE ma_chuyen_di = '<trip_id>' 
ORDER BY thu_tu;
```

**Test 3: Update Trip**
1. Sửa thông tin chuyến đi
2. Check `updated_at` changed:
```sql
SELECT ma_chuyen_di, updated_at FROM chuyen_di WHERE ma_chuyen_di = '<trip_id>';
```

### 7.2. Performance Testing

```sql
-- Check query performance
EXPLAIN ANALYZE 
SELECT cd.*, 
       json_agg(ct ORDER BY ct.thu_tu) as chi_tiet
FROM chuyen_di cd
LEFT JOIN chi_tiet_chuyen_di ct ON ct.ma_chuyen_di = cd.ma_chuyen_di
WHERE cd.ngay_tao >= '2026-01-01'
GROUP BY cd.id
LIMIT 100;
```

---

## Bước 8: Rollback Plan (if needed)

### 8.1. Keep Webhook Active (Phase 1-2)

- Giữ lại webhook endpoint `/api/webhook/appsheet`
- Dual-write: AppSheet write vào DB, GAS cũng sync (backup)

### 8.2. Revert to Google Sheets

```
1. Disable AppSheet direct connection
2. Re-enable Bots
3. Point data source back to Google Sheets
4. Restore webhook flow
```

---

## Bước 9: Monitoring & Maintenance

### 9.1. Database Monitoring

```sql
-- Check connection count
SELECT count(*) FROM pg_stat_activity 
WHERE usename = 'appsheet_user';

-- Check slow queries
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - query_start > interval '5 seconds';

-- Check table sizes
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 9.2. Backup Strategy

```bash
# Daily backup
pg_dump "postgresql://postgres:123@163.223.12.189:5432/nak_vn" \
  --format=custom \
  --file=/backup/nak_vn_$(date +%Y%m%d).dump

# Restore (if needed)
pg_restore -d nak_vn /backup/nak_vn_20260122.dump
```

---

## Lợi ích của Direct Connection

### ✅ Ưu điểm
1. **Latency thấp**: Không qua GAS, không qua webhook
2. **Real-time**: Thay đổi ngay lập tức
3. **Đơn giản**: Bớt 2-3 layers (Sheets, GAS, Webhook)
4. **Native AppSheet UI**: Built-in forms, validation
5. **Offline capable**: AppSheet cache data locally

### ⚠️ Lưu ý
1. **Security**: Database credentials trong AppSheet
2. **No validation layer**: GAS không filter bad data nữa
3. **Direct DB access**: Cần cẩn thận với DELETE operations
4. **Connection limits**: PostgreSQL max connections (default 100)

---

## Next Steps

1. ✅ Run migration script: `migrate_to_normalized_schema.sql`
2. ✅ Test connection: `psql "postgresql://..."`
3. ✅ Create appsheet_user
4. ✅ Configure AppSheet data source
5. ✅ Add tables to AppSheet
6. ✅ Test CRUD operations
7. ✅ Monitor for 1-2 weeks
8. 🚀 Deprecate webhook (optional)

---

## Support

Nếu gặp vấn đề:
- Check PostgreSQL logs: `/var/log/postgresql/`
- Check AppSheet logs: AppSheet Editor → Monitor
- Test connection: `psql -h 163.223.12.189 -U appsheet_user -d nak_vn`
