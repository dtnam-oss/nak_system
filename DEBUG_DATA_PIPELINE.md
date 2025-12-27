# Debug Guide: Tracing data_json Through Data Pipeline

## 🎯 Mục Đích

Tài liệu này hướng dẫn cách debug data flow của `data_json` field từ API response đến TripDetailsDialog component để xác định chính xác nơi dữ liệu bị mất.

---

## 🔍 Strategic Trace Logs Đã Thêm

### STEP 0: API Response Layer
**File:** `hooks/use-reconciliation-data.ts` (Lines 58-73)

**Logs khi fetch data thành công:**
```typescript
console.log('🔍 [STEP 0] Raw API Response received')
console.log('🔍 [STEP 0] Total records:', data.records?.length || 0)
console.log('🔍 [STEP 0] First record:', firstRecord)
console.log('🔍 [STEP 0] First record keys:', Object.keys(firstRecord))
console.log('🔍 [STEP 0] First record has data_json:', 'data_json' in firstRecord)
console.log('🔍 [STEP 0] First record data_json value:', firstRecord.data_json)
console.log('🔍 [STEP 0] First record data_json type:', typeof firstRecord.data_json)
console.log('🔍 [STEP 0] First record data_json length:', firstRecord.data_json?.length || 0)
```

**Mục đích:** Kiểm tra xem API có trả về `data_json` không

---

### STEP 1: Table Row Click Handler
**File:** `components/reconciliation/columns.tsx` (Lines 173-179)

**Logs khi click nút "Chi tiết":**
```typescript
console.log('🔍 [STEP 1] Clicked Row Data:', record)
console.log('🔍 [STEP 1] Has data_json field:', 'data_json' in record)
console.log('🔍 [STEP 1] data_json value:', record.data_json)
console.log('🔍 [STEP 1] data_json type:', typeof record.data_json)
console.log('🔍 [STEP 1] data_json length:', record.data_json?.length || 0)
console.log('🔍 [STEP 1] All record keys:', Object.keys(record))
```

**Mục đích:** Xác minh data có nguyên vẹn khi được pass vào onClick handler

---

### STEP 2: TripDetailsDialog Component
**File:** `components/reconciliation/TripDetailsDialog.tsx` (Lines 27-32, 40-48)

**Logs khi component nhận props:**
```typescript
console.log('🔍 [STEP 2] TripDetailsDialog received record:', record)
console.log('🔍 [STEP 2] Has data_json field:', record ? 'data_json' in record : 'NO RECORD')
console.log('🔍 [STEP 2] data_json value:', record?.data_json)
console.log('🔍 [STEP 2] data_json type:', typeof record?.data_json)
console.log('🔍 [STEP 2] Record keys:', record ? Object.keys(record) : 'NO RECORD')
```

**Logs trong useMemo guards:**
```typescript
console.log('🔍 [STEP 2] Guard: No record provided')
console.warn('🔍 [STEP 2] Guard: No data_json field for record:', record.maChuyenDi)
console.warn('🔍 [STEP 2] Available fields:', Object.keys(record))
```

**Mục đích:** Kiểm tra data nhận được từ parent component

---

## 📊 How to Use Debug Logs

### 1. Open Browser Developer Tools
```
Chrome/Edge: F12 hoặc Ctrl+Shift+I
Firefox: F12 hoặc Ctrl+Shift+K
Safari: Cmd+Option+I
```

### 2. Navigate to Console Tab
- Clear console: Click 🚫 icon hoặc Ctrl+L
- Enable "Preserve log" để giữ logs khi reload

### 3. Trigger Debug Logs
1. Load trang Reconciliation: `http://localhost:3000/reconciliation`
2. Đợi data load xong
3. Click nút "Chi tiết" trên bất kỳ row nào

### 4. Analyze Log Output

