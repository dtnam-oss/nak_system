# 🚀 LỘ TRÌNH MIGRATION: NEON → POSTGRESQL + APPSHEET DIRECT CONNECTION

**Date:** 2026-01-22  
**Project:** NAK Logistics System  
**Goal:** Chuyển từ Webhook-based sang Direct Database Connection

---

## 📋 CHECKLIST TỔNG QUÁT

### PHASE 1: Database Migration (2-3 ngày)
- [ ] **1.1** Backup Neon database hiện tại
- [ ] **1.2** Setup PostgreSQL server (163.223.12.189:5432)
- [ ] **1.3** Test connection từ local
- [ ] **1.4** Export schema từ Neon
- [ ] **1.5** Import schema vào PostgreSQL mới
- [ ] **1.6** Export data từ Neon
- [ ] **1.7** Import data vào PostgreSQL mới
- [ ] **1.8** Verify data integrity (row counts, checksums)
- [ ] **1.9** Update Next.js `.env.local` với new POSTGRES_URL
- [ ] **1.10** Test Next.js app với database mới

---

### PHASE 2: Schema Normalization (2-3 ngày)
- [ ] **2.1** Review `migrate_to_normalized_schema.sql`
- [ ] **2.2** Run migration script on test database
- [ ] **2.3** Verify JSONB → normalized conversion
- [ ] **2.4** Check foreign keys working
- [ ] **2.5** Test view `reconciliation_orders_view`
- [ ] **2.6** Run migration on production
- [ ] **2.7** Create indexes (monitor performance)
- [ ] **2.8** Update API to use new tables (`chuyen_di`, `chi_tiet_chuyen_di`)
- [ ] **2.9** Test API endpoints (`/api/reconciliation-v2`)
- [ ] **2.10** Frontend testing với data mới

---

### PHASE 3: AppSheet Direct Connection (1-2 ngày)
- [ ] **3.1** Create `appsheet_user` in PostgreSQL
- [ ] **3.2** Grant appropriate permissions
- [ ] **3.3** Test connection từ AppSheet
- [ ] **3.4** Add `chuyen_di` table to AppSheet
- [ ] **3.5** Add `chi_tiet_chuyen_di` table to AppSheet
- [ ] **3.6** Configure column types & validations
- [ ] **3.7** Setup Master-Detail relationship
- [ ] **3.8** Create AppSheet views (Forms, Tables, Dashboard)
- [ ] **3.9** Test CRUD operations
  - [ ] Create new trip
  - [ ] Add trip details
  - [ ] Update trip
  - [ ] Delete trip (if allowed)
- [ ] **3.10** Disable old GAS Bots (hoặc để backup)

---

### PHASE 4: Dual Operation (1 tuần)
- [ ] **4.1** Run both systems in parallel
  - [ ] AppSheet → PostgreSQL (primary)
  - [ ] GAS → Webhook (backup)
- [ ] **4.2** Monitor data consistency
- [ ] **4.3** Compare performance metrics
- [ ] **4.4** Collect user feedback
- [ ] **4.5** Fix bugs nếu có

---

### PHASE 5: Deprecate Webhook (optional)
- [ ] **5.1** Confirm AppSheet direct connection stable
- [ ] **5.2** Disable GAS Bots
- [ ] **5.3** Remove webhook endpoint (hoặc để read-only)
- [ ] **5.4** Update documentation
- [ ] **5.5** Archive Google Sheets (backup only)

---

## 🛠️ CHI TIẾT TỪNG BƯỚC

### PHASE 1: Database Migration

#### Bước 1.1: Backup Neon Database
```bash
# Export entire database
pg_dump "$POSTGRES_URL" > backup_neon_$(date +%Y%m%d).sql

# Compress
gzip backup_neon_$(date +%Y%m%d).sql

# Upload to cloud storage (optional)
# aws s3 cp backup_neon_*.sql.gz s3://your-bucket/
```

**Verify:**
```bash
ls -lh backup_neon_*.sql.gz
# Should see file size > 0
```

#### Bước 1.2: Setup PostgreSQL Server

**Option A: Existing Server (163.223.12.189)**
```bash
# Test connection
psql "postgresql://postgres:123@163.223.12.189:5432/nak_vn" -c "SELECT version();"
```

**Option B: New Docker Container**
```bash
docker run -d \
  --name nak_postgres \
  -e POSTGRES_PASSWORD=123 \
  -e POSTGRES_DB=nak_vn \
  -p 5432:5432 \
  -v nak_data:/var/lib/postgresql/data \
  postgres:17

# Test
docker exec -it nak_postgres psql -U postgres -d nak_vn -c "SELECT 1;"
```

