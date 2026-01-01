# 🔴 DASHBOARD ERROR FIX - Missing Postgres Configuration

## ❌ Vấn đề

Dashboard hiển thị lỗi: **"Failed to fetch dashboard data"**

**Nguyên nhân:** File `.env.local` **THIẾU** cấu hình Vercel Postgres Database.

API `/api/dashboard/stats` cần kết nối database để lấy dữ liệu từ:
- `reconciliation_orders` (Doanh thu, Đơn chờ duyệt, Provider breakdown)
- `vehicles` (Tình trạng đội xe)
- `fuel_imports` & `fuel_transactions` (Mức nhiên liệu)

---

## ✅ GIẢI PHÁP

### **Bước 1: Tạo Vercel Postgres Database**

1. Truy cập: https://vercel.com/dashboard
2. Chọn project `nak-logistic-system`
3. Vào tab **Storage** → Click **Create Database**
4. Chọn **Postgres** → Nhập tên (VD: `nak-logistics-db`)
5. Chọn region gần nhất (Singapore/Tokyo)
6. Click **Create**

### **Bước 2: Lấy Connection String**

1. Vào database vừa tạo
2. Click tab **Connect** hoặc **Settings**
3. Copy **TẤT CẢ** các biến môi trường:
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL`
   - `POSTGRES_URL_NO_SSL`
   - `POSTGRES_URL_NON_POOLING`
   - `POSTGRES_USER`
   - `POSTGRES_HOST`
   - `POSTGRES_PASSWORD`
   - `POSTGRES_DATABASE`

### **Bước 3: Cập nhật `.env.local`**

**Mở file:** `.env.local`

**Thêm vào cuối file:**

```env
# ========================================
# VERCEL POSTGRES (REQUIRED FOR DASHBOARD)
# ========================================

POSTGRES_URL="postgres://default:YOUR_PASSWORD@YOUR_HOST.postgres.vercel-storage.com/verceldb"
POSTGRES_PRISMA_URL="postgres://default:YOUR_PASSWORD@YOUR_HOST.postgres.vercel-storage.com/verceldb?pgbouncer=true&connect_timeout=15"
POSTGRES_URL_NO_SSL="postgres://default:YOUR_PASSWORD@YOUR_HOST.postgres.vercel-storage.com/verceldb"
POSTGRES_URL_NON_POOLING="postgres://default:YOUR_PASSWORD@YOUR_HOST.postgres.vercel-storage.com/verceldb"
POSTGRES_USER="default"
POSTGRES_HOST="YOUR_HOST.postgres.vercel-storage.com"
POSTGRES_PASSWORD="YOUR_PASSWORD"
POSTGRES_DATABASE="verceldb"
```

**⚠️ Thay thế:**
- `YOUR_PASSWORD` → Password thực từ Vercel
- `YOUR_HOST` → Host thực từ Vercel

### **Bước 4: Chạy Migration (Tạo Tables)**

```bash
# Option 1: Qua Vercel Dashboard
# 1. Vào Storage → Postgres → Query tab
# 2. Copy nội dung các file trong thư mục database/ và chạy theo thứ tự:

# 001_create_reconciliation_orders.sql
# 002_upgrade_reconciliation_schema.sql
# 005_create_vehicles_table.sql
# (các file fuel nếu cần)
```

```bash
# Option 2: Qua Terminal (nếu có psql)
psql "$POSTGRES_URL" -f database/001_create_reconciliation_orders.sql
psql "$POSTGRES_URL" -f database/002_upgrade_reconciliation_schema.sql
psql "$POSTGRES_URL" -f database/005_create_vehicles_table.sql
```

### **Bước 5: Restart Server**

```bash
# Stop server hiện tại (Ctrl+C)
# Khởi động lại
npm run dev
```

### **Bước 6: Kiểm tra**

1. Reload trang Dashboard
2. Nếu vẫn lỗi, check console logs:
   ```bash
   curl http://localhost:3000/api/dashboard/stats
   ```

---

## 🧪 VERIFY DATABASE

```bash
# Test connection
psql "$POSTGRES_URL" -c "SELECT 1"

# Check tables exist
psql "$POSTGRES_URL" -c "\dt"

# Expected output:
# - reconciliation_orders
# - vehicles
# - fuel_imports
# - fuel_transactions
```

---

## 📋 FILE TEMPLATE ĐÃ TẠO

Tôi đã tạo file mẫu: `.env.local.template`

**Sử dụng:**
```bash
# Copy template
cp .env.local.template .env.local

# Chỉnh sửa với connection strings thực
nano .env.local
# hoặc
code .env.local
```

---

## 🔍 DEBUG CHECKLIST

- [ ] ✅ Đã tạo Vercel Postgres Database
- [ ] ✅ Đã copy connection strings vào `.env.local`
- [ ] ✅ Đã chạy migration files (tạo tables)
- [ ] ✅ Đã restart dev server
- [ ] ✅ Database có data test (ít nhất 1 row mỗi table)

---

## 🆘 NẾU VẪN LỖI

1. **Check environment variables loaded:**
   ```bash
   node -e "console.log(process.env.POSTGRES_URL)"
   ```
   - Nếu undefined → `.env.local` chưa được load

2. **Check API logs:**
   ```bash
   curl -v http://localhost:3000/api/dashboard/stats
   ```
   - Xem error message cụ thể

3. **Check database connection:**
   ```bash
   psql "$POSTGRES_URL" -c "SELECT COUNT(*) FROM reconciliation_orders"
   ```
   - Nếu lỗi connection → Check POSTGRES_URL có đúng không

---

## 📝 LƯU Ý QUAN TRỌNG

1. **KHÔNG commit `.env.local` lên Git** (đã có trong `.gitignore`)
2. **Vercel Production:** Thêm env vars vào Vercel Dashboard → Settings → Environment Variables
3. **Tables phải tồn tại:** Dashboard cần tất cả 4 tables: `reconciliation_orders`, `vehicles`, `fuel_imports`, `fuel_transactions`

---

**Status:** ⏳ Chờ bạn cấu hình Postgres để Dashboard hoạt động!
