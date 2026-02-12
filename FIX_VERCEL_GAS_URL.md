# ⚠️ FIX NGAY: GAS_WEB_APP_URL trên Vercel bị SAI!

## 🔍 Vấn đề phát hiện

Kiểm tra môi trường production phát hiện:

```json
{
  "hasGasWebAppUrl": true,  // ✅ Đã set
  "gasWebAppUrl": "https://script.google.com/macros/s/AKfycbzncuSMQeb..." // ❌ SAI!
}
```

**URL đúng phải là:**
```
https://script.google.com/macros/s/AKfycbx268J5Oewi7pRC03CSaLH1n3tsnoM4MyRJUkRbGooag4OWysPolX9JbPgfYALnOrbF/exec
```

**URL hiện tại (SAI):**
```
https://script.google.com/macros/s/AKfycbzncuSMQeb/exec
```

→ URL bị cắt ngắn hoặc nhập sai!

---

## 🚨 Triệu chứng

1. ✅ `testSendEmail()` trong GAS chạy thành công
2. ❌ Production test email: "Failed to send payslip"
3. ❌ GAS execution logs: KHÔNG thấy `doPost` được gọi từ production
4. ✅ Local development: hoạt động bình thường

→ **Root cause:** Next.js production đang gọi SAI URL!

---

## ✅ Giải pháp: Cập nhật lại URL trên Vercel

### Bước 1: Xóa biến cũ

1. Vào https://vercel.com
2. Chọn project: **nak-logistic-system**
3. Settings → Environment Variables
4. Tìm `GAS_WEB_APP_URL`
5. Click **"..."** → **"Remove"**
6. Confirm xóa

### Bước 2: Thêm lại URL ĐÚNG

1. Vẫn ở trang Environment Variables
2. Click **"Add New"**
3. Điền:

```
Key: GAS_WEB_APP_URL

Value (copy CHÍNH XÁC):
https://script.google.com/macros/s/AKfycbx268J5Oewi7pRC03CSaLH1n3tsnoM4MyRJUkRbGooag4OWysPolX9JbPgfYALnOrbF/exec
```

4. ✅ Chọn tất cả 3 environments:
   - Production
   - Preview  
   - Development

5. Click **"Save"**

### Bước 3: Verify URL

**QUAN TRỌNG:** Copy lại Value vừa paste, mở tab mới và truy cập URL đó.

Phải thấy:
```json
{
  "status": "ok",
  "message": "NAK Payslip Service is running",
  "timestamp": "2026-02-12T..."
}
```

Nếu thấy "Không tìm thấy trang" → URL SAI, làm lại!

### Bước 4: Redeploy

Có 2 cách:

**Cách 1: Từ Vercel**
1. Tab **Deployments**
2. Click deployment mới nhất
3. Menu **"..."** → **"Redeploy"**
4. Confirm

**Cách 2: Trigger bằng commit**
```bash
git commit --allow-empty -m "trigger redeploy after fixing GAS_WEB_APP_URL"
git push origin main
```

### Bước 5: Test lại

Sau khi deploy xong (~2 phút):

```bash
# 1. Kiểm tra env có đúng không
curl https://nak-logistic-system.vercel.app/api/debug/env | jq '.environment.gasWebAppUrl'

# Phải thấy: "https://script.google.com/macros/s/AKfycbx268J5Oewi7pRC03CSaLH1n3tsnoM4MyRJUkRbGooag4OWysPolX9JbPgfYALnOrbF/exec..."
```

```bash
# 2. Test GAS URL trực tiếp
curl https://script.google.com/macros/s/AKfycbx268J5Oewi7pRC03CSaLH1n3tsnoM4MyRJUkRbGooag4OWysPolX9JbPgfYALnOrbF/exec

# Phải thấy: {"status":"ok","message":"NAK Payslip Service is running",...}
```

```bash
# 3. Test trên production
# Truy cập: https://nak-logistic-system.vercel.app/salary
# Click test email → Nhập dtnam@nakvn.com → Gửi
```

### Bước 6: Kiểm tra GAS Logs

Sau khi test email trên production:

1. Mở https://script.google.com/home/executions
2. Phải thấy entry mới: **doPost** với status **Completed**
3. Click vào để xem logs chi tiết

---

## 🔧 Debugging

### Nếu vẫn không thấy doPost trong GAS logs:

**1. Kiểm tra Network tab trong browser:**
- Mở F12 → Network
- Test email
- Tìm request đến `/api/salary/resend-payslip`
- Xem response có lỗi gì không

**2. Kiểm tra Vercel Runtime Logs:**
- Vercel Dashboard → Deployment → Runtime Logs
- Tìm request khi test email
- Xem có log `"Sending payslip data to GAS..."` không
- Xem GAS response là gì

**3. Test trực tiếp bằng curl:**
```bash
# Tạo test data
cat > /tmp/test-payslip.json << 'EOF'
{
  "recipientEmail": "dtnam@nakvn.com",
  "recipientName": "Test User",
  "month": 2,
  "year": 2026,
  "ma_nhan_vien": "TEST001",
  "ten_nhan_vien": "Test User",
  "thang": 2,
  "nam": 2026,
  "luong_bat_dau": 10000000,
  "tong_thu_nhap": 10000000,
  "tong_khau_tru": 0,
  "luong_thuc_lanh": 10000000,
  "tong_luong_chuyen": 0,
  "luongChuyen": []
}
EOF

# Gửi trực tiếp đến GAS
curl -X POST \
  https://script.google.com/macros/s/AKfycbx268J5Oewi7pRC03CSaLH1n3tsnoM4MyRJUkRbGooag4OWysPolX9JbPgfYALnOrbF/exec \
  -H "Content-Type: application/json" \
  -d @/tmp/test-payslip.json

# Phải thấy: {"success":true}
# Và trong GAS logs phải có doPost entry
```

---

## 📋 Checklist

Sau khi fix xong, verify:

- [ ] Environment variable `GAS_WEB_APP_URL` có đúng URL (101 ký tự)
- [ ] Truy cập URL trực tiếp thấy `{"status":"ok"...}`  
- [ ] Redeploy Vercel thành công
- [ ] API debug endpoint trả về URL đúng
- [ ] Test email trên production thành công
- [ ] GAS execution logs thấy `doPost` entry mới
- [ ] Nhận được email với 2 PDF đính kèm

---

## 🎯 URL Reference

**GAS Web App URL (CHÍNH XÁC):**
```
https://script.google.com/macros/s/AKfycbx268J5Oewi7pRC03CSaLH1n3tsnoM4MyRJUkRbGooag4OWysPolX9JbPgfYALnOrbF/exec
```

**Deployment ID:** `AKfycbx268J5Oewi7pRC03CSaLH1n3tsnoM4MyRJUkRbGooag4OWysPolX9JbPgfYALnOrbF`

**Length:** 71 characters (deployment ID only)

---

## 📞 Support

Nếu sau khi fix vẫn lỗi:
1. Check Vercel logs: https://vercel.com/dam-thanh-nams-projects/nak-logistic-system
2. Check GAS logs: https://script.google.com/home/executions
3. Share screenshot của cả 2 logs

Email: dtnam@nakvn.com
