# Deployment Checklist - NAK Logistics System

## 📋 Pre-deployment Checks

### Backend - Google Apps Script
- [ ] ReconciliationService.gs file created
- [ ] Code.gs updated with getReconciliationData route
- [ ] appsscript.json manifest created
- [ ] .clasp.json configuration created

### Frontend - Next.js
- [ ] types/reconciliation.ts updated
- [ ] lib/services/gas-api.ts has getReconciliationData function
- [ ] app/api/reconciliation/route.ts created
- [ ] hooks/use-reconciliation-data.ts created
- [ ] app/reconciliation/page.tsx updated
- [ ] components/reconciliation/data-table.tsx updated
- [ ] components/reconciliation/filter-sidebar.tsx updated

---

## 🚀 Deployment Steps

### Step 1: Setup Clasp (First time only)
- [ ] Install clasp: `npm install -g @google/clasp`
- [ ] Enable Apps Script API: https://script.google.com/home/usersettings
- [ ] Login: `clasp login`
- [ ] Verify: `clasp login --status`

### Step 2: Push Backend Code
- [ ] Navigate to backend: `cd backend-gas`
- [ ] Push files: `clasp push`
- [ ] Verify in browser: `clasp open`
- [ ] Confirm ReconciliationService.gs exists in GAS Editor
- [ ] Confirm Code.gs has getReconciliationData route

### Step 3: Deploy Web App
- [ ] Open GAS Editor
- [ ] Click Deploy → Manage deployments
- [ ] Click ✏️ Edit on existing deployment
- [ ] Select "New version"
- [ ] Add description: "Add ReconciliationService"
- [ ] Click Deploy
- [ ] Copy deployment URL (if first time)

### Step 4: Configure Environment
- [ ] Open `.env.local` file
- [ ] Replace `YOUR_DEPLOYMENT_ID` with actual deployment ID
- [ ] Save file
- [ ] Example: `NEXT_PUBLIC_GAS_API_URL=https://script.google.com/macros/s/AKfycbxYZ123ABC/exec`

### Step 5: Restart Dev Server
- [ ] Stop current server (Ctrl+C)
- [ ] Start server: `npm run dev`
- [ ] Verify server running at http://localhost:3000

---

## ✅ Testing Checklist

### Test 1: Backend API Health
- [ ] Open: `https://script.google.com/macros/s/{YOUR_ID}/exec`
- [ ] Verify response includes `"getReconciliationData"` in availableActions
- [ ] Status: `success: true`

### Test 2: Reconciliation Endpoint
- [ ] Open: `https://script.google.com/macros/s/{YOUR_ID}/exec?action=getReconciliationData`
- [ ] Verify response has `success: true`
- [ ] Verify response has `data.records` array
- [ ] Verify response has `data.summary` object
- [ ] Verify response has `data.total` number

### Test 3: Dashboard Page
- [ ] Open: http://localhost:3000/dashboard
- [ ] Loading skeleton displays
- [ ] Cards display real data:
  - [ ] Tổng doanh thu (VND)
  - [ ] Tổng chuyến đi
  - [ ] Xe NAK
  - [ ] Xe Vendor
- [ ] Charts display:
  - [ ] Doanh thu theo tuyến
  - [ ] Top khách hàng
- [ ] "Cập nhật lần cuối" timestamp shows
- [ ] No errors in Console

### Test 4: Reconciliation Page
- [ ] Open: http://localhost:3000/reconciliation
- [ ] Loading skeleton displays
- [ ] Summary bar shows:
  - [ ] Total orders
  - [ ] Total amount (VND)
  - [ ] Total distance (km)
  - [ ] Approved orders
  - [ ] Pending orders
- [ ] Data table displays records
- [ ] Table columns show correctly:
  - [ ] Mã chuyến đi
  - [ ] Ngày
  - [ ] Biển số xe
  - [ ] Tuyến đường
  - [ ] Khách hàng
  - [ ] Quãng đường (km)
  - [ ] Doanh thu (VND)
  - [ ] Đơn vị (NAK/VENDOR badge)
  - [ ] Trạng thái
