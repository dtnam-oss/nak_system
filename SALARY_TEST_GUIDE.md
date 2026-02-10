# 🧪 HƯỚNG DẪN TEST: Lương tổng hợp - Cấu trúc mới

## 🎯 Test trên Local

### 1. Mở trang Lương
```
http://localhost:3000/salary
```

### 2. Chọn tháng test
- Chọn: **Tháng 2, Năm 2026**
- Click: Tab **"Lương tổng hợp"**

### 3. Kiểm tra Table

**Kỳ vọng thấy:**
- ✅ Header có 3 nhóm columns:
  - 📈 **CÁC KHOẢN THU NHẬP** (5 columns) - màu xanh lá
  - 📉 **CÁC KHOẢN KHẤU TRỪ** (10 columns) - màu đỏ
  - 💰 **THU NHẬP THỰC LĨNH** (1 column) - màu xanh dương

- ✅ Dữ liệu test (2 records):
  1. **TX001 - Nguyễn Văn A**
     - Lương chuyển: 15,000,000 ₫
     - Hoàn phí sửa chữa: 500,000 ₫
     - Hoàn cọc: 1,000,000 ₫
     - Thực lãnh: ~12,150,000 ₫
  
  2. **TX002 - Trần Văn B**
     - Lương chuyển: 18,000,000 ₫
     - Hoàn phí sửa chữa: 750,000 ₫
     - Thực lãnh: ~16,760,000 ₫

- ✅ Summary footer:
  - Số nhân viên: 2 người
  - Tổng thu nhập: ~33,800,000 ₫
  - Tổng thực lãnh: ~29,660,000 ₫

### 4. Test Edit Dialog

**Click nút "Edit" (icon bút chì) trên record TX001:**

**Tab 1: 📈 Thu nhập**
- ✅ 5 fields hiển thị:
  - Lương chuyển: 15,000,000
  - Hoàn phí sửa chữa: 500,000
  - Hoàn cọc: 1,000,000
  - Hoàn phí đổ dầu ngoài: 200,000
  - Hoàn chi phí phát sinh: 100,000

**Tab 2: 📉 Khấu trừ**
- ✅ 10 fields hiển thị:
  - Truy thu đầu: 300,000
  - Truy thu ontime: 150,000
  - Trừ cọc: 500,000
  - Phí tạm ứng: 2,000,000
  - Phạt chế tài: 100,000
  - Truy thu VETC: 250,000
  - Phạt nguội: 50,000
  - Tiền làm thẻ: 100,000
  - BHXH: 450,000
  - Khác: 0

**Tab 3: 💰 Kết quả**
- ✅ Hiển thị summary:
  - Tổng thu nhập: 16,800,000 ₫
  - Tổng khấu trừ: 3,900,000 ₫
  - Thực lãnh: 12,900,000 ₫

### 5. Test Save Changes

**Thử thay đổi:**
1. Tab "Thu nhập" → Sửa "Lương chuyển" thành **20,000,000**
2. Tab "Kết quả" → Kiểm tra "Thực lãnh" tự động cập nhật
3. Click **"Lưu thay đổi"**
4. ✅ Dialog đóng
5. ✅ Table tự động refresh
6. ✅ Row TX001 hiển thị số liệu mới

---

## 🌐 Test trên Production (Vercel)

### 1. Deploy lên Vercel

```bash
git add .
git commit -m "feat: Restructure salary table with new fields"
git push origin main
```

### 2. Chờ deployment complete

Visit: https://nak-logistic-system.vercel.app

### 3. Login và test

1. Navigate to: `/salary`
2. Chọn tháng có data
3. Kiểm tra tương tự như local

---

## 📊 Test API trực tiếp

### GET - Lấy danh sách

```bash
# Local
curl "http://localhost:3000/api/salary/luong-tong-hop?month=2&year=2026"

# Production
curl "https://nak-logistic-system.vercel.app/api/salary/luong-tong-hop?month=2&year=2026"
```

**Expected response:**
```json
{
  "success": true,
  "data": [
    {
      "ma_nhan_vien": "TX001",
      "luong_bat_dau": 15000000,
      "tong_chi_phi_sua_chua": 500000,
      ...
    }
  ],
  "count": 2,
  "summary": {
    "total_luong_chuyen": 33000000,
    "total_thuc_lanh": 29660000
  }
}
```

### PATCH - Cập nhật record

```bash
curl -X PATCH "http://localhost:3000/api/salary/luong-tong-hop/[ID]" \
  -H "Content-Type: application/json" \
  -d '{
    "luong_bat_dau": 20000000,
    "tong_chi_phi_sua_chua": 500000,
    "hoan_coc": 1000000
  }'
```

---

## ✅ Checklist hoàn thành

### UI Tests
- [ ] Table hiển thị đúng 15 columns
- [ ] Header groups (Thu nhập, Khấu trừ, Kết quả) có màu sắc đúng
- [ ] Summary footer tính toán chính xác
- [ ] Edit button hoạt động
- [ ] Delete button hoạt động

### Edit Dialog Tests
- [ ] 3 tabs hiển thị đầy đủ
- [ ] Tab "Thu nhập" có 5 fields
- [ ] Tab "Khấu trừ" có 10 fields
- [ ] Tab "Kết quả" tính toán real-time
- [ ] Save changes thành công
- [ ] Table refresh sau khi save

### API Tests
- [ ] GET endpoint trả về đúng format
- [ ] Tất cả 15 fields có trong response
- [ ] Summary statistics chính xác
- [ ] PATCH endpoint update thành công
- [ ] Validation hoạt động

### Browser Compatibility
- [ ] Chrome/Edge - OK
- [ ] Firefox - OK
- [ ] Safari - OK
- [ ] Mobile responsive - OK

---

## 🐛 Common Issues & Fixes

### Issue 1: Table không hiển thị data
**Fix:** Kiểm tra tháng/năm có data trong DB
```sql
SELECT * FROM luong_tong_hop WHERE thang = 2 AND nam = 2026;
```

### Issue 2: Edit dialog không save
**Fix:** Check browser console for errors
- Có thể do missing field trong interface
- Kiểm tra API endpoint logs

### Issue 3: Columns bị lệch
**Fix:** Clear browser cache và hard reload (Cmd+Shift+R)

### Issue 4: Summary tính sai
**Fix:** Kiểm tra calculation trong component
- `tongThuNhap` = sum of 5 income fields
- `tongKhauTru` = sum of 10 deduction fields

---

## 📞 Support

Nếu gặp vấn đề, check:
1. Browser console logs
2. Next.js server logs
3. Database connection
4. API endpoint responses

**Created:** 2026-02-10
