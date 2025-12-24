# Hướng dẫn Setup Google Apps Script

## Bước 1: Deploy Google Apps Script như Web App

### 1.1 Mở Google Apps Script Editor
1. Truy cập: https://script.google.com/home/projects/1TTS7pJuKKBuh5w7kAHr4xrGzfUwyN9Bw2IT1xd0DwskRC4Uhjd0EaLLL/edit
2. Hoặc: Google Sheets → Extensions → Apps Script

### 1.2 Deploy Web App
1. Click **Deploy** → **New deployment**
2. Click biểu tượng **⚙️ Settings** (gear icon)
3. Select type: **Web app**
4. Cấu hình:
   - **Description**: NAK Logistics API
   - **Execute as**: Me (your email)
   - **Who has access**: Anyone (hoặc Anyone with Google account nếu cần bảo mật hơn)
5. Click **Deploy**
6. **QUAN TRỌNG**: Copy **Web app URL**
   - Format: `https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec`
   - Lưu URL này, bạn sẽ cần nó!

### 1.3 Authorize Script
- Lần đầu deploy, Google sẽ yêu cầu authorize
- Click **Review permissions**
- Chọn Google account của bạn
- Click **Advanced** → **Go to NAK Bang Ke API (unsafe)**
- Click **Allow**

## Bước 2: Cấu hình Next.js Environment Variables

### 2.1 Cập nhật `.env.local`
```bash
# Mở file .env.local
nano .env.local
```

### 2.2 Thay thế Deployment URL
```env
# Thay YOUR_DEPLOYMENT_ID bằng ID thực từ Web app URL
NEXT_PUBLIC_GAS_API_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

**Ví dụ:**
```env
NEXT_PUBLIC_GAS_API_URL=https://script.google.com/macros/s/AKfycbxYZ123ABC/exec
```

### 2.3 Save file
```bash
# Ctrl+O để save, Ctrl+X để thoát
```

## Bước 3: Test API Connection

### 3.1 Test trực tiếp trong browser
Mở URL sau trong browser:
```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

Kết quả mong đợi:
```json
{
  "success": true,
  "message": "NAK Logistics API - Webhook Sync",
  "version": "2.0",
  "architecture": "AppSheet → Webhook → Google Sheets",
  "availableActions": [
    "getDashboardReport",
    "getDashboardReportWithFilters",
    "getReconciliationData"
  ]
}
```

### 3.2 Test Dashboard Report
```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=getDashboardReport
```

Kết quả mong đợi:
```json
{
  "success": true,
  "data": {
    "cards": {
      "tongDoanhThu": 123456789,
      "soChuyen": 150,
      "soXeNAK": 45,
      "soXeVendor": 30
    },
    "charts": { ... },
    "lastUpdated": "2025-12-24T..."
  }
}
```

### 3.3 Test Reconciliation Data
```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=getReconciliationData
```

Kết quả mong đợi:
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "maChuyenDi": "nak_123abc",
        "ngayTao": "2024-12-24",
        "tenKhachHang": "Công ty ABC",
        "tongDoanhThu": 5000000,
        "tongQuangDuong": 250,
        "donViVanChuyen": "NAK",
        "trangThai": "Hoàn thành"
      }
    ],
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

### 3.4 Test với Filters
```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=getReconciliationData&filters={"fromDate":"2024-01-01","toDate":"2024-12-31","donViVanChuyen":"NAK"}
```

## Bước 4: Restart Next.js Development Server

```bash
# Nếu server đang chạy, stop nó (Ctrl+C)

# Restart server để load environment variables mới
npm run dev
```

## Bước 5: Test Frontend Integration

### 5.1 Mở Dashboard
```
http://localhost:3000/dashboard
```

### 5.2 Kiểm tra Dashboard:
- ✅ Loading state hiển thị
- ✅ Data loads từ Google Apps Script
- ✅ Cards hiển thị số liệu thực:
  - Tổng doanh thu (VND)
  - Tổng chuyến đi
  - Xe NAK
  - Xe Vendor