**Verify:**
- [ ] PostgreSQL version >= 15
- [ ] Can connect from Next.js server
- [ ] Sufficient disk space (check `df -h`)

#### Bước 1.3-1.7: Migration Script

```bash
# Run migration script
bash /Users/mac/Desktop/nak-logistic-system/scripts/migrate_database.sh
```

**Or manual:**
```bash
# Export schema
pg_dump "$NEON_URL" --schema-only > schema.sql

# Export data (per table)
pg_dump "$NEON_URL" --data-only \
  --table=reconciliation_orders \
  --table=fuel_transactions \
  --table=fuel_imports \
  --table=vehicles \
  --table=nhan_vien \
  > data.sql

# Import to new database
psql "postgresql://postgres:123@163.223.12.189:5432/nak_vn" < schema.sql
psql "postgresql://postgres:123@163.223.12.189:5432/nak_vn" < data.sql
```

#### Bước 1.8: Verify Data Integrity

```sql
-- Row counts (Old DB)
SELECT 
  'reconciliation_orders' as table_name, COUNT(*) as count 
FROM reconciliation_orders
UNION ALL
SELECT 'fuel_transactions', COUNT(*) FROM fuel_transactions
UNION ALL
SELECT 'fuel_imports', COUNT(*) FROM fuel_imports
UNION ALL
SELECT 'vehicles', COUNT(*) FROM vehicles
UNION ALL
SELECT 'nhan_vien', COUNT(*) FROM nhan_vien;

-- Run same query on New DB and compare
```

**Checklist:**
- [ ] Row counts match
- [ ] Sample data verification (10-20 records)
- [ ] Date formats correct
- [ ] JSONB fields intact
- [ ] Indexes created

#### Bước 1.9: Update Next.js Environment

```bash
# Update .env.local
vim .env.local

# Change:
POSTGRES_URL="postgresql://postgres:123@163.223.12.189:5432/nak_vn"
DB_MODE="new"  # or "both" for dual-write

# Restart dev server
npm run dev
```

#### Bước 1.10: Test Next.js App

**Test Endpoints:**
- [ ] `GET /api/reconciliation` → Returns data
- [ ] `GET /api/fuel/stats` → Returns metrics
- [ ] `GET /api/dashboard/telegram-stats` → Works
- [ ] `POST /api/webhook/appsheet` → Can insert data

**Frontend Testing:**
- [ ] `/dashboard` loads
- [ ] `/reconciliation` table renders
- [ ] `/fuel` page shows data
- [ ] Filters work correctly

---

### PHASE 2: Schema Normalization

#### Bước 2.1-2.2: Test Migration Script

```bash
# Create test database
createdb -h 163.223.12.189 -U postgres nak_vn_test

# Copy production data to test
pg_dump -h 163.223.12.189 -U postgres nak_vn | \
  psql -h 163.223.12.189 -U postgres nak_vn_test

# Run migration on test
psql -h 163.223.12.189 -U postgres nak_vn_test \
  < database/migrate_to_normalized_schema.sql
```

**Verify:**
```sql
-- Check new tables exist
\dt chuyen_di
\dt chi_tiet_chuyen_di

-- Check data migrated
SELECT COUNT(*) FROM chuyen_di;
SELECT COUNT(*) FROM chi_tiet_chuyen_di;

-- Check view works
SELECT * FROM reconciliation_orders_view LIMIT 5;
```

#### Bước 2.3-2.6: Production Migration

⚠️ **CAUTION: Backup first!**

```bash
# Backup before migration
pg_dump -h 163.223.12.189 -U postgres nak_vn > \
  backup_before_normalization_$(date +%Y%m%d_%H%M%S).sql

# Run migration
psql -h 163.223.12.189 -U postgres nak_vn \
  < database/migrate_to_normalized_schema.sql

# Verify
psql -h 163.223.12.189 -U postgres nak_vn \
  -c "SELECT COUNT(*) FROM chuyen_di;"
```

**Rollback Plan:**
```bash
# If migration fails, restore backup
psql -h 163.223.12.189 -U postgres nak_vn \
  < backup_before_normalization_*.sql
```

#### Bước 2.7-2.9: Update API & Test

```bash
# Copy new API route
cp app/api/reconciliation-v2/route.ts app/api/reconciliation/route.ts.backup
cp app/api/reconciliation-v2/route.ts app/api/reconciliation/route.ts

# Test API
curl "http://localhost:3000/api/reconciliation?limit=10" | jq .

# Deploy to Vercel
git add .
git commit -m "feat: migrate to normalized schema"
git push origin main
```

---

### PHASE 3: AppSheet Direct Connection

