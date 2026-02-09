# PostgreSQL Server Configuration for Vercel

## Problem
Vercel deployments fail with:
```
no pg_hba.conf entry for host "54.91.100.16", user "nak_user", database "nak_vn"
```

## Solution: Configure pg_hba.conf

### Step 1: SSH to PostgreSQL Server
```bash
ssh user@163.223.12.189
```

### Step 2: Edit pg_hba.conf
```bash
sudo nano /etc/postgresql/17/main/pg_hba.conf
```

### Step 3: Add Vercel Access Rule

**Option A: Allow all IPs (Quickest for testing)**
```conf
# Add this line at the end
host    nak_vn          nak_user        0.0.0.0/0               md5
```

**Option B: Allow specific Vercel IP ranges (More secure)**
```conf
# Vercel uses AWS US-EAST-1 region
# Add these lines:
host    nak_vn          nak_user        54.0.0.0/8              md5
host    nak_vn          nak_user        52.0.0.0/8              md5
host    nak_vn          nak_user        34.0.0.0/8              md5
```

**Option C: Use SSL (Most secure)**
```conf
# Replace 'host' with 'hostssl' to require SSL
hostssl nak_vn          nak_user        0.0.0.0/0               md5
```

### Step 4: Reload PostgreSQL
```bash
sudo systemctl reload postgresql
```

Or restart if reload doesn't work:
```bash
sudo systemctl restart postgresql
```

### Step 5: Verify Configuration
```bash
# Check if PostgreSQL is listening on all interfaces
sudo netstat -plnt | grep postgres

# Expected output should show:
# tcp  0.0.0.0:5432  (listening on all IPs)
```

### Step 6: Test Connection from External IP
From your local machine:
```bash
psql "postgresql://nak_user:Nak_Str0ng_2026@163.223.12.189:5432/nak_vn"
```

## Firewall Check

Make sure firewall allows PostgreSQL port:
```bash
sudo ufw status
sudo ufw allow 5432/tcp  # If not already allowed
```

## PostgreSQL Listen Address

Edit postgresql.conf to listen on all interfaces:
```bash
sudo nano /etc/postgresql/17/main/postgresql.conf

# Find and change:
listen_addresses = '*'  # was 'localhost'

# Restart PostgreSQL
sudo systemctl restart postgresql
```

## Security Note

⚠️ **IMPORTANT**: Allowing 0.0.0.0/0 means ANY IP can attempt to connect.
Make sure you have:
- Strong password (Nak_Str0ng_2026 ✓)
- Firewall rules limiting access
- Regular security audits
- Consider using SSL for encryption

## Quick Fix for Testing

If you just want to test quickly:
```bash
# 1. Allow all IPs
echo "host nak_vn nak_user 0.0.0.0/0 md5" | sudo tee -a /etc/postgresql/17/main/pg_hba.conf

# 2. Reload
sudo systemctl reload postgresql

# 3. Test from Vercel (trigger redeploy)
```

## Troubleshooting

If still failing:
1. Check PostgreSQL logs: `sudo tail -100 /var/log/postgresql/postgresql-17-main.log`
2. Verify user exists: `sudo -u postgres psql -c "\du nak_user"`
3. Check database exists: `sudo -u postgres psql -c "\l nak_vn"`
4. Test password: `psql "postgresql://nak_user:Nak_Str0ng_2026@163.223.12.189:5432/nak_vn" -c "SELECT 1"`
