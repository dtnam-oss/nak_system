# ⚠️ CRITICAL: Vercel Environment Variable Fix Required

**Date:** February 6, 2026  
**Issue:** Fuel page shows "Failed to fetch fuel stats"  
**Status:** 🔴 Action Required

---

## 🔍 Root Cause

The production app on Vercel is connecting to **Neon database (old)** instead of **self-hosted PostgreSQL (new)**.

### Evidence:
- Local `.env.local` has duplicate `POSTGRES_URL` entries
- The second entry (Neon) overrides the first (self-hosted)
- Vercel production environment likely has `POSTGRES_URL` pointing to Neon
- Neon database does NOT have fuel tables (`nhap_nhien_lieu`, `xuat_nhien_lieu`)

---

## ✅ Solution

### Step 1: Update Vercel Environment Variables

Go to: https://vercel.com/your-project/settings/environment-variables

**Update these variables:**

```bash
# CRITICAL: Update this variable
POSTGRES_URL=postgresql://postgres:123@163.223.12.189:5432/nak_vn

# Optional: Add dedicated variable (recommended)
SELF_HOSTED_POSTGRES_URL=postgresql://postgres:123@163.223.12.189:5432/nak_vn
```

**Delete these old Neon variables (if exist):**
- `POSTGRES_URL` (Neon endpoint)
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NO_SSL`

### Step 2: Redeploy

After updating env vars:
1. Go to Vercel Dashboard
2. Redeploy latest commit (c913b03)
3. Wait for deployment to complete

### Step 3: Verify

Open production URL: `https://nak-logistic-system.vercel.app/fuel`

Expected result:
- ✅ No "Failed to fetch fuel stats" error
- ✅ KPI cards show fuel data
- ✅ Tables populate with imports and transactions

---

## 🗄️ Database Details

### Self-Hosted PostgreSQL (CORRECT ✅)
```
Host: 163.223.12.189
Port: 5432
Database: nak_vn
User: postgres
Password: 123
```

**Has these tables:**
- ✅ `nhap_nhien_lieu` (fuel imports)
- ✅ `xuat_nhien_lieu` (fuel transactions)
- ✅ `chuyen_di` (trips)
- ✅ `chi_tiet_chuyen_di` (trip details)
- ✅ `phuong_tien` (vehicles)
- ✅ `nhan_vien` (employees)

### Neon Database (WRONG ❌)
```
Host: ep-nameless-term-a1ne27mg-pooler.ap-southeast-1.aws.neon.tech
Database: neondb
User: neondb_owner
```

**Does NOT have:**
- ❌ Fuel tables
- ❌ Updated schema
- ❌ Recent data

---

## 📋 Checklist

- [ ] Update `POSTGRES_URL` in Vercel env vars
- [ ] Remove old Neon env vars from Vercel
- [ ] Redeploy on Vercel
- [ ] Test `/fuel` page in production
- [ ] Test `/vehicles` page in production
- [ ] Test `/dashboard` stats
- [ ] Clean up local `.env.local` (remove duplicate POSTGRES_URL)

---

## 🔧 Local Development Fix

Edit `.env.local` to have only ONE `POSTGRES_URL`:

```bash
# Keep this one (self-hosted)
POSTGRES_URL=postgresql://postgres:123@163.223.12.189:5432/nak_vn

# Delete all these (Neon - old database)
# POSTGRES_URL=postgresql://neondb_owner:...@ep-nameless-term-a1ne27mg-pooler...
# POSTGRES_URL_NON_POOLING=...
# POSTGRES_USER=neondb_owner
# POSTGRES_HOST=ep-nameless-term-a1ne27mg-pooler...
# POSTGRES_PASSWORD=npg_r6xwO7CLRESu
# POSTGRES_DATABASE=neondb
# POSTGRES_URL_NO_SSL=...
# POSTGRES_PRISMA_URL=...
```

---

## 🚀 After Fix

The fuel page should show:

**KPI Cards:**
- 📊 Tồn kho hiện tại: XXX lít
- 💰 Giá trị tồn kho: XXX VND
- 📈 Tiêu thụ tháng này: XXX lít
- 🔋 % Bình chứa: XX%

**Tables:**
- ✅ Nhật ký cấp dầu (transactions)
- ✅ Nhập kho (imports)
- ✅ Hiệu suất (performance)

---

**Commit:** c913b03  
**Priority:** 🔴 HIGH - Production Down  
**ETA:** 5 minutes (after Vercel env update)
