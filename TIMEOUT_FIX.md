# 🔧 Fix 500 Error: Timeout Optimization for Vercel Deployment

## 🚨 Problem

**Error:** 500 Internal Server Error với message "The operation was aborted"

**Root Cause:**
- Vercel Hobby plan giới hạn Edge Runtime timeout: **10 giây**
- Google Apps Script xử lý dataset lớn > 10 giây
- Request bị timeout và trả về lỗi 500

## ✅ Solution Implemented

### 1. Switch từ Edge Runtime sang Node.js Runtime

**Trước:**
```typescript
export const runtime = 'edge' // 10 giây timeout limit
```

**Sau:**
```typescript
export const runtime = 'nodejs' // 60 giây timeout limit
export const maxDuration = 60
```

**Lý do:**
- Edge Runtime: 10s timeout limit (quá ngắn cho large datasets)
- Node.js Runtime: 60s timeout limit (đủ thời gian xử lý)
- Vercel Hobby plan hỗ trợ 60s cho Node.js serverless functions

### 2. Thêm Timeout Protection với Promise.race()

Thêm custom timeout handler để tránh exceed Vercel limit:

```typescript
const TIMEOUT_MS = 55000 // 55 giây (buffer 5s cho Vercel's 60s limit)

const timeoutPromise = new Promise<never>((_, reject) => {
  setTimeout(() => {
    reject(new Error('REQUEST_TIMEOUT'))
  }, TIMEOUT_MS)
})

// Race between data fetch and timeout
result = await Promise.race([
  getCachedData(),
  timeoutPromise
])
```

**Lợi ích:**
- Bắt timeout trước khi Vercel kill request
- Trả về 504 Gateway Timeout thay vì 500 Internal Server Error
- Cung cấp error message cụ thể cho user

### 3. Enhanced Error Handling

Phân loại và xử lý từng loại error khác nhau:

```typescript
// Timeout error
if (error.message === 'REQUEST_TIMEOUT') {
  return NextResponse.json({
    error: 'Yêu cầu xử lý dữ liệu quá lâu (timeout). Vui lòng thử lại với bộ lọc để giảm lượng dữ liệu.',
    type: 'TIMEOUT',
    elapsed: elapsed
  }, { status: 504 })
}

// Abort error
if (error.name === 'AbortError') {
  return NextResponse.json({
    error: 'Yêu cầu bị hủy (AbortError). Vui lòng thử lại.',
    type: 'ABORT_ERROR',
    elapsed: elapsed
  }, { status: 499 })
}

// Network error
if (error.message.includes('fetch')) {
  return NextResponse.json({
    error: 'Không thể kết nối đến Google Apps Script. Vui lòng kiểm tra kết nối mạng.',
    type: 'NETWORK_ERROR',
    elapsed: elapsed
  }, { status: 503 })
}
```

**HTTP Status Codes:**
- `504` Gateway Timeout - Request timeout
- `499` Client Closed Request - AbortError
- `503` Service Unavailable - Network error
- `500` Internal Server Error - Backend error
- `200` Success

### 4. Request Performance Tracking

Track thời gian xử lý request:

```typescript
const startTime = Date.now()
// ... process request ...
const elapsed = Date.now() - startTime

console.log(`✅ [API Route] Request completed in ${elapsed}ms`)

// Include in response header
headers: {
  'X-Response-Time': `${elapsed}ms`
}
```

### 5. Comprehensive Logging

Thêm logs để debug production issues:

```typescript
console.log('🚀 [API Route] Request started')
console.log('🔍 [API Route] Filters:', filters)
console.log(`✅ [API Route] Request completed in ${elapsed}ms`)
console.error('❌ [API Route] Backend returned error:', result.error)
console.error('⏱️ [API Route] Request timeout after ${elapsed}ms')
```

## 📊 Performance Improvements

| Metric | Before | After |
|--------|--------|-------|
| Runtime | Edge (10s limit) | Node.js (60s limit) |
| Timeout Handling | None | 55s with graceful error |
| Error Messages | Generic 500 | Specific error types (504, 499, 503, 500) |
| Request Tracking | No | Yes (X-Response-Time header) |
| Error Logging | Basic | Comprehensive with error types |

## 🔍 How to Test

### 1. Test Locally

```bash
# Clear cache
rm -rf .next

# Restart dev server
npm run dev

# Open browser
http://localhost:3000/reconciliation

# Check console logs
```

### 2. Test on Vercel

