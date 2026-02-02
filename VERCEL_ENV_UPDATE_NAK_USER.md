# 🔄 VERCEL ENV UPDATE - nak_user Connection String

## ⚠️ BẮT BUỘC: Cập nhật biến môi trường trên Vercel

Database connection string đã được thay đổi từ user `postgres` sang `nak_user`.

### Các file đã cập nhật:
- ✅ [lib/db.ts](lib/db.ts) - Fallback connection string
- ✅ [.env.production](.env.production) - Production config
- ✅ [.env.migration.example](.env.migration.example) - Migration config
- ✅ Scripts: check-database-schema.ts, check-fuel-tables.ts, migrate_database.sh

### ✅ Connection đã được test:
```
✅ Connection successful!
User: nak_user
Database: nak_vn
Version: PostgreSQL 17.7
```

## 🚨 Hành động cần thực hiện NGAY

### Bước 1: Cập nhật Vercel Environment Variable

1. Vào Vercel Dashboard: https://vercel.com/dashboard
2. Chọn project `nak-logistic-system`
3. Vào **Settings** → **Environment Variables**
4. Tìm biến `POSTGRES_URL`
5. Click **Edit**
6. Đổi value thành:
   ```
   postgresql://nak_user:123@163.223.12.189:5432/nak_vn
   ```
7. Click **Save**

### Bước 2: Redeploy

Sau khi update env var, có 2 cách:

#### Cách 1: Tự động (đã push code rồi)
Vercel đang tự động deploy commit mới. Chờ deploy xong (~2 phút).

#### Cách 2: Force redeploy (nếu cần)
```bash
# Hoặc vào Vercel Dashboard → Deployments → Redeploy
```

### Bước 3: Verify

Sau khi deploy xong, test:

1. **Health check**:
   ```bash
   curl https://nak-logistic-system.vercel.app/api/health
   ```
   
   Kết quả mong đợi:
   ```json
   {
     "status": "healthy",
     "database": "connected",
     ...
   }
   ```

2. **Test login**:
   - Vào https://nak-logistic-system.vercel.app/login
   - Login với email: `dtnam@nakvn.com`
   - Nếu thành công → ✅ Hoàn tất!

### 🔍 Troubleshooting

#### Nếu gặp lỗi "connection refused" hoặc "authentication failed":

1. **Kiểm tra Vercel env var đã update chưa**:
   - Vào Settings → Environment Variables
   - Verify `POSTGRES_URL` có value: `postgresql://nak_user:123@163.223.12.189:5432/nak_vn`

2. **Kiểm tra user nak_user có quyền trên database**:
   ```sql
   -- Run trên database server
   GRANT ALL PRIVILEGES ON DATABASE nak_vn TO nak_user;
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO nak_user;
   GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO nak_user;
   ```

3. **Check Vercel logs**:
   - Vào Deployments → Latest deployment → Function Logs
   - Tìm `[DB] Connection configured` để xem có dùng đúng connection string không

### 📝 Connection String Info

**Cũ** (không dùng nữa):
```
postgresql://postgres:123@163.223.12.189:5432/nak_vn
```

**Mới** (đang dùng):
```
postgresql://nak_user:123@163.223.12.189:5432/nak_vn
```

**Thay đổi**: User từ `postgres` → `nak_user`

### ⏱️ Timeline

- ✅ Code updated: 2026-02-02
- ✅ Code pushed to GitHub: Done
- ⏳ Vercel auto deploy: In progress
- ⚠️ **TODO**: Update Vercel env var `POSTGRES_URL`
- ⚠️ **TODO**: Verify login works after deploy

---

**Note**: Nếu không update Vercel env var, app sẽ dùng fallback connection string trong code (đã updated), nhưng best practice là cập nhật env var để dễ quản lý.
