# 🚨 QUICK FIX - Vercel Build Error

## Vấn đề hiện tại:
Vercel build vẫn fail vì đang build code cũ hoặc thiếu environment variables.

---

## ✅ GIẢI PHÁP - Làm ngay 3 bước này:

### **Bước 1: Kiểm tra Environment Variables trên Vercel**

Truy cập: https://vercel.com/dtnam-oss/nak-system/settings/environment-variables

**PHẢI CÓ một trong hai biến sau (hoặc cả hai):**

**Option A: Dùng POSTGRES_URL (Khuyến nghị)**
```
POSTGRES_URL=postgresql://postgres:123@163.223.12.189:5432/nak_vn
```

**Option B: Hoặc đổi tên DATABASE_URL (nếu đang có)**
- Nếu bạn đã có `DATABASE_URL` trên Vercel
- Click Edit
- Đổi value thành: `postgresql://postgres:123@163.223.12.189:5432/nak_vn`

**⚠️ LƯU Ý:** Code mới đã support cả 2 biến (POSTGRES_URL ưu tiên trước)

---

### **Bước 2: Force Rebuild trên Vercel**

**Option A: Redeploy từ Vercel Dashboard**
1. Vào https://vercel.com/dtnam-oss/nak-system
2. Click tab "Deployments"
3. Tìm deployment mới nhất (có commit "chore: trigger Vercel rebuild")
4. Click "..." (3 dots)
5. Click "Redeploy"
6. ✅ **QUAN TRỌNG:** Bỏ check "Use existing Build Cache"
7. Click "Redeploy"

**Option B: Push empty commit (đã làm rồi)**
```bash
# Đã chạy lệnh này rồi
git commit --allow-empty -m "force rebuild"
git push origin main
```

---

### **Bước 3: Kiểm tra Build Log**

1. Vào Vercel Dashboard > Deployments
2. Click vào deployment mới nhất
3. Xem Build Logs
4. Nếu thấy lỗi ở line 118 của employees/route.ts nghĩa là vẫn đang build code cũ

**✅ Build thành công khi thấy:**
```
✓ Compiled successfully in X.Xs
✓ Generating static pages
✓ Finalizing page optimization
```

---

## 🔍 KIỂM TRA SAU KHI DEPLOY

### 1. Test Environment Variables
```bash
curl https://nak-system.vercel.app/api/debug/env
```

**Expected response:**
```json
{
  "success": true,
  "environment": {
    "hasPostgresUrl": true,
    "hasDatabaseUrl": true,
    "hasGasApiUrl": true,
    "hasTelegramToken": true,
    ...
  }
}
```

### 2. Test Database Connection
```bash
curl https://nak-system.vercel.app/api/health/database
```

**Expected response:**
```json
{
  "status": "healthy",
  "database": "connected"
}
```

### 3. Test API
```bash
curl https://nak-system.vercel.app/api/reconciliation?limit=5
```

---

## 🐛 NẾU VẪN LỖI

### Lỗi: "This expression is not callable" ở line 118

**Nguyên nhân:** Vercel đang build từ commit cũ

**Giải pháp:**
1. Đảm bảo latest commit là: `e2b11ee` hoặc mới hơn
2. Force redeploy WITHOUT cache (quan trọng!)
3. Đợi 1-2 phút để Vercel update

### Lỗi: "Failed to connect to database"

**Nguyên nhân:** 
- Thiếu POSTGRES_URL hoặc DATABASE_URL
- Hoặc value sai

**Giải pháp:**
1. Kiểm tra biến trên Vercel Dashboard
2. Value phải là: `postgresql://postgres:123@163.223.12.189:5432/nak_vn`
3. Đảm bảo apply cho "Production" environment
4. Redeploy

### Lỗi: Build timeout

**Giải pháp:**
1. Xóa tất cả deployments cũ trên Vercel
2. Redeploy từ đầu
3. Nếu vẫn timeout, contact Vercel support

---

## 📊 COMMITS ĐÃ FIX

1. ✅ `eb13d4c` - Fix: Replace sql.query() with query()
2. ✅ `6eafbd4` - Fix: Add empty params array to query()
3. ✅ `51a8aaf` - Trigger rebuild
4. ✅ `e2b11ee` - Add DATABASE_URL fallback + debug endpoint

---

## 💡 TẠI SAO LỖI?

1. **TypeScript error:** `sql.query()` không tồn tại trong lib/db.ts
   - ✅ Đã fix: Import và dùng `query()` function

2. **Missing params:** `query()` cần 2 parameters
   - ✅ Đã fix: Thêm `[]` cho queries không có params

3. **Vercel build cache:** Build từ code cũ
   - ✅ Đã fix: Force rebuild bằng empty commit

4. **Environment variable:** Có thể thiếu POSTGRES_URL
   - ✅ Đã fix: Support cả DATABASE_URL fallback

---

## 🎯 NEXT STEPS

Sau khi build thành công:

1. ✅ Test database connection: `/api/health/database`
2. ✅ Test reconciliation API: `/api/reconciliation`
3. ✅ Test dashboard: `/api/dashboard/stats`
4. ✅ Test Telegram bot: Send `/start` to bot
5. ✅ Setup Telegram webhook: `npm run telegram:setup`

---

## 📞 CẦN HỖ TRỢ?

Nếu sau 3 bước trên vẫn lỗi, gửi screenshot của:
1. Vercel Build Logs (full log)
2. Environment Variables list
3. Latest commit hash trong Vercel deployment

---

**Created:** January 23, 2026  
**Last Updated:** Just now  
**Status:** ✅ All fixes pushed to GitHub