- [ ] Pagination controls work
- [ ] No errors in Console

### Test 5: Filters
- [ ] Date range filter works
  - [ ] Select fromDate
  - [ ] Select toDate
  - [ ] Data updates
- [ ] Customer filter works
  - [ ] Enter customer name
  - [ ] Data filters
- [ ] Route type filter works
  - [ ] Enter route type
  - [ ] Data filters
- [ ] Transport unit dropdown works
  - [ ] Select NAK
  - [ ] Data shows only NAK records
  - [ ] Select VENDOR
  - [ ] Data shows only VENDOR records
- [ ] Status filter works
  - [ ] Enter status
  - [ ] Data filters
- [ ] General search works
  - [ ] Enter search query
  - [ ] Data filters across all fields
- [ ] Reset button works
  - [ ] Click reset
  - [ ] All filters clear
  - [ ] Data shows all records

### Test 6: Network Requests
- [ ] Open DevTools → Network tab
- [ ] Refresh page
- [ ] Verify requests:
  - [ ] `/api/reconciliation` → Status 200
  - [ ] Response has valid JSON
  - [ ] Response time < 3 seconds
- [ ] Apply filters
- [ ] Verify:
  - [ ] New request sent with filter params
  - [ ] Response updates
  - [ ] No errors

### Test 7: Error Handling
- [ ] Disconnect internet
- [ ] Refresh page
- [ ] Verify error message displays
- [ ] Reconnect internet
- [ ] Refresh page
- [ ] Verify data loads

---

## 🔍 Debugging Checklist

### If Dashboard data doesn't load:
- [ ] Check .env.local has correct URL
- [ ] Verify GAS deployment includes getDashboardReport
- [ ] Check Apps Script execution logs
- [ ] Test API directly in browser

### If Reconciliation data doesn't load:
- [ ] Check .env.local has correct URL
- [ ] Verify GAS deployment includes getReconciliationData
- [ ] Check ReconciliationService.gs was pushed
- [ ] Check Apps Script execution logs
- [ ] Test API directly in browser
- [ ] Verify `data_chuyen_di` sheet has data

### If Filters don't work:
- [ ] Check Console for errors
- [ ] Verify filter params sent in Network tab
- [ ] Check Apps Script logs for filter errors
- [ ] Test API with filters in browser

---

## 📝 Post-Deployment Tasks

### Documentation
- [ ] Update .env.local.example (if needed)
- [ ] Update README.md with deployment URL
- [ ] Document any issues encountered
- [ ] Update CHANGELOG.md

### Performance
- [ ] Check API response times
- [ ] Monitor Apps Script quota usage
- [ ] Check frontend bundle size
- [ ] Test on mobile devices

### Security
- [ ] Review GAS deployment permissions
- [ ] Check CORS configuration
- [ ] Verify no sensitive data in logs
- [ ] Review environment variables

---

## 🎉 Deployment Complete

- [ ] All tests passing
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Documentation updated
- [ ] Team notified

**Deployment Date:** _______________
**Deployed By:** _______________
**Version:** _______________

---

## 📞 Support

**If you encounter issues:**
- Check [NEXT_STEPS.md](NEXT_STEPS.md) - Troubleshooting section
- Check [CLASP_SETUP.md](backend-gas/CLASP_SETUP.md) - Troubleshooting section
- Review Apps Script execution logs
- Check browser Console for errors

**Documentation:**
- [RECONCILIATION_INTEGRATION.md](RECONCILIATION_INTEGRATION.md) - Full integration guide
- [SETUP_GOOGLE_APPS_SCRIPT.md](SETUP_GOOGLE_APPS_SCRIPT.md) - GAS setup guide
- [backend-gas/BACKEND_ANALYSIS.md](backend-gas/BACKEND_ANALYSIS.md) - Backend architecture
