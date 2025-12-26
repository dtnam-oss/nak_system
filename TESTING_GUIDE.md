# Testing Guide - Trip Details Modal

## Quick Start

```bash
# Start development server
npm run dev

# Open reconciliation page
open http://localhost:3000/reconciliation
```

---

## Visual Testing Checklist

### 1. Main Table Columns (10 total)

Expected order from left to right:

| # | Column | Header | Format | Notes |
|---|--------|---------|---------|-------|
| 1 | maChuyenDi | Mã chuyến | Plain text | Font-medium |
| 2 | ngayTao | Ngày tạo | DD/MM/YYYY | Vietnamese format |
| 3 | tenKhachHang | Khách hàng | Plain text | Truncated if long |
| 4 | loaiChuyen | Loại chuyến | Badge | Color-coded |
| 5 | tenTuyen | Tên tuyến | Plain text | Truncated if long |
| 6 | tenTaiXe | Tài xế | Plain text | Truncated if long |
| 7 | donViVanChuyen | Đơn vị | Badge | NAK=green, other=gray |
| 8 | trangThai | Trạng thái | Badge | Color by status |
| 9 | tongDoanhThu | Doanh thu | Currency | VND format |
| 10 | actions | Thao tác | Button | Eye icon + "Chi tiết" |

**Screenshot Point 1:** Take screenshot of table showing all columns

---

### 2. Badge Color Coding

**Transport Unit (Đơn vị):**
- ✅ NAK → Green badge
- ✅ VENDOR → Gray badge

**Status (Trạng thái):**
- ✅ "Kết thúc" / "Hoàn thành" → Green badge
- ✅ "Hủy" / "Từ chối" → Red badge
- ✅ "Đang" / "Chờ" → Blue badge
- ✅ Others → Gray badge

**Trip Type (Loại chuyến):**
- ✅ Contains "Nhanh" → Blue badge (default)
- ✅ Contains "Thường" → Outline badge
- ✅ Others → Gray badge

**Screenshot Point 2:** Take screenshot showing different badge colors

---

### 3. Action Button

**Visual:**
- [ ] Eye icon visible
- [ ] Text "Chi tiết" visible
- [ ] Button has outline style
- [ ] Hover effect works

**Screenshot Point 3:** Hover over "Chi tiết" button

---

### 4. Open Trip Details Dialog

**Click any "Chi tiết" button**

Expected behavior:
- [ ] Modal opens with overlay (darkened background)
- [ ] Modal centered on screen
- [ ] Close (X) button visible in top-right

**Dialog Header:**
- [ ] Title format: "Chi tiết chuyến đi: [Mã chuyến]"
- [ ] Example: "Chi tiết chuyến đi: nak_abc123"

**Screenshot Point 4:** Full dialog view

---

### 5. Section A - General Information

**Visual Check:**
- [ ] Gray background box
- [ ] Grid layout (2-3 columns)
- [ ] Labels in gray text (muted)
- [ ] Values in dark text

**Expected Fields:**

| Field | Label | Format |
|-------|-------|--------|
| soXe | Số xe | Plain text or from data_json |
| khCap1 | Khách hàng cấp 1 | Plain text |
| tenTaiXe | Tài xế | Plain text |
| tongDoanhThu | Tổng doanh thu | VND currency |
| tongQuangDuong | Tổng quãng đường | Number + " km" |
| trangThai | Trạng thái | Color-coded badge |
| loaiCa | Loại ca | Plain text (if present) |
| hinhThucTinhGia | Hình thức tính giá | Plain text (if present) |
| taiTrongTinhPhi | Tải trọng tính phí | Number + " tấn" (if present) |

**Screenshot Point 5:** Section A close-up

---

### 6. Section B - Route Details (Desktop)

**Header:**
- [ ] "Chi tiết lộ trình (X điểm)" where X = number of route points

**Table (Desktop view):**

Expected columns:
1. Thứ tự
2. Mã Tem
3. Lộ trình (highlighted in blue/primary color)
4. Quãng đường (km)
5. Tải trọng (tấn)
6. Thành tiền

**Visual Check:**
- [ ] Table headers have gray background
- [ ] Zebra striping (alternating row colors)
- [ ] Route name in primary color (blue)
- [ ] Numbers right-aligned
- [ ] Currency formatted as VND

**Footer Row:**
- [ ] "Tổng cộng" label
- [ ] Sum of quãng đường
- [ ] Sum of tải trọng
- [ ] Sum of thành tiền
- [ ] Bold/semibold font

**Screenshot Point 6:** Route details table (desktop)

---

### 7. Section B - Route Details (Mobile)

**Resize browser to mobile width (<768px)**

Expected behavior:
- [ ] Table disappears
- [ ] Cards appear instead
- [ ] Each card shows one route point

**Card Layout:**
- [ ] Header with "Điểm X" and badge with Mã Tem
- [ ] Route name in primary color
- [ ] Grid layout for: Quãng đường, Tải trọng, Thành tiền
- [ ] Border around each card

**Total Card (at bottom):**
- [ ] Gray background
- [ ] Shows totals for distance, weight, amount

**Screenshot Point 7:** Mobile card view

---

### 8. Edge Cases Testing

#### Test Case 1: No Route Details
**Setup:** Find or create record with empty chiTietLoTrinh
**Expected:**
- [ ] Shows message: "Không có dữ liệu chi tiết lộ trình"
- [ ] Gray background with border
- [ ] No table/cards rendered

