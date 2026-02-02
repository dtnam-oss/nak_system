# LOGIN ERROR FIX - Troubleshooting Guide

## Vấn đề
Lỗi "Đã xảy ra lỗi trong quá trình đăng nhập" khi user cố đăng nhập vào hệ thống.

## Nguyên nhân có thể
1. **Database Connection Issue**: Vercel không thể kết nối đến self-hosted PostgreSQL database
2. **Environment Variables**: Thiếu hoặc sai cấu hình POSTGRES_URL trên Vercel
3. **Firewall/Network**: IP của Vercel bị chặn bởi firewall của database server
4. **Authentication Issue**: Lỗi khi tạo session hoặc JWT token

## Các thay đổi đã thực hiện

### 1. Cải thiện Database Connection (`lib/db.ts`)
- Sử dụng environment variable `POSTGRES_URL` thay vì hardcode
- Thêm fallback nếu không có env var
- Thêm logging chi tiết hơn về database connection

### 2. Cải thiện Error Handling (`app/api/auth/login/route.ts`)
- Thêm logging chi tiết cho mọi bước của login flow
- Kiểm tra null-safe cho `phanQuyen` field
- Error messages cụ thể hơn (database connection, timeout, etc.)
- Trả về error details khi ở development mode

### 3. Health Check Endpoint (`app/api/health/route.ts`)
- Tạo endpoint `/api/health` để test database connection
- Giúp debug nhanh chóng nếu có vấn đề về connection

## Cách kiểm tra

### 1. Test Database Connection
```bash
curl https://nak-logistic-system.vercel.app/api/health
```

Nếu kết quả là:
```json
{
  "status": "healthy",
  "database": "connected",
  ...
}
```
=> Database OK

Nếu kết quả là:
```json
{
  "status": "unhealthy",
  "database": "disconnected",
  "error": "..."
}
```
=> Database có vấn đề

### 2. Test Login API
```bash
curl -X POST https://nak-logistic-system.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dtnam@nakvn.com"}'
```

### 3. Xem Vercel Logs
1. Vào Vercel Dashboard
2. Chọn project `nak-logistic-system`
3. Vào tab "Logs"
4. Filter bởi `/api/auth/login`
5. Xem error logs chi tiết

## Giải pháp

### Nếu lỗi Database Connection

#### Option 1: Whitelist Vercel IPs
Vercel deploy trên nhiều regions, cần whitelist tất cả IPs của Vercel:
```bash
# Trên database server (163.223.12.189)
# Edit pg_hba.conf để cho phép connections từ Vercel
# Hoặc mở firewall cho Vercel IPs
```

#### Option 2: Sử dụng Database Proxy
Sử dụng connection pooler như PgBouncer hoặc Vercel Postgres Proxy

#### Option 3: Migration sang Managed Database
Migrate database sang Vercel Postgres, Supabase, hoặc Neon để tránh network issues

### Nếu lỗi Environment Variables

1. Vào Vercel Dashboard → Settings → Environment Variables
2. Kiểm tra `POSTGRES_URL` có giá trị:
   ```
   postgresql://postgres:123@163.223.12.189:5432/nak_vn
   ```
3. Nếu chưa có, thêm vào
4. Redeploy application

### Nếu lỗi khác

Check Vercel logs để xem error cụ thể và debug từ đó.

## Testing Local

```bash
# Set environment variable
export POSTGRES_URL="postgresql://postgres:123@163.223.12.189:5432/nak_vn"

# Run dev server
pnpm dev

# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dtnam@nakvn.com"}'
```

## Deployment

Sau khi fix, deploy lên Vercel:

```bash
git add .
git commit -m "fix: improve login error handling and database connection"
git push
```

Vercel sẽ tự động deploy.

## Monitoring

Sau khi deploy, monitor:
1. `/api/health` endpoint
2. Vercel logs khi user login
3. User feedback về login issues
