# Fix Vercel Database Connection Error

## Vấn đề
Dashboard trên Vercel (nak-logistic-system.vercel.app) không load được dữ liệu với lỗi:
```
Lỗi dữ liệu
Failed to fetch dashboard data
```

## Nguyên nhân
Vercel production server không thể kết nối đến self-hosted PostgreSQL database tại `163.223.12.189:5432`

## Kiểm tra nhanh
API endpoint hoạt động tốt trên localhost:
```bash
curl http://localhost:3000/api/dashboard/telegram-stats
# ✅ Trả về dữ liệu đầy đủ
```

Nhưng trên Vercel production:
```bash
curl https://nak-logistic-system.vercel.app/api/dashboard/telegram-stats
# ❌ Có thể timeout hoặc connection error
```

## Các giải pháp

### ✅ Giải pháp 1: Cấu hình Firewall cho Database Server (Khuyến nghị)

#### Bước 1: Mở port PostgreSQL cho Vercel

Database server (`163.223.12.189`) cần cho phép kết nối từ Vercel servers. Vercel sử dụng dynamic IPs nên bạn có 2 lựa chọn:

**Cách A: Mở public (Không khuyến nghị cho production)**
```bash
# Trên database server
sudo ufw allow 5432/tcp
# hoặc
sudo iptables -A INPUT -p tcp --dport 5432 -j ACCEPT
```

**Cách B: Sử dụng Vercel Edge Network với IP allowlist**

Tham khảo: https://vercel.com/docs/edge-network/regions

Hoặc liên hệ admin database server để cấu hình security group.

#### Bước 2: Kiểm tra PostgreSQL config

Đảm bảo PostgreSQL cho phép remote connections:

```bash
# File: /etc/postgresql/*/main/postgresql.conf
listen_addresses = '*'  # hoặc '0.0.0.0'

# File: /etc/postgresql/*/main/pg_hba.conf
# Thêm dòng:
host    all             all             0.0.0.0/0               md5
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

#### Bước 3: Test connection từ external

```bash
# Từ máy khác (không phải localhost)
psql "postgresql://nak_user:Nak_Str0ng_2026@163.223.12.189:5432/nak_vn"
```

---

### ✅ Giải pháp 2: Sử dụng Database Cloud có Vercel Integration

Chuyển sang managed database service hỗ trợ Vercel:

1. **Neon** (đã từng dùng)
2. **Supabase**
3. **PlanetScale**
4. **Railway**
5. **Render PostgreSQL**

Các service này có built-in Vercel integration và không có vấn đề firewall.

---

### ✅ Giải pháp 3: Sử dụng Vercel KV/Postgres (Neon)

Vercel cung cấp managed database tích hợp sẵn.

---

### ✅ Giải pháp 4: Database Proxy/Tunnel

Sử dụng service như **ngrok** hoặc **Cloudflare Tunnel** để expose database:

```bash
# Ví dụ với Cloudflare Tunnel
cloudflared tunnel --url postgresql://163.223.12.189:5432
```

Nhưng giải pháp này tốn phí và phức tạp hơn.

---

## Kiểm tra Environment Variables trên Vercel

Đảm bảo Vercel có đúng environment variables:

### Truy cập Vercel Dashboard:
1. Vào: https://vercel.com/[your-team]/nak-logistic-system
2. Settings → Environment Variables

### Thêm/Cập nhật:
```bash
POSTGRES_URL=postgresql://nak_user:Nak_Str0ng_2026@163.223.12.189:5432/nak_vn
```

### Redeploy sau khi update env:
```bash
# Trong terminal local
git commit --allow-empty -m "redeploy: update env vars"
git push origin main
```

---

## Test Connection từ Vercel

Tạo test API endpoint để debug:

```typescript
// app/api/test-db/route.ts
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const result = await sql`SELECT NOW() as current_time, version() as pg_version`;
    return NextResponse.json({
      success: true,
      connected: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      connected: false,
      error: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
```

Sau đó test:
```bash
curl https://nak-logistic-system.vercel.app/api/test-db
```

---

## Khuyến nghị Cuối cùng

Nếu database `163.223.12.189` là **on-premise** hoặc **behind corporate firewall**:

→ **Nên chuyển sang managed database cloud** (Neon, Supabase, etc.) để tránh vấn đề network phức tạp.

Nếu **bắt buộc phải dùng self-hosted**:

→ Cần cấu hình **VPN** hoặc **private networking** giữa Vercel và database server.

---

## Status Check

```bash
# Local (working)
✅ curl http://localhost:3000/api/dashboard/telegram-stats

# Production (needs fix)
❌ curl https://nak-logistic-system.vercel.app/api/dashboard/telegram-stats
```
