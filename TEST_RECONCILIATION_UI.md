# Test Checklist - Reconciliation UI Refactor

## Môi trường Test
- **URL Local:** http://localhost:3000/reconciliation
- **Browser:** Chrome/Safari với DevTools mở
- **Ngày test:** 31/12/2025

---

## 1. DateRangePicker Component

### 1.1 Hiển thị ban đầu
- [ ] Button hiển thị text "Chọn khoảng ngày" khi chưa chọn
- [ ] Button có icon calendar bên trái
- [ ] Button có width cố định (280px), không bị wrap text
- [ ] Button có border và style nhất quán với UI

### 1.2 Mở Popover
- [ ] Click button → Popover mở ra
- [ ] Popover hiển thị 2 phần: Sidebar (trái) + Dual Calendar (phải)
- [ ] Sidebar có 6 presets:
  - [ ] Hôm nay
  - [ ] Hôm qua
  - [ ] 7 ngày trước
  - [ ] 30 ngày trước
  - [ ] Tháng này
  - [ ] Tháng trước

### 1.3 Calendar Header
- [ ] **QUAN TRỌNG:** Hàng header "Th 2, Th 3, Th 4, Th 5, Th 6, Th 7, CN" căn giữa
- [ ] Các chữ KHÔNG đè lên nhau
- [ ] Các cột header align khớp với các cột ngày bên dưới
- [ ] Font size nhỏ hơn ngày (0.8rem)
- [ ] Màu muted-foreground (xám nhạt)

### 1.4 Chọn ngày
- [ ] Click vào 1 ngày → chọn được
- [ ] Click ngày thứ 2 → tạo range (from → to)
- [ ] Các ngày trong range có background màu accent
- [ ] Ngày bắt đầu/kết thúc có background primary (xanh)
- [ ] Hover vào ngày có hiệu ứng hover

### 1.5 Presets
- [ ] Click "Hôm nay" → Calendar chọn ngày hôm nay
- [ ] Click "7 ngày trước" → Calendar chọn range 7 ngày
- [ ] Click "Tháng này" → Calendar chọn từ ngày 1 đến ngày cuối tháng
- [ ] Sau khi chọn preset → Button hiển thị range đã chọn

### 1.6 Format hiển thị
- [ ] Button hiển thị: "02/01/2025 - 31/01/2025" (dd/MM/yyyy)
- [ ] Nếu chọn 1 ngày: "31/12/2025"
- [ ] Format đúng locale Việt Nam

### 1.7 Đóng Popover
- [ ] Click bên ngoài → Popover đóng
- [ ] ESC key → Popover đóng
- [ ] Giá trị đã chọn được giữ lại

---

## 2. Customer Filter (Combobox)

### 2.1 Hiển thị ban đầu
- [ ] Button hiển thị "Khách hàng"
- [ ] Button có icon ChevronsUpDown
- [ ] Button có border và style nhất quán

### 2.2 Mở Dropdown
- [ ] Click button → Command Popover mở
- [ ] Có search input với icon search
- [ ] Có option "Tất cả khách hàng" ở đầu
- [ ] Danh sách khách hàng load từ API

### 2.3 Search
- [ ] Gõ text vào search → Lọc danh sách real-time
- [ ] Search không phân biệt hoa thường
- [ ] Nếu không tìm thấy → Hiển thị "Không tìm thấy"

### 2.4 Chọn khách hàng
- [ ] Click vào khách hàng → Button hiển thị tên khách hàng
- [ ] Icon Check hiển thị bên trái item đã chọn
- [ ] Dropdown tự động đóng
- [ ] Chọn "Tất cả khách hàng" → Button về "Khách hàng"

---

## 3. Search by Order ID

### 3.1 Input field
- [ ] Placeholder: "Tìm kiếm mã chuyến đi..."
- [ ] Icon search bên trái
- [ ] Input có border và style nhất quán

### 3.2 Chức năng
- [ ] Gõ mã chuyến đi → Chỉ tìm theo order_id
- [ ] KHÔNG tìm theo customer, route, status
- [ ] Search case-insensitive
- [ ] Debounce 300ms (không call API mỗi ký tự)

---

## 4. Toolbar Layout

### 4.1 Responsive
- [ ] Desktop: Tất cả filters trên 1 hàng
- [ ] Tablet: Wrap xuống 2 hàng nếu cần
- [ ] Mobile: Stack theo chiều dọc

### 4.2 Buttons
- [ ] Nút "Áp dụng" màu primary (xanh)
- [ ] Nút "Xuất Excel" màu primary
- [ ] Cả 2 nút đều có icon
- [ ] Hover có hiệu ứng

