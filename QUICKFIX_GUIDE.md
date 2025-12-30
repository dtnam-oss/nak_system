# 🚀 QUICK FIX DEPLOYMENT GUIDE

## ✅ Issue Fixed: Chi Tiết Lộ Trình Showing 0 Values

**Root Cause**: Field names mismatch (snake_case vs camelCase)
**Status**: ✅ Code fixed and pushed to GitHub (commit: f88c79a)

---

## 📋 IMMEDIATE ACTION REQUIRED

### Step 1: Deploy Updated GAS Script (⏱️ 2 minutes)

```
1. Mở Google Apps Script Editor
2. Click "Deploy" → "Manage deployments"
3. Click nút Edit (✏️) ở deployment hiện tại
4. Version: Chọn "New version"
5. Description: "Fix field mapping camelCase"
6. Click "Deploy"
7. Copy Web App URL (không thay đổi)
```

**Lưu ý**: Frontend code đã auto-deploy lên Vercel, KHÔNG CẦN thao tác gì thêm.

---

## 🔍 What Was Fixed

### Before (❌ Sai)
```javascript
// Config.gs gửi snake_case
{
  "chiTietLoTrinh": [
    {
      "quang_duong": 250,      // ❌ Frontend không đọc được
      "tai_trong": 12.5,       // ❌ Frontend không đọc được
      "lo_trinh": "HCM - HN"   // ❌ Frontend không đọc được
    }
  ]
}
```

### After (✅ Đúng)
```javascript
// Config.gs gửi camelCase
{
  "chiTietLoTrinh": [
    {
      "thuTu": 1,              // ✅ NEW: Sequence number
      "quangDuong": 250,       // ✅ Frontend hiển thị: 250 km
      "taiTrong": 12.5,        // ✅ Frontend hiển thị: 12.5 tấn
      "loTrinh": "HCM - HN",   // ✅ Frontend hiển thị: HCM - HN
      "donGia": 10000,         // ✅ Unit price
      "thanhTien": 3250000     // ✅ Calculated: 3.250.000 đ
    }
  ]
}
```

---

## 🧪 Test Steps (⏱️ 3 minutes)

### Test Case 1: Existing Data
```
1. Mở trang Đối soát
2. Click vào 1 chuyến đi bất kỳ (nút 👁️)
3. Kiểm tra "Chi tiết lộ trình"
```

**Expected Result**:
- ❌ Hiện tại vẫn thấy 0 values (do dữ liệu cũ)
- ✅ Sẽ fix sau khi re-sync từ AppSheet

### Test Case 2: New Data (Recommended)
```
1. Vào AppSheet
2. Tạo hoặc Edit 1 chuyến đi
3. Đợi 5-10 giây (webhook chạy)
4. Refresh trang Đối soát
5. Click xem chi tiết chuyến đi vừa update
```

**Expected Result**:
- ✅ Quãng đường hiển thị đúng km
- ✅ Tải trọng hiển thị đúng tấn
- ✅ Thành tiền hiển thị đúng số tiền
- ✅ Tổng cộng tính đúng

---

## 📊 Field Mapping Cheat Sheet

| Sheet Column (snake_case) | JSON Key (camelCase) | Display in UI |
|---------------------------|----------------------|---------------|
| quang_duong               | quangDuong           | Quãng đường (km) |
| tai_trong                 | taiTrong             | Tải trọng (tấn) |
| lo_trinh                  | loTrinh              | Lộ trình |
| don_gia                   | donGia               | Đơn giá |
| thanh_tien                | thanhTien            | Thành tiền |
| ma_tem                    | maTem                | Mã Tem |
| so_chieu                  | soChieu              | Số chiều |
| -                         | thuTu                | Thứ tự (auto) |

---

## 🔧 Troubleshooting

### ❓ Vẫn thấy 0 values sau khi deploy

**Nguyên nhân**: Dữ liệu cũ trong database vẫn dùng snake_case

**Giải pháp**:
1. Vào AppSheet
2. Edit bất kỳ field nào của chuyến đi (VD: thêm comment)
3. Save → Trigger webhook → Update database với field mới

### ❓ Thành tiền vẫn là 0 đ

**Kiểm tra**: Sheet có đủ dữ liệu không?
- `don_gia` > 0
- `tai_trong` hoặc `quang_duong` > 0

**Auto-calculation**: Script sẽ tự tính:
```
thanhTien = donGia × taiTrong × soChieu
HOẶC
thanhTien = donGia × quangDuong × soChieu
```

### ❓ Không thấy thuTu (sequence number)

**Nguyên nhân**: thuTu được generate tự động, không lấy từ Sheet

**Kiểm tra**: Xem webhook logs trong Vercel để verify

---

## 📝 Verification SQL (Optional)

```sql
-- Check chiTietLoTrinh structure in database
SELECT 
  order_id,
  jsonb_pretty(details->'chiTietLoTrinh'->0) as first_detail
FROM reconciliation_orders
WHERE details->'chiTietLoTrinh' IS NOT NULL
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Output**:
```json
{
  "id": "...",
  "thuTu": 1,
  "maTem": "...",
  "loTrinh": "...",
  "quangDuong": 250,
  "taiTrong": 12.5,
  "donGia": 10000,
  "thanhTien": 3250000
}
```

---

## 🎯 Success Criteria

- ✅ GAS script deployed (new version)
- ✅ Create/edit test trip in AppSheet
- ✅ Trip Details dialog shows non-zero values
- ✅ All fields display correctly in table
- ✅ Total row calculates sum properly

---

## 📞 Support

Nếu gặp vấn đề:
1. Check Vercel logs: https://vercel.com/your-project/logs
2. Check GAS logs: Apps Script Editor → Executions
3. Xem chi tiết trong: [BUGFIX_CHI_TIET_LO_TRINH.md](./BUGFIX_CHI_TIET_LO_TRINH.md)

---

**Last Updated**: December 30, 2025
**Commit**: f88c79a
**Status**: ✅ Ready for deployment
