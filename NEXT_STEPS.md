# Next Steps - Các bước tiếp theo

## ✅ Đã hoàn thành

### Frontend Integration
- ✅ Tạo types cho reconciliation data
- ✅ Tạo service layer (gas-api.ts)
- ✅ Tạo API route /api/reconciliation
- ✅ Tạo React hook useReconciliationData
- ✅ Cập nhật reconciliation page với real data
- ✅ Cập nhật data table component
- ✅ Cập nhật filter sidebar

### Backend Files
- ✅ Tạo ReconciliationService.gs
- ✅ Cập nhật Code.gs với route mới
- ✅ Tạo appsscript.json manifest
- ✅ Tạo .clasp.json configuration
- ✅ Tạo .claspignore

### Documentation
- ✅ CLASP_SETUP.md - Hướng dẫn chi tiết
- ✅ CLASP_QUICKSTART.md - Quick reference
- ✅ RECONCILIATION_INTEGRATION.md - Integration docs
- ✅ Cập nhật SETUP_GOOGLE_APPS_SCRIPT.md
- ✅ Cập nhật backend README.md

---

## 🚀 Các bước cần làm ngay (5-10 phút)

### 1️⃣ Setup Clasp (lần đầu tiên)

**Thời gian: ~3 phút**

```bash
# Cài đặt Clasp
npm install -g @google/clasp

# Enable Apps Script API
# Mở: https://script.google.com/home/usersettings
# Bật: Google Apps Script API

# Login
cd backend-gas
clasp login
```

**Xem:** [CLASP_QUICKSTART.md](backend-gas/CLASP_QUICKSTART.md)

### 2️⃣ Push ReconciliationService.gs lên Google Apps Script

**Thời gian: ~1 phút**

```bash
cd backend-gas

# Push tất cả files
clasp push

# Verify
clasp open
```

**Kiểm tra:**
- [ ] File `ReconciliationService.gs` xuất hiện trong GAS Editor
- [ ] File `Code.gs` đã có route `getReconciliationData`

### 3️⃣ Deploy Web App (version mới)

**Thời gian: ~2 phút**

**Trong Google Apps Script Editor:**
1. Click **Deploy** → **Manage deployments**
2. Click ✏️ **Edit** trên deployment hiện tại
3. Version: Chọn **New version**
4. Description: "Add ReconciliationService"
5. Click **Deploy**
6. **Copy deployment URL** (nếu chưa có)

### 4️⃣ Update .env.local (nếu chưa làm)

**Thời gian: ~30 giây**

```bash
# Mở file
code .env.local

# Thay YOUR_DEPLOYMENT_ID bằng ID thực
NEXT_PUBLIC_GAS_API_URL=https://script.google.com/macros/s/YOUR_ACTUAL_DEPLOYMENT_ID/exec
```

**Ví dụ:**
```env
NEXT_PUBLIC_GAS_API_URL=https://script.google.com/macros/s/AKfycbxYZ123ABC/exec
```

### 5️⃣ Restart Dev Server

**Thời gian: ~30 giây**

```bash
# Stop current server (Ctrl+C)
# Restart
npm run dev
```

### 6️⃣ Test Frontend

**Thời gian: ~2 phút**

```bash
# Mở trong browser
open http://localhost:3000/reconciliation
```

**Checklist:**
- [ ] Loading skeleton hiển thị
- [ ] Data table loads với dữ liệu thực
- [ ] Summary bar hiển thị metrics
- [ ] Filters hoạt động:
  - [ ] Date range
  - [ ] Customer search
  - [ ] Route type
  - [ ] Transport unit (NAK/VENDOR)
  - [ ] Status
  - [ ] General search
- [ ] Pagination hoạt động
- [ ] No errors in Console

---

## 🧪 Testing Backend API (Optional)

### Test trực tiếp trên browser

```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=getReconciliationData
```

**Kết quả mong đợi:**
```json
{
  "success": true,
  "data": {
    "records": [...],
    "summary": {
      "totalOrders": 150,
      "totalAmount": 500000000,
      "totalDistance": 12500,
      "approvedOrders": 120,
      "pendingOrders": 30
    },
    "total": 150
  }
}
```

### Test với filters

```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=getReconciliationData&filters={"donViVanChuyen":"NAK"}
```

---

## 📚 Tài liệu tham khảo

### Quick References
- [CLASP_QUICKSTART.md](backend-gas/CLASP_QUICKSTART.md) - Setup clasp trong 5 phút
- [SETUP_GOOGLE_APPS_SCRIPT.md](SETUP_GOOGLE_APPS_SCRIPT.md) - Setup GAS deployment

### Detailed Guides
- [CLASP_SETUP.md](backend-gas/CLASP_SETUP.md) - Clasp đầy đủ
- [RECONCILIATION_INTEGRATION.md](RECONCILIATION_INTEGRATION.md) - Integration details
- [BACKEND_ANALYSIS.md](backend-gas/BACKEND_ANALYSIS.md) - Backend architecture

---

## 🔄 Development Workflow (sau khi setup)

### Khi edit backend code

```bash
# 1. Edit trong VSCode
code backend-gas/gas/ReconciliationService.gs

# 2. Push lên GAS
cd backend-gas
clasp push

# 3. Test
clasp open
```

### Khi edit frontend code

```bash
# 1. Edit trong VSCode
code app/reconciliation/page.tsx

# 2. Dev server tự reload
# No action needed

# 3. Test
open http://localhost:3000/reconciliation
```

---

## 🐛 Troubleshooting

### Frontend errors

**Error: "Failed to fetch reconciliation data"**
- Check .env.local có đúng URL không
- Verify GAS deployment đã include ReconciliationService
- Check browser Console cho error details

**Error: "Không có dữ liệu"**
- Verify Google Sheets `data_chuyen_di` có data
- Check filters có quá strict không
- View Apps Script execution logs

### Backend errors

**Error: "Sheet data_chuyen_di not found"**
- Verify MAIN_SPREADSHEET sheet name
- Check Config.gs SPREADSHEET_ID

**Clasp errors**
- See [CLASP_SETUP.md - Troubleshooting](backend-gas/CLASP_SETUP.md#troubleshooting)

---

## 🎯 Recommended Next Features

### 1. Sorting Support
- [ ] Add server-side sorting
- [ ] Update ReconciliationService.gs với sort params
- [ ] Update frontend table

### 2. Server-side Pagination
- [ ] Add offset/limit params to ReconciliationService
- [ ] Update API to support pagination
- [ ] Update frontend with infinite scroll

### 3. Export to Excel
- [ ] Add export button
- [ ] Use xlsx library
- [ ] Export filtered data

### 4. Advanced Filters
- [ ] Multi-select for status
- [ ] Date presets (This week, This month, etc.)
- [ ] Saved filter presets

### 5. Real-time Updates
- [ ] Implement WebSocket connection
- [ ] Push updates from AppSheet webhook
- [ ] Live dashboard updates

---

## 📊 Current Status

**Development Server:** ✅ Running at http://localhost:3000

**Backend Files:**
- ✅ ReconciliationService.gs created locally
- ⏳ Pending push to Google Apps Script
- ⏳ Pending deployment

**Frontend:**
- ✅ All components ready
- ✅ API routes configured
- ⏳ Waiting for backend deployment

**Next Action:** Push backend code (Step 2 above)

---

**Last Updated:** 2024-12-24
**Status:** Ready for deployment testing