### 4.3 Stats
- [ ] Hiển thị "Có x thay đổi chưa áp dụng" khi thay đổi filter
- [ ] Số thay đổi tính đúng
- [ ] Text màu muted-foreground

---

## 5. Table Integration

### 5.1 Headers
- [ ] Tất cả headers đều **bold**
- [ ] Alignment đúng (left/right/center)
- [ ] Sortable columns có icon

### 5.2 Filter Application
- [ ] Click "Áp dụng" → Table reload với filters mới
- [ ] Loading state hiển thị
- [ ] Data mới hiển thị đúng
- [ ] Pagination reset về page 1

### 5.3 API Params
- [ ] Date range: `startDate` và `endDate` (YYYY-MM-DD)
- [ ] Customer: `khachHang` param
- [ ] Order ID: `orderId` param
- [ ] Check Network tab: Params đúng format

---

## 6. Performance

### 6.1 Load time
- [ ] DateRangePicker mở < 100ms
- [ ] Customer dropdown mở < 200ms
- [ ] Search debounce hoạt động đúng

### 6.2 Memory
- [ ] Không có memory leak khi đóng/mở nhiều lần
- [ ] Console không có warning/error
- [ ] React DevTools: Không re-render thừa

---

## 7. Browser Compatibility

### 7.1 Chrome
- [ ] All features work
- [ ] No console errors
- [ ] DatePicker renders correctly

### 7.2 Safari
- [ ] All features work
- [ ] Date format correct
- [ ] Calendar layout OK

### 7.3 Firefox
- [ ] All features work
- [ ] Popover positioning correct

---

## 8. Edge Cases

### 8.1 DateRangePicker
- [ ] Chọn from > to → Tự động swap
- [ ] Chọn ngày trong quá khứ xa (2020) → OK
- [ ] Chọn ngày tương lai → OK
- [ ] Clear selection → Về trạng thái ban đầu

### 8.2 Customer Filter
- [ ] API trả về empty list → Hiển thị thông báo
- [ ] API error → Hiển thị error state
- [ ] Tên khách hàng dài → Truncate với ellipsis

### 8.3 Search
- [ ] Search empty string → Show all
- [ ] Search special characters → Không crash
- [ ] Search với dấu tiếng Việt → Hoạt động

---

## 9. Console Checks

Open DevTools Console và kiểm tra:

```bash
# Không có errors
✓ No TypeScript errors
✓ No React warnings
✓ No 404 errors

# API calls
✓ /api/reconciliation → 200 OK
✓ /api/customers → 200 OK

# Dependencies loaded
✓ react-day-picker
✓ date-fns
✓ cmdk
```

---

## 10. Git Status

Trước khi commit, check:

```bash
cd /Users/mac/Desktop/nak-logistic-system

# Files modified
git status

# Should show:
# - components/ui/calendar.tsx (text-center added)
# - components/ui/date-range-picker.tsx (w-[280px] added)
# - components/ui/popover.tsx (new)
# - components/ui/command.tsx (new)
# - components/reconciliation/toolbar.tsx (refactored)
# - package.json (dependencies)
```

---

## ✅ Test Passed Criteria

- [ ] Tất cả 10 sections đều PASS
- [ ] Không có console errors
- [ ] UI responsive trên mobile/desktop
- [ ] Performance tốt (no lag)
- [ ] Code format sạch (no warnings)

---

## 🚀 Ready to Deploy

Khi tất cả test pass:

```bash
git add -A
git commit -m "fix: Calendar weekday header alignment for Vietnamese locale

- Added text-center to head_cell for proper alignment
- Weekday headers now align with date columns below
- Fixed layout issue with longer Vietnamese text (Th 2, Th 3...)"

git push origin main
```

---

## 📸 Screenshots Test

Chụp screenshots các cases sau để verify:

1. **DateRangePicker closed** - Button với text "Chọn khoảng ngày"
2. **DateRangePicker open** - Popover với sidebar + dual calendar
3. **Calendar header** - Hàng "Th 2, Th 3..." căn giữa KHÔNG đè chữ
4. **Date range selected** - Range với background accent
5. **Customer dropdown** - Danh sách khách hàng với search
6. **Full toolbar** - Toàn bộ toolbar với 3 filters + 2 buttons
7. **Mobile view** - Toolbar responsive trên mobile

---

**Tester:** _________________  
**Date:** 31/12/2025  
**Result:** ⬜ PASS / ⬜ FAIL  
**Notes:** _________________