#### Test Case 2: Invalid data_json
**Setup:** Manually break JSON in console or test data
**Expected:**
- [ ] Dialog still opens
- [ ] Section A shows basic info from main record
- [ ] Section B shows "Không có dữ liệu" message
- [ ] Console shows error (not crash)

#### Test Case 3: Missing data_json
**Setup:** Record without data_json field
**Expected:**
- [ ] Dialog opens
- [ ] Section A shows basic info
- [ ] Section B shows "Không có dữ liệu"

**Screenshot Point 8:** Error handling (no data case)

---

### 9. Dialog Interactions

**Close Dialog:**
- [ ] Click X button → Dialog closes
- [ ] Click outside modal (on overlay) → Dialog closes
- [ ] Press Escape key → Dialog closes

**Scroll:**
- [ ] Long route list scrolls within dialog
- [ ] Dialog doesn't exceed 90vh
- [ ] Scrollbar appears if content overflows

---

### 10. Responsive Behavior

**Desktop (>768px):**
- [ ] All columns visible in main table
- [ ] Dialog uses table for route details
- [ ] Wide modal (max-w-5xl)

**Tablet (768px - 1024px):**
- [ ] Table may scroll horizontally
- [ ] Dialog switches to cards for routes
- [ ] Modal width adjusts

**Mobile (<768px):**
- [ ] Table scrolls horizontally
- [ ] Dialog uses cards
- [ ] Modal fits screen width
- [ ] Touch-friendly button sizes

---

## Testing with Real Data

### Test Data Scenarios

**Scenario 1: Normal Trip**
```json
{
  "maChuyenDi": "nak_test001",
  "data_json": "{\"thongTinChuyenDi\":{\"soXe\":\"29H40290\",\"khCap1\":\"GHN HN\"},\"chiTietLoTrinh\":[{\"thuTu\":1,\"maTem\":\"E251130ARSCPNGT\",\"loTrinh\":\"Kho A -> Kho B\",\"quangDuong\":1419.7,\"taiTrong\":8,\"thanhTien\":2000000}]}"
}
```
**Expected:** Full dialog with all sections populated

---

**Scenario 2: Multi-Point Route**
```json
{
  "chiTietLoTrinh": [
    {"thuTu": 1, "loTrinh": "HCM -> Biên Hòa", ...},
    {"thuTu": 2, "loTrinh": "Biên Hòa -> Đồng Nai", ...},
    {"thuTu": 3, "loTrinh": "Đồng Nai -> HN", ...}
  ]
}
```
**Expected:** Table shows 3 rows, totals sum correctly

---

**Scenario 3: Large Numbers**
```json
{
  "tongDoanhThu": 500000000,
  "tongQuangDuong": 15000.5
}
```
**Expected:**
- Revenue: "₫500.000.000" or "500.000.000 ₫"
- Distance: "15.000,5 km"

---

## Browser Testing

**Chrome:**
- [ ] Desktop view works
- [ ] Mobile responsive works
- [ ] DevTools mobile simulation works

**Firefox:**
- [ ] Dialog overlay renders correctly
- [ ] Close button works

**Safari:**
- [ ] iOS mobile rendering
- [ ] Touch interactions

---

## Performance Testing

**Load Time:**
- [ ] Dialog opens in < 200ms
- [ ] No lag when clicking "Chi tiết"

**JSON Parsing:**
- [ ] Large data_json (10+ route points) parses quickly
- [ ] useMemo prevents re-parsing

**Memory:**
- [ ] Opening/closing dialog 10 times doesn't leak memory
- [ ] Check DevTools Memory tab

---

## Accessibility Testing

**Keyboard Navigation:**
- [ ] Tab through table rows
- [ ] Tab reaches "Chi tiết" button
- [ ] Enter/Space opens dialog
- [ ] Tab inside dialog works
- [ ] Escape closes dialog

**Screen Reader:**
- [ ] Dialog title is announced
- [ ] Close button has aria-label
- [ ] Table headers are announced

---

## Console Checks

**No Errors Expected:**
```bash
# Open DevTools Console
# Check for:
✅ No red errors
✅ No TypeScript warnings
⚠️ JSON parse warnings only if data is invalid (expected)
```

**Network Tab:**
- [ ] No extra API calls when opening dialog
- [ ] Dialog uses client-side data (no fetch)

---

## Screenshot Checklist Summary

1. ✅ Main table with 10 columns
2. ✅ Badge color variations
3. ✅ "Chi tiết" button hover state
4. ✅ Dialog full view
5. ✅ Section A general info
6. ✅ Section B route table (desktop)
7. ✅ Section B route cards (mobile)
8. ✅ Error handling case

---

## Reporting Issues

**Template:**
```
Issue: [Brief description]
Steps to Reproduce:
1. [Step 1]
2. [Step 2]

Expected: [What should happen]
Actual: [What actually happened]

Browser: [Chrome/Firefox/Safari] [Version]
Device: [Desktop/Mobile/Tablet]
Screenshot: [Attach if possible]
Console Errors: [Copy/paste]
```

---

## Success Criteria

All tests pass when:
- ✅ All 10 columns display correctly
- ✅ Badges show correct colors
- ✅ Dialog opens on button click
- ✅ General info section displays all fields
- ✅ Route details table/cards render
- ✅ Totals calculate correctly
- ✅ Mobile responsive works
- ✅ Dialog closes properly
- ✅ No console errors
- ✅ Edge cases handled gracefully

---

**Last Updated:** December 26, 2024
**Status:** Ready for Testing