- ✅ Charts hiển thị:
  - Doanh thu theo tuyến
  - Top khách hàng
- ✅ "Cập nhật lần cuối" timestamp

### 5.3 Mở Reconciliation Page
```
http://localhost:3000/reconciliation
```

Kiểm tra:
- ✅ Loading state hiển thị skeleton
- ✅ Data table hiển thị danh sách chuyến đi
- ✅ Summary bar hiển thị tổng hợp số liệu
- ✅ Filter sidebar hoạt động:
  - Date range filter
  - Customer filter
  - Route type filter
  - Transport unit filter (NAK/VENDOR)
  - Status filter
  - General search
- ✅ Pagination hoạt động (20 records/page)
- ✅ Zebra striping cho table rows

### 5.4 Kiểm tra Console
Mở DevTools → Console, không có lỗi

### 5.5 Kiểm tra Network
DevTools → Network tab:
- Request đến `/api/reports/dashboard` → Status 200
- Request đến `/api/reconciliation` → Status 200
- Response có data hợp lệ

## Bước 6: Deploy to Production (Vercel)

### 6.1 Add Environment Variable to Vercel
```bash
vercel env add NEXT_PUBLIC_GAS_API_URL production
# Paste: https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

### 6.2 Deploy
```bash
vercel --prod
```

## Troubleshooting

### Lỗi: "Failed to fetch dashboard data"

**Nguyên nhân:**
- Environment variable chưa được set
- Deployment URL sai
- Google Apps Script chưa được deploy

**Giải pháp:**
1. Kiểm tra `.env.local`:
   ```bash
   cat .env.local
   ```
2. Verify Deployment URL trong Apps Script Editor:
   - Deploy → Manage deployments → Copy URL
3. Restart Next.js server

### Lỗi: "CORS blocked"

**Nguyên nhân:**
- Google Apps Script không có CORS headers

**Giải pháp:**
- Code đã có `doOptions()` function để handle CORS
- Nếu vẫn lỗi, check `createJsonResponse()` function

### Lỗi: "Authorization required"

**Nguyên nhân:**
- Script chưa được authorize
- "Who has access" setting sai

**Giải pháp:**
1. Re-deploy với "Who has access" = **Anyone**
2. Hoặc implement authentication trong Next.js API route

### Data không hiển thị

**Giải pháp:**
1. Check Google Sheets có data:
   - Open MAIN_SPREADSHEET
   - Sheet `data_chuyen_di` có data
2. Check Apps Script logs:
   - Apps Script Editor → Execution log
   - Check for errors
3. Run `createJsonDatabase()` để rebuild data:
   ```javascript
   // In Apps Script Editor
   function test() {
     createJsonDatabase();
   }
   ```

## Advanced Configuration

### Caching Strategy
Modify `app/api/reports/dashboard/route.ts`:
```typescript
return NextResponse.json(result.data, {
  headers: {
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
  },
})
```

### Request Timeout
Modify `lib/services/gas-api.ts`:
```typescript
const API_TIMEOUT = 60000 // 60 seconds
```

### Real-time Updates
Add to `.env.local`:
```env
NEXT_PUBLIC_REFETCH_INTERVAL=300000 # 5 minutes
```

## Next Steps

1. **Add Filters to Dashboard**
   - Date range picker
   - Customer filter
   - Route filter

2. **Add Reconciliation Page Integration**
   - Fetch from `data_chuyen_di` sheet
   - Display with TanStack Table

3. **Add Authentication**
   - Protect Google Apps Script endpoint
   - Add API key verification

4. **Monitor Performance**
   - Track API response times
   - Set up error tracking (Sentry)
   - Monitor Google Apps Script quotas

---

**Support:**
- Google Apps Script Docs: https://developers.google.com/apps-script
- Next.js Docs: https://nextjs.org/docs
