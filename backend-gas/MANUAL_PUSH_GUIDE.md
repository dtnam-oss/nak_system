# Manual Push Guide - Copy-Paste Files to Google Apps Script

Vì clasp gặp lỗi authentication, hãy làm theo hướng dẫn này để push code manually.

## 🎯 Files cần update

### ✅ File 1: ReconciliationService.gs (NEW)

**Action:** Tạo file mới trong GAS Editor

**Steps:**
1. Mở GAS Editor: https://script.google.com/home/projects/1TTS7pJuKKBuh5w7kAHr4xrGzfUwyN9Bw2IT1xd0DwskRC4Uhjd0EaLLL/edit
2. Click **+** → **Script**
3. Đặt tên: `ReconciliationService`
4. Copy toàn bộ nội dung từ file: `backend-gas/gas/ReconciliationService.gs`
5. Paste vào GAS Editor
6. Click **Save** (Ctrl+S)

**File path:** `backend-gas/gas/ReconciliationService.gs`

### ✅ File 2: Code.gs (UPDATED)

**Action:** Update file hiện có

**Steps:**
1. Mở file `Code.gs` trong GAS Editor
2. Copy toàn bộ nội dung từ file: `backend-gas/gas/Code.gs`
3. Replace toàn bộ code hiện tại
4. Click **Save** (Ctrl+S)

**File path:** `backend-gas/gas/Code.gs`

**Key changes:**
- Thêm route `getReconciliationData` (line 36-40)
- Thêm `getReconciliationData` vào availableActions (line 51)

---

## 📋 Verification Checklist

Sau khi copy-paste, kiểm tra:

### In GAS Editor:
- [ ] File `ReconciliationService.gs` xuất hiện trong file list (bên trái)
- [ ] Code.gs có function `getReconciliationData` route
- [ ] Không có syntax errors (check bottom status bar)

### Test API:
- [ ] Click Run → Select function `doGet`
- [ ] Check Execution log - không có errors

---

## 🚀 Deploy New Version

**Steps:**
1. Click **Deploy** → **Manage deployments**
2. Click ✏️ **Edit** icon trên deployment hiện tại
3. Version: Select **New version**
4. Description: `Add ReconciliationService for reconciliation page`
5. Click **Deploy**
6. Click **Done**

**Important:** Copy deployment URL nếu chưa có!

---

## 🧪 Test Deployment

### Test 1: Health Check
Open in browser:
```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

Expected response:
```json
{
  "success": true,
  "availableActions": [
    "getDashboardReport",
    "getDashboardReportWithFilters",
    "getReconciliationData"
  ]
}
```

### Test 2: Reconciliation Endpoint
Open in browser:
```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=getReconciliationData
```

Expected response:
```json
{
  "success": true,
  "data": {
    "records": [...],
    "summary": {
      "totalOrders": 150,
      "totalAmount": 500000000,
      ...
    },
    "total": 150
  }
}
```

---

## ❓ Troubleshooting

### Error: "getReconciliationData is not defined"
→ ReconciliationService.gs chưa được save hoặc chưa deploy version mới

### Error: "Sheet data_chuyen_di not found"
→ Check MAIN_SPREADSHEET có sheet tên `data_chuyen_di`

### Error: Blank response
→ Check Execution log trong GAS Editor
→ View → Execution log

---

## 📝 Next Step

After manual push:
1. Update `.env.local` với deployment URL (if needed)
2. Restart dev server: `npm run dev`
3. Test frontend: http://localhost:3000/reconciliation

---

## 🔄 Alternative: Fix Clasp Authentication (Optional)

Nếu muốn fix clasp cho lần sau:

### Method 1: Re-authenticate
```bash
rm ~/.clasprc.json
clasp login
```

### Method 2: Enable Apps Script API
1. Go to: https://script.google.com/home/usersettings
2. Enable **Google Apps Script API**
3. Try `clasp push` again

### Method 3: Use different authentication
```bash
clasp login --no-localhost
# Follow the URL and paste code
```

---

**Time required:** ~3 minutes
**Difficulty:** Easy (copy-paste)
