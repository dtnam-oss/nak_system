# 🚀 Quick Start: Vercel Postgres Migration

## ✅ Hoàn Thành

Code đã được cập nhật để sử dụng Vercel Postgres. Bây giờ hãy setup database!

## 📋 Checklist

- [ ] 1. Tạo Vercel Postgres database
- [ ] 2. Cấu hình environment variables
- [ ] 3. Chạy migration script
- [ ] 4. Test API locally
- [ ] 5. Deploy lên Vercel

---

## Step 1: Tạo Vercel Postgres Database

### Option A: Qua Vercel Dashboard (Recommended)

1. Đăng nhập vào [Vercel Dashboard](https://vercel.com/dashboard)
2. Chọn project **nak-logistic-system**
3. Vào tab **Storage**
4. Click **Create Database**
5. Chọn **Postgres** (powered by Neon)
6. Chọn region gần bạn nhất (VD: Singapore)
7. Click **Create**

### Option B: Qua Vercel CLI

```bash
# Cài đặt Vercel CLI (nếu chưa có)
npm install -g vercel

# Login
vercel login

# Tạo Postgres database
vercel storage create postgres nak-logistics-db --region sin1
```

---

## Step 2: Cấu hình Environment Variables

### Local Development (`.env.local`)

Sau khi tạo database, Vercel sẽ cung cấp connection strings. Copy và paste vào file `.env.local`:

```bash
# Vercel Postgres (Neon)
POSTGRES_URL="postgres://default:xxxxx@xxxxx.postgres.vercel-storage.com/verceldb"
POSTGRES_PRISMA_URL="postgres://default:xxxxx@xxxxx.postgres.vercel-storage.com/verceldb?pgbouncer=true"
POSTGRES_URL_NON_POOLING="postgres://default:xxxxx@xxxxx.postgres.vercel-storage.com/verceldb"
POSTGRES_USER="default"
POSTGRES_HOST="xxxxx.postgres.vercel-storage.com"
POSTGRES_PASSWORD="xxxxx"
POSTGRES_DATABASE="verceldb"
```

**Important:** Thay `xxxxx` bằng giá trị thực từ Vercel Dashboard.

### Production Deployment (Vercel)

Vercel tự động inject environment variables sau khi bạn link database với project. Không cần config thêm!

---

## Step 3: Chạy Migration Script

### Option A: Qua Vercel Dashboard (Easiest)

1. Vào **Storage** > **nak-logistics-db**
2. Click tab **Data**
3. Click **Query**
4. Copy toàn bộ nội dung file `database/001_create_reconciliation_orders.sql`
5. Paste vào query editor
6. Click **Run Query**

### Option B: Qua CLI với psql

```bash
# Lấy connection string từ .env.local
POSTGRES_URL="postgres://default:xxxxx@xxxxx.postgres.vercel-storage.com/verceldb"

# Chạy migration
psql "$POSTGRES_URL" -f database/001_create_reconciliation_orders.sql
```

### Option C: Qua Node.js Script

Tạo file `scripts/migrate.js`:

```javascript
const { sql } = require('@vercel/postgres')
const fs = require('fs')
const path = require('path')

async function migrate() {
  try {
    console.log('🚀 Running migration...')

    const sqlScript = fs.readFileSync(
      path.join(__dirname, '../database/001_create_reconciliation_orders.sql'),
      'utf8'
    )

    await sql.query(sqlScript)

    console.log('✅ Migration complete!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

migrate()
```

Chạy:

```bash
node scripts/migrate.js
```

### Verify Migration

Kiểm tra xem table đã được tạo chưa:

```sql
-- Check table exists
SELECT tablename FROM pg_tables WHERE tablename = 'reconciliation_orders';

-- Check sample data
SELECT COUNT(*) FROM reconciliation_orders;

-- Display records
SELECT * FROM reconciliation_orders ORDER BY date DESC;
```

**Expected result:** 10 sample records

---

## Step 4: Test API Locally

### Start Development Server

```bash
# Clear cache
rm -rf .next

# Install dependencies (if needed)
npm install

# Start dev server
npm run dev
```

### Test API Endpoints

**1. Basic Query (All Records)**

```bash
curl http://localhost:3000/api/reconciliation
```

**Expected Response:**
```json
{
  "records": [...10 records...],
  "summary": {
    "totalOrders": 10,
    "totalAmount": 43800000,
    "totalDistance": 0,
    "approvedOrders": 4,
    "pendingOrders": 3
  },
  "total": 10,
  "count": 10
}
```

**2. Filter by Date Range**

```bash
curl "http://localhost:3000/api/reconciliation?fromDate=2024-12-27&toDate=2024-12-29"
```

**3. Filter by Customer**

```bash
curl "http://localhost:3000/api/reconciliation?khachHang=ABC"
```

**4. Search Query**

```bash
curl "http://localhost:3000/api/reconciliation?searchQuery=Nha%20Trang"
```

**5. Filter by Status**

```bash
curl "http://localhost:3000/api/reconciliation?status=approved"
```

**6. Limit Results**

```bash
curl "http://localhost:3000/api/reconciliation?limit=5"
```

### Test in Browser

1. Mở http://localhost:3000/reconciliation
2. Kiểm tra:
   - ✅ Data table hiển thị 10 records
   - ✅ Summary bar hiển thị statistics
   - ✅ Filters hoạt động (date, customer, search)
   - ✅ Response time < 100ms (check Network tab)
   - ✅ No console errors

---

## Step 5: Deploy lên Vercel

### Auto Deploy (Recommended)

Vercel tự động deploy khi bạn push code lên GitHub:

```bash
# Code đã được push ở commit trước
# Vercel sẽ tự động detect và deploy
```

Check deployment:
1. Vào [Vercel Dashboard](https://vercel.com/dashboard)
2. Chọn project **nak-logistic-system**
3. Check **Deployments** tab
4. Click vào deployment mới nhất
5. Check **Runtime Logs**

### Manual Deploy

```bash
# Deploy qua CLI
vercel --prod
```

### Verify Production

Test production API:

```bash
curl https://your-project.vercel.app/api/reconciliation
```

---

## 🎉 Done!

Nếu mọi thứ hoạt động:

- ✅ API response time < 100ms (thay vì 10-60s)
- ✅ No timeout errors
- ✅ Data hiển thị đúng trong frontend
- ✅ Filters hoạt động
- ✅ Summary statistics chính xác

---

## 🐛 Troubleshooting

### Error: "Cannot find module '@vercel/postgres'"

```bash
npm install @vercel/postgres
npm run dev
```

### Error: "connect ECONNREFUSED"

- Check file `.env.local` có đúng connection strings không
- Copy lại connection strings từ Vercel Dashboard
- Restart dev server

### Error: "relation 'reconciliation_orders' does not exist"

- Migration script chưa chạy
- Chạy lại migration script (Step 3)

### Error: "permission denied"

- Check database user có đủ quyền không
- Vercel Postgres default user có đầy đủ permissions

### Frontend shows "Lỗi khi tải dữ liệu"

- Check browser console logs
- Check Network tab → API call có 200 OK không?
- Check Response data structure

### Data is empty

- Sample data chưa được insert
- Chạy lại migration script hoặc insert manual:

```sql
INSERT INTO reconciliation_orders (order_id, date, license_plate, route, customer, weight, cost, status)
VALUES
  ('TEST-001', CURRENT_DATE, '51A-99999', 'TP.HCM - Test', 'Test Company', 10.0, 1000000, 'approved');
```

---

## 📊 Performance Comparison

| Metric | Before (GAS) | After (Postgres) |
|--------|-------------|------------------|
| Avg Response Time | 10-60s | < 100ms |
| Timeout Errors | Frequent | None |
| Max Records | Limited | 1000+ |
| Concurrent Users | Limited | Unlimited |
| Data Freshness | Cached 60s | Real-time |

---

## 📚 Next Steps

1. **Add More Data**: Insert real data từ Google Sheets hoặc CSV
2. **Expand Schema**: Thêm các fields còn thiếu (driver, distance, route_details)
3. **Add Pagination**: Implement phân trang cho large datasets
4. **Add Authentication**: Secure API với authentication
5. **Add Audit Trail**: Track changes với audit log table
6. **Setup Backups**: Configure automatic database backups

---

## 📞 Support

Nếu gặp vấn đề:

1. Check [POSTGRES_MIGRATION.md](./POSTGRES_MIGRATION.md) - Full documentation
2. Check [Vercel Postgres Docs](https://vercel.com/docs/storage/vercel-postgres)
3. Check migration script: `database/001_create_reconciliation_orders.sql`
4. Check API code: `app/api/reconciliation/route.ts`

---

**Status:** 🚀 Ready to deploy!
