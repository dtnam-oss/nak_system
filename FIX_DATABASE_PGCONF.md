# 🔧 HƯỚNG DẪN FIX LỖI DATABASE CONNECTION TỪ VERCEL

## ❌ Lỗi hiện tại
```
no pg_hba.conf entry for host "44.203.160.114", user "nak_user", database "nak_vn", SSL encryption
```

**Nguyên nhân:** PostgreSQL server (`163.223.12.189`) không cho phép Vercel servers kết nối.

---

## ✅ GIẢI PHÁP: Cấu hình PostgreSQL pg_hba.conf

### Bước 1: SSH vào Database Server

```bash
ssh your-user@163.223.12.189
```

### Bước 2: Backup file cấu hình hiện tại

```bash
sudo cp /etc/postgresql/*/main/pg_hba.conf /etc/postgresql/*/main/pg_hba.conf.backup
```

### Bước 3: Edit pg_hba.conf

```bash
sudo nano /etc/postgresql/*/main/pg_hba.conf
```

### Bước 4: Thêm rule cho Vercel

Thêm dòng sau vào cuối file:

```conf
# Allow Vercel servers to connect
host    nak_vn          nak_user        0.0.0.0/0               scram-sha-256
```

**Lưu ý:**
- `0.0.0.0/0` cho phép TẤT CẢ các IP kết nối (không an toàn nhất nhưng đơn giản)
- Vercel sử dụng nhiều IP động nên khó whitelist cụ thể
- Nếu muốn bảo mật hơn, có thể giới hạn theo CIDR range của AWS (Vercel chạy trên AWS)

### Bước 5: Kiểm tra SSL configuration

```bash
sudo nano /etc/postgresql/*/main/postgresql.conf
```

Tìm và đảm bảo:
```conf
ssl = on
ssl_cert_file = '/etc/ssl/certs/ssl-cert-snakeoil.pem'
ssl_key_file = '/etc/ssl/private/ssl-cert-snakeoil.key'
```

### Bước 6: Restart PostgreSQL

```bash
sudo systemctl restart postgresql
```

Kiểm tra status:
```bash
sudo systemctl status postgresql
```

### Bước 7: Kiểm tra Firewall

```bash
# Ubuntu/Debian
sudo ufw status
sudo ufw allow 5432/tcp

# hoặc CentOS/RHEL
sudo firewall-cmd --permanent --add-port=5432/tcp
sudo firewall-cmd --reload
```

---

## 🧪 TEST KẾT NỐI

### Test từ máy local (ngoài server)

```bash
psql "postgresql://nak_user:Nak_Str0ng_2026@163.223.12.189:5432/nak_vn?sslmode=require"
```

Nếu kết nối thành công → Ready!

### Test từ Vercel Production

```bash
curl https://nak-logistic-system.vercel.app/api/test-db
```

Kết quả mong đợi:
```json
{
  "success": true,
  "connected": true,
  "logs": [...]
}
```

### Test Dashboard

```bash
curl https://nak-logistic-system.vercel.app/api/dashboard/telegram-stats
```

---

## 🔒 BẢO MẬT HƠN: Giới hạn IP Vercel (Tùy chọn)

Vercel sử dụng AWS Regions. Nếu bạn biết region của Vercel deployment:

### AWS IP Ranges cho các region phổ biến:

**US-East-1 (Virginia) - Vercel primary region:**
```conf
# Vercel US-East-1
host    nak_vn    nak_user    44.192.0.0/10      scram-sha-256
host    nak_vn    nak_user    52.0.0.0/11        scram-sha-256
```

**EU-West-1 (Ireland):**
```conf
host    nak_vn    nak_user    54.72.0.0/13       scram-sha-256
```

Tham khảo đầy đủ: https://docs.aws.amazon.com/general/latest/gr/aws-ip-ranges.html

---

## 🚨 LƯU Ý BẢO MẬT

**⚠️ Mở public database (0.0.0.0/0) có rủi ro:**
- Bất kỳ ai biết credentials đều có thể kết nối
- Dễ bị brute-force attack

**Khuyến nghị:**
1. ✅ Dùng password mạnh (đã có: `Nak_Str0ng_2026`)
2. ✅ Giới hạn permissions của user `nak_user` (chỉ read/write tables cần thiết)
3. ✅ Enable SSL/TLS (đã bật)
4. ✅ Sử dụng connection pooling (đã có trong code)
5. ✅ Monitor logs thường xuyên
6. 🔄 Đổi password định kỳ
7. 🔄 Giới hạn IP nếu có thể (AWS IP ranges)

---

## 🎯 GIẢI PHÁP DỰ PHÒNG

Nếu **KHÔNG THỂ** mở public database (do chính sách công ty):

### Option A: Migrate sang Managed Database
- **Neon** (free tier)
- **Supabase** (free tier)  
- **Railway** ($5/month)
- **Render PostgreSQL** ($7/month)

### Option B: Database Proxy
- Sử dụng **Cloudflare Tunnel**
- Hoặc **ngrok** (paid)

### Option C: VPN giữa Vercel và Database Server
- Cần setup phức tạp hơn
- Chi phí cao

---

## 📋 CHECKLIST

- [ ] SSH vào database server
- [ ] Backup pg_hba.conf
- [ ] Thêm rule cho Vercel
- [ ] Restart PostgreSQL
- [ ] Mở firewall port 5432
- [ ] Test connection từ external
- [ ] Test Vercel API: `/api/test-db`
- [ ] Test Dashboard: `/api/dashboard/telegram-stats`
- [ ] Verify dashboard loads trên browser

---

## 📞 Nếu cần hỗ trợ thêm

Liên hệ admin database server để:
1. Cấu hình pg_hba.conf
2. Mở firewall/security group
3. Hoặc setup VPN/proxy nếu cần

---

**Created:** 2026-02-09
**Status:** ⏳ Waiting for Database Server Configuration