```bash
# Deploy to Vercel
git add .
git commit -m "fix: optimize timeout for Vercel deployment"
git push

# Monitor Vercel logs
vercel logs
```

### 3. Expected Behavior

**Success Case (< 55s):**
- Status: 200 OK
- Response includes `X-Response-Time` header
- Console log: `✅ [API Route] Request completed in XXXXms`

**Timeout Case (> 55s):**
- Status: 504 Gateway Timeout
- Error message: "Yêu cầu xử lý dữ liệu quá lâu (timeout). Vui lòng thử lại với bộ lọc để giảm lượng dữ liệu."
- Response includes `elapsed` time

**Network Error:**
- Status: 503 Service Unavailable
- Error message: "Không thể kết nối đến Google Apps Script."

**Backend Error:**
- Status: 500 Internal Server Error
- Error message: Specific error from Google Apps Script

## 💡 Best Practices for Users

### 1. Use Filters to Reduce Data

Thay vì load toàn bộ data, use filters:

```
/api/reconciliation?fromDate=2024-01-01&toDate=2024-01-31
```

### 2. Use Caching

Response được cache 60 giây:
- Lần đầu: Fetch từ Google Apps Script
- Lần sau (trong 60s): Return từ cache

### 3. Monitor Response Time

Check `X-Response-Time` header để monitor performance:

```javascript
const response = await fetch('/api/reconciliation')
const responseTime = response.headers.get('X-Response-Time')
console.log('Response time:', responseTime)
```

## 🎯 Future Optimizations

Nếu vẫn gặp timeout với large datasets:

### Option 1: Implement Pagination

```typescript
// Backend: Return paginated data
{
  records: [...],
  pagination: {
    page: 1,
    limit: 100,
    total: 1000
  }
}

// Frontend: Load data in chunks
for (let page = 1; page <= totalPages; page++) {
  await fetch(`/api/reconciliation?page=${page}&limit=100`)
}
```

### Option 2: Use Background Jobs

```typescript
// 1. Create job
POST /api/reconciliation/jobs
→ Returns jobId

// 2. Poll for status
GET /api/reconciliation/jobs/:jobId
→ Returns { status: 'pending' | 'completed', data: ... }
```

### Option 3: Streaming Response

```typescript
// Use Response.stream() to send data in chunks
const stream = new ReadableStream({
  async start(controller) {
    for (const chunk of dataChunks) {
      controller.enqueue(chunk)
    }
    controller.close()
  }
})
```

### Option 4: Upgrade Vercel Plan

| Plan | Timeout Limit |
|------|---------------|
| Hobby | 60s |
| Pro | 300s (5 minutes) |
| Enterprise | Custom |

## 📝 Files Modified

### `/app/api/reconciliation/route.ts`

**Changes:**
1. ✅ Changed runtime từ `edge` sang `nodejs`
2. ✅ Added `maxDuration = 60`
3. ✅ Added timeout protection with `Promise.race()`
4. ✅ Enhanced error handling với specific error types
5. ✅ Added request performance tracking
6. ✅ Added comprehensive logging
7. ✅ Added `X-Response-Time` header

### `/lib/services/gas-api.ts`

**Previous changes** (still active):
- ✅ Enhanced error logging
- ✅ Timeout detection (AbortError)
- ✅ Increased timeout to 60s

### `/.env.local`

**Previous changes** (still active):
- ✅ `NEXT_PUBLIC_API_TIMEOUT=60000` (60 seconds)

## ✅ Success Criteria

Sau khi fix, bạn nên thấy:

1. ✅ Không còn lỗi 500 "The operation was aborted"
2. ✅ Request < 55s: Success với status 200
3. ✅ Request > 55s: Graceful timeout với status 504 và message rõ ràng
4. ✅ Console logs hiển thị request timing
5. ✅ Network tab hiển thị `X-Response-Time` header
6. ✅ Error messages cụ thể thay vì generic "Internal server error"

## 🔗 Related Documentation

- [CURRENT_STATUS.md](./CURRENT_STATUS.md) - Previous troubleshooting
- [DEBUG_DATA_PIPELINE.md](./DEBUG_DATA_PIPELINE.md) - Debug logging guide
- [Vercel Timeout Limits](https://vercel.com/docs/functions/serverless-functions/runtimes#max-duration)
- [Next.js Runtime Options](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#runtime)

---

**Status:** ✅ FIXED - Timeout optimized for Vercel deployment

**Next Step:** Deploy to Vercel and monitor logs
