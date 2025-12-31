# Verify Revenue & Cost Mapping

## ✅ Kiểm tra đã hoàn tất

### 1. Google Apps Script (Code.gs)
**Function: `calculateTripCost()`**
```javascript
// Line 730-735
payload.tongDoanhThu = totalRevenue;  // ✅ Doanh thu từ bảng giá
payload.tongChiPhi = totalCost;        // ✅ Chi phí theo provider
```

**Payload gửi lên Backend:**
```json
{
  "tongDoanhThu": 1076434,  // Revenue
  "tongChiPhi": 0,          // Cost
  "maChuyenDi": "...",
  ...
}
```

---

### 2. Backend Webhook (app/api/webhook/appsheet/route.ts)

**Function: `normalizePayload()` - Line 252-260**
```typescript
// CRITICAL: Map tongDoanhThu -> revenue (doanh thu)
const revenue = parseNumber(payload.tongDoanhThu);
console.log(`[NORMALIZE] tongDoanhThu: ${payload.tongDoanhThu} -> revenue: ${revenue}`);

// CRITICAL: Map tongChiPhi -> cost (chi phí)
const cost = parseNumber(payload.tongChiPhi);
console.log(`[NORMALIZE] tongChiPhi: ${payload.tongChiPhi} -> cost: ${cost}`);
```

**INSERT/UPDATE Query - Line 408-450**
```sql
INSERT INTO reconciliation_orders (
  ...
  revenue,  -- ✅ Nhận từ tongDoanhThu
  cost,     -- ✅ Nhận từ tongChiPhi
  ...
) VALUES (
  ...
  ${normalized.revenue},  -- Từ payload.tongDoanhThu
  ${normalized.cost},     -- Từ payload.tongChiPhi
  ...
)
ON CONFLICT (order_id) DO UPDATE SET
  revenue = EXCLUDED.revenue,  -- ✅ Update revenue
  cost = EXCLUDED.cost,        -- ✅ Update cost
  ...
```

---

### 3. Frontend API (app/api/reconciliation/route.ts)

**Query - Line 149-160**
```typescript
SELECT
  ...
  revenue,  -- ✅ Lấy từ DB
  cost,     -- ✅ Lấy từ DB
  ...
FROM reconciliation_orders
```

**Mapping to Frontend - Line 220-221**
```typescript
tongDoanhThu: parseFloat(String(row.revenue || 0)),  // ✅ revenue → tongDoanhThu
tongChiPhi: parseFloat(String(row.cost || 0)),       // ✅ cost → tongChiPhi
```

---

### 4. Frontend Display (components/reconciliation/TripDetailsDialog.tsx)

**Modal Display - Line 125-141**
```tsx
<div>
  <p className="text-xs text-muted-foreground">Doanh thu</p>
  <p className="text-sm font-semibold text-success">
    {formatCurrency(record.tongDoanhThu || 0)}  {/* ✅ From revenue */}
  </p>
</div>
<div>
  <p className="text-xs text-muted-foreground">Chi phí</p>
  <p className="text-sm font-semibold text-destructive">
    {formatCurrency(record.tongChiPhi || 0)}  {/* ✅ From cost */}
  </p>
</div>
<div>
  <p className="text-xs text-muted-foreground">Lợi nhuận</p>
  <p className="text-sm font-bold text-primary">
    {formatCurrency((record.tongDoanhThu || 0) - (record.tongChiPhi || 0))}
  </p>
</div>
```

---

## 📊 Data Flow Summary

```
[Google Sheets]
    ↓
[GAS Code.gs] calculateTripCost()
    ↓ payload.tongDoanhThu (revenue)
    ↓ payload.tongChiPhi (cost)
    ↓
[Backend Webhook] normalizePayload()
    ↓ normalized.revenue ← tongDoanhThu
    ↓ normalized.cost ← tongChiPhi
    ↓
[Postgres DB]
    ↓ revenue column
    ↓ cost column
    ↓
[Backend API] GET /api/reconciliation
    ↓ row.revenue → tongDoanhThu
    ↓ row.cost → tongChiPhi
    ↓
[Frontend React]
    ↓ Display in Modal
    └─ Doanh thu: {tongDoanhThu}
    └─ Chi phí: {tongChiPhi}
    └─ Lợi nhuận: {tongDoanhThu - tongChiPhi}
```

---

## ✅ Verification Status

| Component | Field | Mapping | Status |
|-----------|-------|---------|--------|
| GAS | `tongDoanhThu` | → revenue | ✅ Correct |
| GAS | `tongChiPhi` | → cost | ✅ Correct |
| Webhook | `revenue` | ← tongDoanhThu | ✅ Correct |
| Webhook | `cost` | ← tongChiPhi | ✅ Correct |
| Database | `revenue` | Column exists | ✅ Correct |
| Database | `cost` | Column exists | ✅ Correct |
| API | `revenue` | → tongDoanhThu | ✅ Correct |
| API | `cost` | → tongChiPhi | ✅ Correct |
| Frontend | Display | Modal shows both | ✅ Correct |

---

## 🔍 Debug Commands

### Check Database Values
```sql
SELECT 
  order_id,
  revenue,
  cost,
  revenue - cost as profit
FROM reconciliation_orders
ORDER BY updated_at DESC
LIMIT 10;
```

### Check Webhook Logs (Vercel)
Look for these log lines:
```
[NORMALIZE] tongDoanhThu: 1076434 -> revenue: 1076434
[NORMALIZE] tongChiPhi: 0 -> cost: 0
```

### Check Frontend Console
```javascript
console.log('Record:', record.tongDoanhThu, record.tongChiPhi);
```

---

## ✅ Conclusion

**All mappings are CORRECT:**
1. ✅ GAS sends `tongDoanhThu` and `tongChiPhi`
2. ✅ Backend maps to `revenue` and `cost` columns
3. ✅ API reads from `revenue` and `cost` columns
4. ✅ Frontend displays as Doanh thu and Chi phí

**No changes needed!**
