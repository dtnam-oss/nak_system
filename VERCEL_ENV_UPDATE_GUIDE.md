# Cập nhật Environment Variables trên Vercel

## ⚠️ QUAN TRỌNG: Thêm GAS_WEB_APP_URL vào Vercel

Code đã được push lên GitHub, nhưng **production vẫn thiếu biến môi trường** `GAS_WEB_APP_URL`.

---

## 🚀 Các bước thực hiện

### Bước 1: Mở Vercel Dashboard

1. Truy cập: https://vercel.com
2. Đăng nhập
3. Chọn project: **nak-logistic-system**

### Bước 2: Thêm Environment Variable

1. Click tab **Settings** (⚙️)
2. Chọn menu **Environment Variables** bên trái
3. Click button **"Add New"**
4. Điền thông tin:

```
Key: GAS_WEB_APP_URL
Value: https://script.google.com/macros/s/AKfycbx268J5Oewi7pRC03CSaLH1n3tsnoM4MyRJUkRbGooag4OWysPolX9JbPgfYALnOrbF/exec
```

5. **Chọn Environment:**
   - ✅ Production
   - ✅ Preview
   - ✅ Development

6. Click **"Save"**

### Bước 3: Re-deploy

Có 2 cách:

**Cách 1: Redeploy từ Vercel Dashboard**
1. Vào tab **Deployments**
2. Tìm deployment mới nhất
3. Click menu **"..."** (3 chấm)
4. Chọn **"Redeploy"**
5. Click **"Redeploy"** để confirm

**Cách 2: Push commit mới**
```bash
git commit --allow-empty -m "trigger redeploy"
git push origin main
```

### Bước 4: Kiểm tra Deployment

1. Đợi deployment hoàn tất (~2-3 phút)
2. Truy cập: https://nak-logistic-system.vercel.app/salary
3. Chọn tháng có data
4. Click ✉️ test email
5. Nhập email: `dtnam@nakvn.com`
6. Click "Gửi test email"

**Kết quả mong đợi:**
- ✅ Không còn lỗi "GAS_WEB_APP_URL not configured"
- ✅ Email được gửi thành công
- ✅ Nhận email với 2 PDF đính kèm

---

## 🔍 Troubleshooting

### Lỗi vẫn còn sau khi deploy?

**1. Kiểm tra Environment Variables đã được set:**
- Vào Settings → Environment Variables
- Tìm `GAS_WEB_APP_URL`
- Verify value đúng URL

**2. Kiểm tra Deployment đã dùng env mới:**
- Vào tab Deployments
- Click vào deployment mới nhất
- Scroll xuống **"Environment Variables"**
- Xem có `GAS_WEB_APP_URL` không

**3. Google Apps Script chưa deploy đúng:**
- Test GAS bằng cách truy cập URL trong browser
- Phải thấy: `{"status":"ok","message":"NAK Payslip Service is running",...}`
- Nếu thấy `{"success":false,"error":"Missing action parameter"}` → chưa deploy đúng script
- Xem hướng dẫn trong: [FIX_EMAIL_TEST_ERROR.md](FIX_EMAIL_TEST_ERROR.md)

### Cách test nhanh sau khi deploy:

```bash
# Test production endpoint
curl https://nak-logistic-system.vercel.app/api/health
```

---

## 📋 Checklist

Trước khi test, đảm bảo:

- ✅ Code đã push lên GitHub (commit: 6ba2d51)
- ✅ Biến `GAS_WEB_APP_URL` đã thêm vào Vercel
- ✅ Deployment mới đã hoàn tất
- ✅ Google Apps Script đã deploy đúng script `payslip-service.gs`
- ✅ GAS có quyền truy cập Google Docs templates

---

## 🎯 Tóm tắt

**Đã làm:**
1. ✅ Push code lên GitHub (commit: 6ba2d51)
2. ✅ Thêm GAS scripts và documentation

**Cần làm tiếp:**
1. ⚠️ Thêm `GAS_WEB_APP_URL` vào Vercel Environment Variables
2. ⚠️ Redeploy Vercel
3. ✅ Test lại trên production

---

## 📞 Support

Nếu gặp vấn đề:
1. Check Vercel deployment logs
2. Check browser console (F12) khi test
3. Check Google Apps Script execution logs

Email: dtnam@nakvn.com