**Follow:** `APPSHEET_DIRECT_CONNECTION_GUIDE.md`

**Key Steps:**
1. Create `appsheet_user` in PostgreSQL
2. Grant permissions on tables
3. Configure AppSheet data source
4. Add tables to AppSheet
5. Create views (Form, Table, Dashboard)
6. Test CRUD operations

**Verification:**
- [ ] Can create trip in AppSheet
- [ ] Can add details to trip
- [ ] Can view in Next.js dashboard
- [ ] Data syncs instantly (no delay)

---

### PHASE 4: Dual Operation

**Duration:** 1-2 weeks

**Monitoring:**
- [ ] Database query performance
- [ ] API response times
- [ ] User error reports
- [ ] Data consistency checks

**Metrics to Track:**
```sql
-- Daily sync check
SELECT 
  DATE(created_at) as date,
  COUNT(*) as trips_created
FROM chuyen_di
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

### PHASE 5: Deprecation

**After 2-4 weeks of stable operation:**

1. Confirm 100% of data coming from AppSheet direct
2. Disable GAS Bots
3. Keep webhook endpoint as fallback (read-only)
4. Archive Google Sheets
5. Update documentation

---

## 🎯 SUCCESS CRITERIA

### Performance
- [ ] API response time < 500ms (p95)
- [ ] Database query time < 100ms
- [ ] AppSheet sync < 2 seconds

### Reliability
- [ ] Zero data loss during migration
- [ ] 99.9% uptime
- [ ] Successful rollback test

### User Experience
- [ ] No user complaints about latency
- [ ] Positive feedback from drivers/dispatchers
- [ ] Reduced errors compared to webhook

---

## 🚨 ROLLBACK PROCEDURES

### If Migration Fails (Phase 1)
```bash
# Restore from Neon backup
psql "postgresql://postgres:123@163.223.12.189:5432/nak_vn" \
  < backup_neon_*.sql

# Revert .env.local
POSTGRES_URL="<old-neon-url>"
DB_MODE="old"
```

### If Normalization Fails (Phase 2)
```bash
# Restore from pre-normalization backup
psql -h 163.223.12.189 -U postgres nak_vn \
  < backup_before_normalization_*.sql

# Revert API changes
git revert HEAD
git push origin main
```

### If AppSheet Connection Issues (Phase 3)
```
1. Disable AppSheet direct connection
2. Re-enable GAS Bots
3. Revert to webhook flow
4. Debug connection issues offline
```

---

## 📊 MONITORING DASHBOARD

### Database Metrics
```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';

-- Slow queries (> 1 second)
SELECT pid, query, state, now() - query_start as duration
FROM pg_stat_activity
WHERE state = 'active' AND now() - query_start > interval '1 second';

-- Table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
```

### API Health Check
```bash
# Check API endpoint
curl https://nak-system.vercel.app/api/health

# Check database connection
curl https://nak-system.vercel.app/api/db-health
```

---

## 📅 TIMELINE

| Phase | Duration | Start Date | End Date | Status |
|-------|----------|------------|----------|--------|
| Phase 1: Database Migration | 2-3 days | TBD | TBD | ⏳ Pending |
| Phase 2: Schema Normalization | 2-3 days | TBD | TBD | ⏳ Pending |
| Phase 3: AppSheet Direct | 1-2 days | TBD | TBD | ⏳ Pending |
| Phase 4: Dual Operation | 1-2 weeks | TBD | TBD | ⏳ Pending |
| Phase 5: Deprecation | 1 day | TBD | TBD | ⏳ Pending |
| **Total** | **~3 weeks** | | | |

---

## 👥 STAKEHOLDERS

- **Developer:** Senior Developer (thực hiện migration)
- **DBA:** PostgreSQL Admin (manage database)
- **QA:** Test team (verify data integrity)
- **Users:** Drivers, Dispatchers (feedback)
- **Manager:** Project Manager (approval)

---

## 📝 NOTES

- Luôn backup trước khi migration
- Test trên test database trước khi chạy production
- Monitor closely trong 2 tuần đầu
- Document tất cả issues và resolutions
- Keep communication với users

---

## ✅ FINAL CHECKLIST

Trước khi đánh dấu migration hoàn thành:

- [ ] All data migrated successfully
- [ ] All APIs working
- [ ] Frontend displaying correct data
- [ ] AppSheet connection stable
- [ ] Performance metrics acceptable
- [ ] Users trained on new system
- [ ] Documentation updated
- [ ] Backup strategy in place
- [ ] Monitoring dashboard setup
- [ ] Rollback tested and ready

---

**Last Updated:** 2026-01-22  
**Version:** 1.0
