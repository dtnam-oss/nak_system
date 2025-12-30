# 🎯 QUICK REFERENCE - Status Mapping

## Status Values trong Database

| DB Value | Vietnamese Display | English | Notes |
|----------|-------------------|---------|-------|
| `approved` | Đã duyệt | Approved | ✅ Counted in "Đã duyệt" KPI |
| `pending` | Chờ duyệt | Pending | ⏳ Waiting for approval |
| `rejected` | Từ chối | Rejected | ❌ Rejected orders |

---

## Input từ AppSheet → DB Mapping

### ✅ Maps to `approved`:
- "Kết thúc"
- "Hoàn tất" 
- "completed"
- "finish"
- "approved"
- "đã duyệt"

### ⏳ Maps to `pending`:
- "Mới"
- "New"
- "khởi tạo"
- "" (empty)
- null
- Any unrecognized value (fallback)

### ❌ Maps to `rejected`:
- "Hủy"
- "Cancel"
- "rejected"
- "từ chối"

---

## Code Examples

### Check status in SQL:
```sql
-- Get approved orders
SELECT * FROM reconciliation_orders WHERE status = 'approved';

-- Count by status
SELECT status, COUNT(*) FROM reconciliation_orders GROUP BY status;
```

### Check status in Frontend:
```typescript
// In API response
record.trangThai === 'Đã duyệt'  // Display value

// In filtering
WHERE status = 'approved'  // DB value
```

---

## Dashboard KPIs

```typescript
// Calculate "Đã duyệt" count
approvedOrders = records.filter(r => r.trangThai === 'Đã duyệt').length

// In SQL
SELECT COUNT(*) FROM reconciliation_orders WHERE status = 'approved'
```

---

## Field Mapping Reference

| AppSheet Field | Database Column | Type | Default | Required |
|---------------|----------------|------|---------|----------|
| maChuyenDi | order_id | VARCHAR(50) | - | ✅ |
| tongDoanhThu | cost | NUMERIC(15,0) | 0 | ❌ |
| tongQuangDuong | total_distance | NUMERIC(10,2) | 0 | ❌ |
| trangThai | status | VARCHAR(20) | pending | ✅ |
| tenKhachHang | customer | VARCHAR(100) | null | ❌ |
| tenTaiXe | driver_name | VARCHAR(100) | null | ❌ |
| donViVanChuyen | provider | VARCHAR(50) | OTHER | ❌ |
| ngayTao | date | DATE | today | ✅ |
| loaiChuyen | trip_type | VARCHAR(50) | null | ❌ |
| loaiTuyen | route_type | VARCHAR(50) | null | ❌ |
| tenTuyen | route_name | VARCHAR(255) | auto | ❌ |

---

## Common Issues & Solutions

### ❌ Issue: KPI "Đã duyệt" shows 0
**Cause:** Status not normalized to "approved"  
**Solution:** Check webhook logs, verify status mapping

### ❌ Issue: Doanh thu shows 0
**Cause:** `tongDoanhThu` not mapped to `cost`  
**Solution:** Check normalizePayload() function

### ❌ Issue: Status không được nhận diện
**Cause:** Vietnamese status not in mapping list  
**Solution:** Add to normalizeStatus() function

---

## Testing Commands

```bash
# Test locally
API_URL=http://localhost:3000/api/webhook/appsheet \
APPSHEET_SECRET_KEY=your-key \
./scripts/test-webhook-v2.sh

# Test production
API_URL=https://your-domain.vercel.app/api/webhook/appsheet \
APPSHEET_SECRET_KEY=your-prod-key \
./scripts/test-webhook-v2.sh
```

---

## Useful SQL Queries

```sql
-- Check data quality
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN cost > 0 THEN 1 END) as has_cost,
  COUNT(CASE WHEN total_distance > 0 THEN 1 END) as has_distance,
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved
FROM reconciliation_orders;

-- Find records with issues
SELECT order_id, cost, total_distance, status
FROM reconciliation_orders
WHERE cost = 0 OR total_distance = 0;

-- Check status distribution
SELECT status, COUNT(*) as count
FROM reconciliation_orders
GROUP BY status
ORDER BY count DESC;
```
