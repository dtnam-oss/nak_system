# 🔧 FIX: Reconciliation API - Summary & Limit Issues

**Commit:** `ffc6d57`  
**Date:** December 30, 2025  
**File:** `app/api/reconciliation/route.ts`

---

## 🐛 Vấn đề đã phát hiện

### 1. **Chỉ hiển thị 100 records**
```typescript
// OLD CODE
const limit = Math.min(Math.max(1, parseInt(limitParam || '100')), 1000)
```
- Default limit = 100 → Chỉ lấy 100 records đầu tiên
- Max limit = 1000 → Không đủ cho production data

### 2. **KPI Summary tính SAI**
```typescript
// OLD CODE - WRONG!
const summary = {
  totalOrders: records.length, // Only from limited records!
  totalAmount: records.reduce((sum, record) => sum + record.tongDoanhThu, 0),
  totalDistance: records.reduce((sum, record) => sum + record.tongQuangDuong, 0),
  approvedOrders: records.filter((record) => record.trangThai === 'Đã duyệt').length,
  pendingOrders: records.filter((record) => record.trangThai === 'Chờ duyệt').length,
}
```

**Vấn đề:** Tính summary từ `records` đã bị giới hạn bởi LIMIT
- Nếu có 1000 records trong DB nhưng limit=100
- Summary chỉ tính từ 100 records đầu → SAI!

### 3. **Kết quả hiển thị sai trên UI**

From screenshot:
- ❌ Tổng quãng đường: **0 km** (sai!)
- ❌ Đã duyệt: **0** (sai!)
- ⚠️ Chỉ hiển thị 100 records

---

## ✅ Giải pháp đã áp dụng

### 1. **Tăng limit**
```typescript
// NEW CODE
const limit = Math.min(
  Math.max(1, parseInt(limitParam || '500')),
  5000 // Increase max to 5000
)
```
- Default: 100 → **500** records
- Max: 1000 → **5000** records
- Đủ cho hầu hết use cases

### 2. **Tính summary từ TOÀN BỘ data**
```typescript
// NEW CODE - CORRECT!
const summaryQuery = `
  SELECT
    COUNT(*) as total_orders,
    COALESCE(SUM(cost), 0) as total_amount,
    COALESCE(SUM(total_distance), 0) as total_distance,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_orders,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders
  FROM reconciliation_orders
  ${whereClause}
`

const summaryResult = await sql.query(summaryQuery, params.slice(0, -1))
```

**Ưu điểm:**
- ✅ Tính summary từ **TẤT CẢ** records matching filters
- ✅ Không bị ảnh hưởng bởi LIMIT
- ✅ Sử dụng SQL aggregation (nhanh hơn)
- ✅ Handle NULL values với COALESCE

### 3. **Phân biệt total vs count**
```typescript
return NextResponse.json({
  records,
  summary,
  total: summary.totalOrders, // Total matching records (ALL)
  count: records.length,      // Records in current page (LIMITED)
})
```

---

## 📊 So sánh Before/After

### Before (Sai):
```
Scenario: Database có 1000 records, limit=100

Summary Calculation:
- totalOrders: 100 (từ records.length) ❌
- totalAmount: Sum of 100 records ❌
- totalDistance: Sum of 100 records ❌
- approvedOrders: Count in 100 records ❌

Result trên UI:
- Tổng đơn hàng: 100 (sai! thực tế là 1000)
- Tổng tiền: X (sai! thiếu 900 records)
- Đã duyệt: Y (sai! chỉ đếm 100 records đầu)
```

### After (Đúng):
```
Scenario: Database có 1000 records, limit=100

Summary Calculation (Separate Query):
- totalOrders: 1000 (COUNT(*) on all records) ✅
- totalAmount: Sum of ALL 1000 records ✅
- totalDistance: Sum of ALL 1000 records ✅
- approvedOrders: Count in ALL 1000 records ✅

Result trên UI:
- Tổng đơn hàng: 1000 ✅
- Tổng tiền: Correct sum ✅
- Đã duyệt: Correct count ✅

Display:
- Shows first 500 records (limit)
- But KPIs show data from ALL 1000 records
```

---

## 🧪 Testing

### Query để verify data:

```sql
-- Run this in Vercel Data or pgAdmin
SELECT
  COUNT(*) as total_orders,
  COALESCE(SUM(cost), 0) as total_amount,
  COALESCE(SUM(total_distance), 0) as total_distance,
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_orders,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders
FROM reconciliation_orders;
```