**Expected Flow (Success Case):**
```
🔍 [STEP 0] Raw API Response received
🔍 [STEP 0] Total records: 50
🔍 [STEP 0] First record: {id: "NAK123", maChuyenDi: "NAK123", ..., data_json: "{...}"}
🔍 [STEP 0] First record keys: ["id", "maChuyenDi", ..., "data_json"]
🔍 [STEP 0] First record has data_json: true
🔍 [STEP 0] First record data_json value: {"thongTinChuyenDi":{...},...}
🔍 [STEP 0] First record data_json type: string
🔍 [STEP 0] First record data_json length: 1523

[User clicks "Chi tiết" button]

🔍 [STEP 1] Clicked Row Data: {id: "NAK123", ..., data_json: "{...}"}
🔍 [STEP 1] Has data_json field: true
🔍 [STEP 1] data_json value: {"thongTinChuyenDi":{...},...}
🔍 [STEP 1] data_json type: string
🔍 [STEP 1] data_json length: 1523
🔍 [STEP 1] All record keys: ["id", "maChuyenDi", ..., "data_json"]

🔍 [STEP 2] TripDetailsDialog received record: {id: "NAK123", ..., data_json: "{...}"}
🔍 [STEP 2] Has data_json field: true
🔍 [STEP 2] data_json value: {"thongTinChuyenDi":{...},...}
🔍 [STEP 2] data_json type: string
🔍 [STEP 2] Record keys: ["id", "maChuyenDi", ..., "data_json"]
```

---

## 🐛 Troubleshooting Decision Tree

### Scenario A: STEP 0 shows `has data_json: false`
**Problem:** Backend không trả về `data_json` field

**Actions:**
1. Kiểm tra Google Apps Script đã deploy chưa
2. Check Apps Script Logs:
   ```javascript
   // Trong Apps Script Editor
   View > Logs (hoặc Ctrl+Enter)
   ```
3. Tìm log:
   ```
   📋 Sheet Headers Found: [...]
   🗺️ Column Index Map: {...}
   ```
4. Verify `data_json` có trong column map không
5. Nếu không có → Deploy lại ReconciliationService.js

**Fix:** Deploy updated backend code

---

### Scenario B: STEP 0 shows `data_json: ""` (empty string)
**Problem:** Backend tìm thấy column nhưng cell rỗng

**Actions:**
1. Mở Google Sheets
2. Kiểm tra cột `data_json` (column L - index 11)
3. Check dữ liệu có tồn tại không
4. Nếu rỗng → Chạy lại CreateDataBase.js để generate JSON

**Fix:** Regenerate data_json using CreateDataBase script

---

### Scenario C: STEP 0 shows `data_json: "{...}"` but STEP 1 shows `has data_json: false`
**Problem:** Data bị mất giữa API response và Table rendering

**Actions:**
1. Check TypeScript interface `ReconciliationRecord`
2. Verify `data_json` field có trong type definition không
3. Check TanStack Table column definitions
4. Inspect React DevTools > Components > DataTable > props

**Potential Causes:**
- TypeScript interface thiếu `data_json` field
- Data transformation trong DataTable component
- React Query cache bị corrupt

**Fix:**
```typescript
// types/reconciliation.ts
export interface ReconciliationRecord {
  // ... existing fields
  data_json?: string  // ← Make sure this exists
}
```

---

### Scenario D: STEP 1 shows `data_json: "{...}"` but STEP 2 shows `NO RECORD` or missing field
**Problem:** Data bị mất khi pass từ onClick handler sang Dialog component

**Actions:**
1. Check `handleViewDetails` function trong data-table.tsx
2. Verify `setSelectedRecord(record)` được gọi đúng
3. Check React state update
4. Inspect Dialog props trong React DevTools

**Potential Causes:**
- State update timing issue
- Record object bị clone không đầy đủ
- Dialog re-render issue

**Fix:**
```typescript
// data-table.tsx
const handleViewDetails = (record: ReconciliationRecord) => {
  console.log('Passing record to dialog:', record)  // Debug log
  setSelectedRecord(record)
  setIsDialogOpen(true)
}
```

---

### Scenario E: All steps show valid `data_json` but parsing fails
**Problem:** JSON structure không đúng format

**Actions:**
1. Copy raw `data_json` string từ console
2. Paste vào JSON validator (jsonlint.com)
3. Check structure:
   ```json
   {
     "thongTinChuyenDi": { "soXe": "..." },
     "chiTietLoTrinh": [...]
   }
   ```
