# 🔧 Vercel Database Connection Fix

## Current Issue
- Local: ✅ Works perfectly (connects to 163.223.12.189)
- Vercel: ❌ Returns NULL data (connection issue)

API Response from Vercel:
```json
{
  "success": true,
  "data": [{"id": null, "transaction_date": null, ...}]
}
```

## Root Cause Analysis

### Likely Issue: Network/Firewall
Vercel serverless functions (running in AWS US/EU regions) cannot reach the self-hosted PostgreSQL at `163.223.12.189:5432` in Vietnam.

**Evidence:**
1. Same query works locally ✅
2. Vercel returns NULL (query runs but gets no data)
3. No error messages (connection silently fails or connects to wrong DB)

## Solutions (Try in Order)

### Solution 1: Check PostgreSQL Allows Remote Connections

On the database server (163.223.12.189), verify:

**1. PostgreSQL config (`postgresql.conf`):**
```conf
listen_addresses = '*'  # Listen on all interfaces
port = 5432
```

**2. Allow remote connections (`pg_hba.conf`):**
```conf
# Allow connections from anywhere (adjust for security)
host    all             nak_user        0.0.0.0/0               md5
```

**3. Firewall allows port 5432:**
```bash
# On Ubuntu/Debian
sudo ufw allow 5432/tcp

# Check if port is open
sudo netstat -tulnp | grep 5432
```

**4. Restart PostgreSQL:**
```bash
sudo systemctl restart postgresql
```

### Solution 2: Use Vercel Postgres (Recommended for Production)

Instead of self-hosted, use Vercel's managed PostgreSQL:

1. Create Vercel Postgres: https://vercel.com/docs/storage/vercel-postgres
2. Migrate data from self-hosted to Vercel Postgres
3. Update `POSTGRES_URL` to Vercel Postgres connection string

**Pros:**
- ✅ Low latency (same region as Vercel functions)
- ✅ No firewall issues
- ✅ Automatic backups
- ✅ Scalable

**Cons:**
- 💰 Costs money (has free tier)

### Solution 3: Use Connection Proxy/Tunnel

If database must stay self-hosted, use a proxy:

**Option A: Ngrok or Cloudflare Tunnel**
```bash
# On database server
ngrok tcp 5432
# Get public URL and use in POSTGRES_URL
```

**Option B: SSH Tunnel**
Not practical for Vercel serverless (needs persistent connection)

### Solution 4: Increase Connection Timeout

Current timeout: 10 seconds
Try increasing to 30 seconds:

In `lib/db.ts`:
```typescript
const DB_CONFIG = {
  connectionString: SELF_HOSTED_POSTGRES_URL,
  ssl: false,
  max: 20,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000, // Increase from 10000 to 30000
  allowExitOnIdle: false,
};
```

### Solution 5: Add Database URL Env Var

Try using `DATABASE_URL` in addition to `POSTGRES_URL`:

In Vercel Environment Variables, add:
```
DATABASE_URL=postgresql://nak_user:123@163.223.12.189:5432/nak_vn
```

Some libraries check `DATABASE_URL` first.

## Debugging Steps

### 1. Check if Vercel can reach database
Add a test endpoint: `app/api/test-db/route.ts`

```typescript
import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await query('SELECT NOW(), version()', []);
    return NextResponse.json({
      success: true,
      connected: true,
      serverTime: result.rows[0].now,
      version: result.rows[0].version,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      connected: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
```

Test: `https://nak-logistic-system.vercel.app/api/test-db`

### 2. Check Vercel Function Logs
Look for:
- `🔌 [DB] Connection configured:`
- Error messages about connection
- Timeout errors

### 3. Test from different region
If you have access, test Vercel deployment in different regions to see if it's a network issue.

## Quick Test Commands

```bash
# Test from local (should work)
curl "http://localhost:3000/api/fuel/transactions?limit=1" | jq '.data[0].id'

# Test from Vercel (currently returns null)
curl "https://nak-logistic-system.vercel.app/api/fuel/transactions?limit=1" | jq '.data[0].id'

# Test database connection directly
psql "postgresql://nak_user:123@163.223.12.189:5432/nak_vn" -c "SELECT COUNT(*) FROM xuat_nhien_lieu WHERE id IS NOT NULL;"
```

## Recommendation

**For immediate fix:** Use Solution 1 (allow remote connections) if database is already on public IP

**For production:** Use Solution 2 (Vercel Postgres) for better performance and reliability

---

**Created:** 2026-02-07
**Status:** Diagnosing connection issue