### Expected Results:

**Nếu total_distance vẫn = 0:**
→ Nghĩa là dữ liệu trong DB chưa có `total_distance`
→ Cần chạy webhook để populate data mới

**Nếu approved_orders = 0:**
→ Nghĩa là không có records với `status = 'approved'`
→ Có thể status đang là "completed" hoặc giá trị khác
→ Cần update data hoặc verify status mapping

---

## 🔍 Debug Steps

### 1. Check Database Data Quality
```bash
# Run debug script
psql $DATABASE_URL -f scripts/debug-reconciliation-data.sql
```

### 2. Check API Response
```bash
# Call API
curl https://your-domain.vercel.app/api/reconciliation | jq '.summary'

# Expected output:
{
  "totalOrders": 1234,
  "totalAmount": 500000000,
  "totalDistance": 15000,
  "approvedOrders": 900,
  "pendingOrders": 334
}
```

### 3. Check Vercel Logs
```bash
vercel logs [deployment-url] --follow
```

Look for:
```
📊 [Postgres API] Summary calculated: { totalOrders: X, totalAmount: Y, ... }
```

---

## ⚠️ Potential Issues

### Issue 1: Total Distance Still 0

**Cause:** Database column `total_distance` might be NULL or 0

**Solution:**
1. Check với SQL query:
   ```sql
   SELECT order_id, total_distance 
   FROM reconciliation_orders 
   WHERE total_distance > 0 
   LIMIT 10;
   ```

2. Nếu tất cả = 0 → Dữ liệu chưa được populate
3. Trigger webhook từ AppSheet để insert/update data mới
4. Verify webhook có map `tongQuangDuong` → `total_distance`

### Issue 2: Approved Orders = 0

**Cause:** Status values không phải "approved"

**Solution:**
1. Check status distribution:
   ```sql
   SELECT status, COUNT(*) 
   FROM reconciliation_orders 
   GROUP BY status;
   ```

2. Nếu thấy "completed" thay vì "approved":
   - Webhook đã chạy chưa được update
   - Cần update lại status mapping
   - Hoặc update data trong DB

### Issue 3: Performance

**Cause:** Query quá chậm với nhiều data

**Solution:**
1. Summary query đã được optimize với indexes
2. Nếu vẫn chậm, consider:
   - Materialize view cho summary
   - Cache summary results
   - Add more indexes

---

## 📝 Next Steps

### 1. Verify Fix (5 mins)
- [ ] Open reconciliation page
- [ ] Check KPI values
- [ ] Verify "Đã duyệt" count > 0
- [ ] Check "Tổng quãng đường" > 0
- [ ] Verify can load > 100 records

### 2. If Distance Still 0 (10 mins)
- [ ] Run debug SQL script
- [ ] Check if `total_distance` column has data
- [ ] If all zero, trigger webhook from AppSheet
- [ ] Verify webhook maps `tongQuangDuong` correctly

### 3. If Approved Count Still 0 (5 mins)
- [ ] Check status distribution in DB
- [ ] Verify status values = "approved"
- [ ] If "completed", update webhook mapping
- [ ] Or update existing records:
   ```sql
   UPDATE reconciliation_orders 
   SET status = 'approved' 
   WHERE status = 'completed';
   ```

### 4. Monitor (Ongoing)
- [ ] Check Vercel logs for summary query
- [ ] Verify performance acceptable
- [ ] Monitor for any errors

---

## 📚 Files Changed

```
✏️ MODIFIED:
   app/api/reconciliation/route.ts
   - Increase default limit: 100 → 500
   - Add separate summary query
   - Fix total vs count distinction
   - Improve logging

📄 NEW:
   scripts/debug-reconciliation-data.sql
   - Debug queries for data quality
```

---

## ✅ Success Criteria

After this fix:
- ✅ KPI "Tổng đơn hàng" shows ALL records (not limited)
- ✅ KPI "Tổng tiền" accurate from ALL records
- ✅ KPI "Tổng quãng đường" accurate (if data exists)
- ✅ KPI "Đã duyệt" counts approved status correctly
- ✅ Can load up to 5000 records per page
- ✅ Performance acceptable (<2s response time)

---

**Status:** ✅ Deployed  
**Commit:** `ffc6d57`  
**Requires:** Database verification for data quality