4. Verify không có `.data` wrapper

**Fix:** Check CreateDataBase.js JSON generation logic

---

## 🔧 Common Fixes Summary

### Fix 1: Missing TypeScript Type Definition
```typescript
// types/reconciliation.ts
export interface ReconciliationRecord {
  id: string
  maChuyenDi: string
  ngayTao: string
  tenKhachHang: string
  loaiChuyen: string
  loaiTuyen: string
  tenTuyen: string
  tenTaiXe: string
  donViVanChuyen: string
  trangThai: string
  tongQuangDuong: number
  tongDoanhThu: number
  soXe?: string
  chiTietLoTrinh?: Array<any>
  data_json?: string  // ← ADD THIS IF MISSING
}
```

### Fix 2: Backend Not Deployed
```bash
# Steps to redeploy Google Apps Script
1. Open Apps Script Editor
2. Copy updated ReconciliationService.js
3. Deploy > New deployment
4. Type: Web app
5. Click Deploy
6. Update .env.local with new URL (if URL changed)
```

### Fix 3: Cache Issue
```typescript
// In browser console
localStorage.clear()
sessionStorage.clear()
// Then hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
```

### Fix 4: React Query Cache
```typescript
// In browser console (React Query Devtools)
// Click "Invalidate All" button
// Or programmatically:
queryClient.invalidateQueries({ queryKey: ['reconciliation'] })
```

---

## 📋 Debug Checklist

Run through this checklist step by step:

- [ ] **STEP 0: API Response**
  - [ ] `🔍 [STEP 0]` logs appear in console
  - [ ] `has data_json: true`
  - [ ] `data_json type: string`
  - [ ] `data_json length > 0`

- [ ] **STEP 1: Table Row Click**
  - [ ] `🔍 [STEP 1]` logs appear when clicking "Chi tiết"
  - [ ] `Has data_json field: true`
  - [ ] `data_json value` is not empty
  - [ ] `All record keys` includes "data_json"

- [ ] **STEP 2: Dialog Component**
  - [ ] `🔍 [STEP 2]` logs appear when dialog opens
  - [ ] `Has data_json field: true` (not "NO RECORD")
  - [ ] `data_json value` matches STEP 1
  - [ ] No guard warnings about missing data_json

- [ ] **Final Verification**
  - [ ] Dialog displays "Thông tin chung" section
  - [ ] Dialog displays "Chi tiết lộ trình" table/cards
  - [ ] No red error banner in dialog
  - [ ] Browser console has no errors

---

## 🎯 Success Criteria

Debug logs are successful when:

✅ All 3 steps (STEP 0, 1, 2) show `data_json` field present
✅ `data_json` value is consistent across all steps
✅ `data_json` type is `string` (not `undefined` or `object`)
✅ `data_json` length > 0 (not empty string)
✅ TripDetailsDialog displays route details without errors

---

## 🧹 Cleanup After Debug

Once issue is fixed, remove debug logs:

### Option 1: Comment Out Logs (Recommended)
```typescript
// 🔍 Debug logs - commented for production
// console.log('🔍 [STEP X] ...')
```

### Option 2: Conditional Logging
```typescript
const DEBUG = process.env.NODE_ENV === 'development'

if (DEBUG) {
  console.log('🔍 [STEP X] ...')
}
```

### Option 3: Remove Completely
- Delete all lines starting with `console.log('🔍`
- Delete all lines starting with `console.warn('🔍`

---

## 📞 Support

Nếu sau khi chạy qua tất cả debug steps mà vẫn không tìm ra vấn đề:

1. Export console logs:
   ```
   Right-click in Console > Save as... > console_logs.txt
   ```

2. Take screenshots of:
   - All STEP 0, 1, 2 logs
   - Network tab showing API response
   - React DevTools showing component props

3. Check backend Apps Script logs:
   ```javascript
   // In Apps Script Editor
   View > Executions
   // Look for errors in recent executions
   ```

---

**Created:** December 26, 2024
**Purpose:** Debug missing data_json field in frontend
**Status:** ✅ **ACTIVE DEBUG SESSION**
