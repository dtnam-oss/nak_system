# 🚀 HƯỚNG DẪN CẤU HÌNH GOOGLE APPS SCRIPT & APPSHEET

> **Tài liệu này hướng dẫn chi tiết cách triển khai workflow đồng bộ dữ liệu từ AppSheet sang Backend API thông qua Google Apps Script**

---

## 📋 MỤC LỤC

1. [Tổng quan Architecture](#1-tổng-quan-architecture)
2. [Bước 1: Deploy Google Apps Script](#2-bước-1-deploy-google-apps-script)
3. [Bước 2: Cấu hình AppSheet Bots](#3-bước-2-cấu-hình-appsheet-bots)
4. [Bước 3: Test & Debug](#4-bước-3-test--debug)
5. [Troubleshooting](#5-troubleshooting)

---

## 1. 🏗️ TỔNG QUAN ARCHITECTURE

### Flow hoạt động:
```
AppSheet Event (Add/Edit/Delete)
    ↓
AppSheet Bot được trigger
    ↓
Bot gọi Google Apps Script function với parameters
    ↓
GAS đọc dữ liệu từ Google Sheets
    ↓
GAS format & validate data
    ↓
GAS gửi JSON chuẩn tới Backend API (Next.js)
    ↓
Backend xử lý & lưu vào PostgreSQL
```

### Ưu điểm của giải pháp:
- ✅ **Không còn lỗi JSON** từ AppSheet webhook
- ✅ **Dynamic column mapping** - Thay đổi thứ tự cột không ảnh hưởng
- ✅ **Type-safe** - Đảm bảo data type đúng
- ✅ **Centralized logic** - Dễ maintain và debug
- ✅ **Error handling** - Xử lý lỗi tốt hơn

---

## 2. 🔧 BƯỚC 1: DEPLOY GOOGLE APPS SCRIPT

### 2.1. Tạo Google Apps Script Project

1. **Mở Google Spreadsheet:**
   - Truy cập: https://docs.google.com/spreadsheets/d/1fzepYrS-o5zc01h7nQFzJSOwagoTvOgoiDQHrTLB12E/edit

2. **Mở Apps Script Editor:**
   - Click **Extensions** → **Apps Script**

3. **Tạo các file script:**
   - File 1: `Config.gs` (Copy toàn bộ nội dung từ file `Config.gs`)
   - File 2: `Code.gs` (Copy toàn bộ nội dung từ file `Code.gs`)

### 2.2. Cấu hình API Endpoint

Trong file `Config.gs`, tìm dòng:

```javascript
API: {
  // ENDPOINT: 'https://your-domain.vercel.app/api/webhook/appsheet',  // Production
  ENDPOINT: 'http://localhost:3000/api/webhook/appsheet',              // Development
  ...
}
```

**🔴 QUAN TRỌNG:** Thay đổi endpoint:

- **Development (test trên máy local):**
  ```javascript
  ENDPOINT: 'http://localhost:3000/api/webhook/appsheet'
  ```

- **Production (sau khi deploy lên Vercel):**
  ```javascript
  ENDPOINT: 'https://nak-logistics.vercel.app/api/webhook/appsheet'
  ```

### 2.3. Deploy Script

1. **Click nút "Deploy" → "New deployment"**

2. **Chọn type: "Web app"**
   - Execute as: **Me** (your email)
   - Who has access: **Anyone** (hoặc "Anyone with the link")

3. **Click "Deploy"**

4. **Copy Web App URL** (Sẽ dùng trong bước tiếp theo)
   - URL sẽ có dạng: `https://script.google.com/macros/s/ABC123.../exec`

5. **Authorize Script:**
   - Lần đầu deploy sẽ yêu cầu authorize
   - Click "Review permissions"
   - Chọn tài khoản Google của bạn
   - Click "Advanced" → "Go to [Project name] (unsafe)"
   - Click "Allow"

---

## 3. 📱 BƯỚC 2: CẤU HÌNH APPSHEET BOTS

### 3.1. Tổng quan về Bots

Bạn cần tạo **3 Bots** tương ứng với 3 events:
- **Bot 1:** Add Trip (Khi thêm chuyến đi mới)
- **Bot 2:** Edit Trip (Khi sửa chuyến đi)
- **Bot 3:** Delete Trip (Khi xóa chuyến đi)

---

### 3.2. BOT 1: Add Trip

#### Bước 1: Tạo Bot mới
1. Vào AppSheet Editor → **Automation** → **Bots**
2. Click **"+ New Bot"**
3. Đặt tên: **"Sync Add Trip to Backend"**

#### Bước 2: Configure Event
- **Event:** Data change
- **Table:** `chuyen_di`
- **Condition:** `ISNOTBLANK([ma_chuyen_di])`
- **Trigger:** `Adds only`

#### Bước 3: Configure Process
1. Click **"Add a step"**
2. **Step Type:** Run a script

#### Bước 4: Script Configuration
- **Script URL:** (Paste Web App URL từ bước 1.3)
  ```
  https://script.google.com/macros/s/ABC123.../exec
  ```

- **Function Name:** `syncTripToBackend`

- **Parameters:** (Thứ tự quan trọng!)
  ```
  [ma_chuyen_di], "Add"
  ```

#### Screenshot cấu hình (ví dụ):
```
┌─────────────────────────────────────┐
│ Function Name: syncTripToBackend    │
│ Parameters:                         │
│   1. [ma_chuyen_di]                │
│   2. "Add"                          │
└─────────────────────────────────────┘
```

#### Bước 5: Save Bot
- Click **"Save"**
- Enable Bot bằng cách toggle switch

---

### 3.3. BOT 2: Edit Trip

#### Cấu hình tương tự Bot 1, chỉ khác:

- **Tên Bot:** "Sync Edit Trip to Backend"
- **Trigger:** `Updates only` (thay vì Adds only)
- **Parameters:**
  ```
  [ma_chuyen_di], "Edit"
  ```

---

### 3.4. BOT 3: Delete Trip

#### Cấu hình:

- **Tên Bot:** "Sync Delete Trip to Backend"
- **Event:** Data change
- **Table:** `chuyen_di`
- **Trigger:** `Deletes only`
- **Parameters:**
  ```
  [_THISROW_BEFORE].[ma_chuyen_di], "Delete"
  ```

**🔴 LƯU Ý:** Với Delete, phải dùng `[_THISROW_BEFORE]` vì row đã bị xóa!

---

### 3.5. Tóm tắt Parameters cho 3 Bots

| Bot | Function Name | Parameter 1 | Parameter 2 |
|-----|--------------|-------------|-------------|
| Add | `syncTripToBackend` | `[ma_chuyen_di]` | `"Add"` |
| Edit | `syncTripToBackend` | `[ma_chuyen_di]` | `"Edit"` |
| Delete | `syncTripToBackend` | `[_THISROW_BEFORE].[ma_chuyen_di]` | `"Delete"` |

---

## 4. 🧪 BƯỚC 3: TEST & DEBUG

### 4.1. Test trong Google Apps Script Editor

Trước khi test với AppSheet, test trước trong GAS:

1. **Mở Apps Script Editor**

2. **Chọn function test:**
   - Click dropdown function → Chọn `testSyncAdd`

3. **Click Run (▶️)**

4. **Xem Logs:**
   - Click **"Execution log"** để xem kết quả
   - Kiểm tra xem có lỗi không

5. **Test các function khác:**
   - `testSyncEdit()`
   - `testSyncDelete()`
   - `testGetMasterData()`
   - `testGetDetailData()`

### 4.2. Test với AppSheet

1. **Test Add:**
   - Vào AppSheet app
   - Thêm một chuyến đi mới
   - Kiểm tra:
     - ✅ Bot có chạy không? (xem Bot execution history)
     - ✅ Backend có nhận được data không? (xem logs)

2. **Test Edit:**
   - Sửa một chuyến đi đã tồn tại
   - Kiểm tra tương tự

3. **Test Delete:**
   - Xóa một chuyến đi
   - Kiểm tra Backend có nhận event Delete không

### 4.3. Xem Logs

#### Google Apps Script Logs:
1. Mở Apps Script Editor
2. Click **"Executions"** (icon ⏱️ bên trái)
3. Click vào execution để xem chi tiết

#### Backend API Logs:
```bash
# Nếu chạy local
cd /Users/mac/Desktop/nak-logistic-system
pnpm dev

# Xem console logs khi có request đến
```

---

## 5. 🔍 TROUBLESHOOTING

### 5.1. Lỗi thường gặp

#### ❌ Lỗi: "Column not found"

**Nguyên nhân:** Tên cột trong Sheet không khớp với config

**Giải pháp:**
1. Mở file `Config.gs`
2. Kiểm tra tên cột trong `MASTER_COLUMNS` và `DETAIL_COLUMNS`
3. So sánh với tên cột thực tế trong Sheet
4. Sửa cho khớp (chú ý viết hoa/thường)

#### ❌ Lỗi: "tripId is required"

**Nguyên nhân:** AppSheet Bot không truyền đúng parameter

**Giải pháp:**
1. Kiểm tra lại Parameters trong Bot config
2. Đảm bảo thứ tự: `[ma_chuyen_di], "Add"`
3. Với Delete: phải dùng `[_THISROW_BEFORE].[ma_chuyen_di]`

#### ❌ Lỗi: "API Error (500)"

**Nguyên nhân:** Backend API có lỗi hoặc không chạy

**Giải pháp:**
1. Kiểm tra Backend có đang chạy không
2. Kiểm tra API endpoint trong `Config.gs` có đúng không
3. Xem Backend logs để tìm lỗi cụ thể

#### ❌ Lỗi: "Authorization required"

**Nguyên nhân:** Chưa authorize GAS script

**Giải pháp:**
1. Chạy một test function trong GAS Editor
2. Authorize khi được yêu cầu
3. Re-deploy script

### 5.2. Debug Tips

#### Tip 1: Enable Verbose Logging
Trong `Config.gs`:
```javascript
LOGGING: {
  ENABLED: true,
  VERBOSE: true  // Xem full JSON payload
}
```

#### Tip 2: Test với fake tripId
Sửa hàm test để dùng tripId thật từ Sheet:
```javascript
function testSyncAdd() {
  const result = syncTripToBackend('CH001', 'Add'); // Thay 'CH001' bằng ma_chuyen_di thật
  Logger.log(JSON.stringify(result, null, 2));
}
```

#### Tip 3: Kiểm tra JSON payload trước khi gửi
Thêm breakpoint hoặc log:
```javascript
Logger.log('Payload being sent:');
Logger.log(JSON.stringify(payload, null, 2));
```

---

## 6. 📝 CHECKLIST TRIỂN KHAI

### Pre-deployment:
- [ ] Copy Code.gs và Config.gs vào Apps Script Editor
- [ ] Cấu hình đúng Spreadsheet ID
- [ ] Cấu hình đúng API endpoint
- [ ] Kiểm tra tên các sheet (chuyen_di, chi_tiet_chuyen_di)
- [ ] Kiểm tra tên các cột khớp với config

### Testing:
- [ ] Test các hàm trong GAS Editor (testSyncAdd, testSyncEdit, testSyncDelete)
- [ ] Test đọc Master data (testGetMasterData)
- [ ] Test đọc Detail data (testGetDetailData)
- [ ] Kiểm tra logs không có lỗi

### Deployment:
- [ ] Deploy GAS script thành Web App
- [ ] Authorize script với Google account
- [ ] Copy Web App URL

### AppSheet Configuration:
- [ ] Tạo Bot 1: Add Trip
- [ ] Tạo Bot 2: Edit Trip
- [ ] Tạo Bot 3: Delete Trip
- [ ] Enable tất cả 3 Bots

### End-to-End Testing:
- [ ] Test Add: Thêm chuyến đi mới trong AppSheet
- [ ] Test Edit: Sửa chuyến đi trong AppSheet
- [ ] Test Delete: Xóa chuyến đi trong AppSheet
- [ ] Kiểm tra Backend logs
- [ ] Kiểm tra data trong PostgreSQL

---

## 7. 🎓 LƯU Ý QUAN TRỌNG

### ⚠️ Về Column Mapping:
- Code SỬ DỤNG tên cột, KHÔNG dùng index
- Nếu bạn thay đổi thứ tự cột → Code vẫn chạy đúng
- Nếu bạn đổi tên cột → Phải update Config.gs

### ⚠️ Về Data Type:
- Số (doanh_thu, so_km_theo_odo...): Tự động convert về Number, nếu lỗi = 0
- Ngày (ngay_tao): Tự động format YYYY-MM-DD
- String: Tự động trim spaces

### ⚠️ Về Delete Event:
- KHÔNG đọc Sheet (vì data đã bị xóa)
- CHỈ gửi `{ Action: "Delete", maChuyenDi: "..." }`
- Backend tự xử lý xóa dựa trên maChuyenDi

### ⚠️ Về Performance:
- GAS có giới hạn execution time: 6 phút
- Nếu có nhiều detail records, cân nhắc optimize
- Có thể dùng batch processing nếu cần

---

## 8. 📞 HỖ TRỢ

Nếu gặp vấn đề:
1. Xem logs trong GAS Executions
2. Xem logs trong Backend console
3. Kiểm tra lại checklist ở trên
4. Xem phần Troubleshooting

---

## 9. 🔄 WORKFLOW UPDATE

Khi cần thêm/sửa/xóa cột:

1. **Thêm cột mới:**
   - Thêm cột vào Sheet
   - Update `Config.gs` → thêm mapping mới
   - Deploy lại script

2. **Đổi tên cột:**
   - Đổi tên trong Sheet
   - Update `Config.gs` → sửa tên cột trong mapping
   - Deploy lại script

3. **Xóa cột:**
   - Xóa khỏi Sheet
   - Xóa mapping trong `Config.gs`
   - Deploy lại script

**KHÔNG CẦN** thay đổi code logic trong `Code.gs`!

---

## 10. ✅ KẾT LUẬN

Sau khi hoàn thành setup:
- ✅ AppSheet events → Tự động trigger GAS
- ✅ GAS đọc data từ Sheets
- ✅ GAS format & validate data
- ✅ GAS gửi JSON chuẩn sang Backend
- ✅ Backend lưu vào PostgreSQL
- ✅ Không còn lỗi JSON từ AppSheet webhook!

**🎉 Chúc bạn triển khai thành công!**
