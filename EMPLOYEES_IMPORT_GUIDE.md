# Hướng Dẫn Import Nhân Viên

## 📋 Overview

Hệ thống import dữ liệu nhân viên từ Google Sheets vào PostgreSQL database để phục vụ cho:
- Telegram bot authentication
- Role-based access control
- Employee management

---

## 🚀 Setup Steps

### Bước 1: Tạo bảng trong Database

Chạy SQL script để tạo bảng `nhan_vien`:

```bash
# Option 1: Qua Vercel Postgres Dashboard
# - Copy nội dung từ sql/create_nhan_vien_table.sql
# - Paste vào Query editor
# - Execute

# Option 2: Qua psql client
psql $DATABASE_URL -f sql/create_nhan_vien_table.sql
```

### Bước 2: Cập nhật Google Apps Script

1. Mở Google Apps Script project
2. Thêm function `getNhanVien()` từ file `GOOGLE_APPS_SCRIPT_NHAN_VIEN.md`
3. Deploy as Web App
4. Copy deployment URL

### Bước 3: Kiểm tra Environment Variables

Đảm bảo có các biến môi trường:

```bash
# .env.local
NEXT_PUBLIC_GAS_API_URL=https://script.google.com/macros/s/YOUR_ID/exec
MIGRATION_SECRET=migration-2025-secure
POSTGRES_URL=postgresql://...
```

### Bước 4: Test Import Local

```bash
# Start dev server
npm run dev

# Import employees
curl "http://localhost:3000/api/employees/import?secret=migration-2025-secure"
```

Expected response:
```json
{
  "success": true,
  "imported": 45,
  "failed": 0,
  "total": 45,
  "timestamp": "2026-01-13T..."
}
```

### Bước 5: Deploy & Import Production

```bash
# Deploy to Vercel
git add .
git commit -m "Add employee import system"
git push

# Import on production
curl "https://nak-logistic-system.vercel.app/api/employees/import?secret=migration-2025-secure"
```

---

## 📊 API Endpoints

### 1. Import Employees

**Endpoint:** `GET /api/employees/import`

**Query params:**
- `secret` (required): Migration secret for authentication

**Response:**
```json
{
  "success": true,
  "imported": 45,
  "failed": 0,
  "total": 45,
  "errors": [],
  "timestamp": "2026-01-13T07:00:00.000Z"
}
```

---

### 2. Get Employees List

**Endpoint:** `GET /api/employees`

**Query params:**
- `active` (optional): Filter by active status (true/false)
- `phong_ban` (optional): Filter by department
- `phan_quyen` (optional): Filter by role
- `ma_nhan_vien` (optional): Get specific employee
- `chat_id` (optional): Get employee by Telegram chat ID

**Examples:**

```bash
# Get all active employees
curl "http://localhost:3000/api/employees?active=true"

# Get employees by department
curl "http://localhost:3000/api/employees?phong_ban=IT"

# Get admins
curl "http://localhost:3000/api/employees?phan_quyen=admin"

# Get specific employee
curl "http://localhost:3000/api/employees?ma_nhan_vien=NAK001"

# Get employee by Telegram chat ID
curl "http://localhost:3000/api/employees?chat_id=123456789"
```

**Response:**
```json
{
  "total": 45,
  "employees": [
    {
      "id": 1,
      "ma_nhan_vien": "NAK001",
      "ho_va_ten": "Đặng Thành Nam",
      "phong_ban": "Quản lý",
      "chuc_vu": "Admin",
      "email": "nam@nak.com",
      "phan_quyen": "admin",
      "xem": true,
      "them": true,
      "sua": true,
      "xoa": true,
      "is_active": true
    }
  ]
}
```

---

### 3. Update Employee

**Endpoint:** `PUT /api/employees`

**Body:**
```json
{
  "ma_nhan_vien": "NAK001",
  "chat_id": "123456789",
  "last_login": true
}
```

**Response:**
```json
{
  "success": true,
  "employee": { ... }
}
```

---

## 🔐 Role Mapping

Hệ thống tự động map `chuc_vu` sang `phan_quyen`:

| Chức vụ (Google Sheets) | Phân quyền (DB) | Mô tả |
|--------------------------|-----------------|-------|
| Admin, Giám đốc | `admin` | Full access |
| Quản lý, Manager | `manager` | Management access |
| Nhân viên, Staff | `staff` | Staff access |
| Tài xế, Driver | `driver` | Driver-only access |
| Khác | `user` | Basic access |

---

## 📅 Cron Job (Auto Import)

### Option 1: Vercel Cron (Recommended)

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/employees/import?secret=migration-2025-secure",
      "schedule": "0 2 * * *"
    }
  ]
}
```

Schedule: Every day at 2:00 AM (UTC)

### Option 2: GitHub Actions

Create `.github/workflows/import-employees.yml`:
```yaml
name: Import Employees

on:
  schedule:
    - cron: '0 2 * * *'  # 2:00 AM UTC daily
  workflow_dispatch:

jobs:
  import:
    runs-on: ubuntu-latest
    steps:
      - name: Import employees
        run: |
          curl "${{ secrets.APP_URL }}/api/employees/import?secret=${{ secrets.MIGRATION_SECRET }}"
```

---

## 🐛 Troubleshooting

### Import fails with "No data received"

**Check:**
1. Google Apps Script deployed correctly?
2. `NEXT_PUBLIC_GAS_API_URL` correct?
3. Test directly: `curl $NEXT_PUBLIC_GAS_API_URL?action=getNhanVien`

### Dates not importing correctly

**Check:**
- Date format in Google Sheets
- Timezone settings in Apps Script
- Use `DD/MM/YYYY` or ISO format `YYYY-MM-DD`

### Employees not found by chat_id

**Update chat_id:**
```bash
curl -X PUT http://localhost:3000/api/employees \
  -H "Content-Type: application/json" \
  -d '{"ma_nhan_vien":"NAK001","chat_id":"123456789"}'
```

---

## 📈 Monitoring

### Check import logs

Vercel Dashboard → Functions → `/api/employees/import` → Logs

### Verify data

```sql
-- Check total employees
SELECT COUNT(*) FROM nhan_vien;

-- Check by role
SELECT phan_quyen, COUNT(*) 
FROM nhan_vien 
GROUP BY phan_quyen;

-- Check active employees
SELECT COUNT(*) 
FROM nhan_vien 
WHERE is_active = true;

-- Check employees with Telegram chat_id
SELECT COUNT(*) 
FROM nhan_vien 
WHERE chat_id IS NOT NULL;
```

---

## 🎯 Next Steps

1. ✅ Import employees
2. ✅ Verify data in database
3. 🔄 Integrate with Telegram bot authentication
4. 🔄 Build role-based menu system
5. 🔄 Add employee management UI

---

**Last Updated:** January 13, 2026
