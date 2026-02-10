# 🚨 QUICK FIX: Dashboard không load dữ liệu

## Vấn đề
```
Lỗi dữ liệu
Failed to fetch dashboard data
```

## Nguyên nhân
PostgreSQL server **không cho phép** Vercel kết nối:
```
no pg_hba.conf entry for host "44.203.160.114"
```

## Giải pháp (5 phút)

### Trên Database Server (163.223.12.189):

```bash
# 1. SSH vào server
ssh user@163.223.12.189

# 2. Edit pg_hba.conf
sudo nano /etc/postgresql/*/main/pg_hba.conf

# 3. Thêm dòng này ở cuối file:
host    nak_vn    nak_user    0.0.0.0/0    scram-sha-256

# 4. Restart PostgreSQL
sudo systemctl restart postgresql

# 5. Mở firewall
sudo ufw allow 5432/tcp
```

### Kiểm tra:

```bash
# Test connection
curl https://nak-logistic-system.vercel.app/api/test-db

# Test dashboard
curl https://nak-logistic-system.vercel.app/api/dashboard/telegram-stats
```

## ✅ Done!

Refresh browser: https://nak-logistic-system.vercel.app/dashboard

---

Chi tiết đầy đủ: [FIX_DATABASE_PGCONF.md](FIX_DATABASE_PGCONF.md)
