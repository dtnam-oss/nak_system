# Force Redeploy After Env Var Update

After updating `POSTGRES_URL` on Vercel, you MUST redeploy for changes to take effect.

## Quick Fix: Trigger Redeploy

### Option 1: Via Vercel Dashboard
1. Go to: https://vercel.com/dtnam-oss/nak-logistic-system/deployments
2. Click on the latest deployment
3. Click the "..." menu (3 dots)
4. Select "Redeploy"
5. Wait for deployment to complete (~2 minutes)

### Option 2: Via Git Push
Make a small change and push to trigger new deployment:

```bash
# Add a comment to trigger redeploy
git commit --allow-empty -m "chore: trigger redeploy after POSTGRES_URL update"
git push origin main
```

## Verify After Redeploy

1. Check Function Logs:
   - Go to Deployments → Latest → Functions
   - Look for: `🔌 [DB] Connection configured:`
   - Verify it shows: `Host: 163.223.12.189`

2. Test API:
   ```bash
   curl "https://nak-logistic-system.vercel.app/api/fuel/transactions?limit=1"
   ```

   Should return real data (not NULL).

3. Test in browser:
   - https://nak-logistic-system.vercel.app/fuel
   - Should show January 2026 data correctly

## Troubleshooting

If still returning NULL after redeploy:

### Check 1: Database Connection
The issue might be Vercel can't reach self-hosted database.

**Possible causes:**
- Firewall blocking Vercel IPs
- Database not allowing external connections
- Network timeout

**Test locally vs production:**
```bash
# Local works (we tested this)
node test-api-response.js

# Production fails (returns NULL)
curl "https://nak-logistic-system.vercel.app/api/fuel/transactions?limit=1"
```

### Check 2: Vercel Deployment Region
Vercel functions might be deployed in a region far from database (163.223.12.189 Vietnam).

**Solution:** Use Vercel Edge Network or deploy to closer region.

### Check 3: Connection Timeout
Self-hosted database might be slow to respond from Vercel's servers.

**In lib/db.ts:**
```typescript
connectionTimeoutMillis: 10000, // 10 seconds
```

Try increasing to 30000 (30 seconds) if needed.

---

**Created:** 2026-02-07
**Status:** Waiting for redeploy verification
