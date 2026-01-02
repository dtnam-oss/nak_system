# 📊 Hướng dẫn Xuất Excel - J&T Templates

## 🔍 Vấn đề đã Fix

**Bug**: File Excel xuất ra không đúng với function xử lý
**Nguyên nhân**: Có 2 function trùng tên `generateJnTRouteExcel` - function cũ chưa xóa gây nhầm lẫn
**Giải pháp**: Đã xóa function cũ, chỉ giữ lại strategy mới trong `strategies/JnT_Route_Template.ts`

---

## 📋 Danh sách Mẫu Export cho J&T

Hiện tại hệ thống có **2 mẫu export** cho khách hàng J&T:

### 1️⃣ Mẫu Theo Tuyến (Route-based) ✅ ĐÃ HOÀN THIỆN

**templateType**: `jnt_route`

**File xử lý**: `app/api/reconciliation/export/strategies/JnT_Route_Template.ts`

**Cấu trúc Excel**:
| Cột | Header | Nguồn dữ liệu | Logic |
|-----|--------|---------------|-------|
| A | STT | Auto-increment | 1, 2, 3... |
| B | Ngày | `order.date` | Format: dd/MM/yyyy |
| C | Biển số xe | `chiTietLoTrinh[0].bienKiemSoat` | Phần tử đầu tiên |
| D | Điểm đi - Điểm đến | `order.route_name` | Trực tiếp từ DB |
| E | Tem chiều đi | `chiTietLoTrinh[0].maTuyen` | Phần tử đầu tiên |
| F | Tem chiều về | `chiTietLoTrinh[length-1].maTuyen` | Phần tử cuối cùng |
| G | Thể tích | `chiTietLoTrinh[].taiTrongTinhPhi` | Nối bằng dấu phẩy |

**Styling**:
- Header: Background `#C0C0C0` (silver gray), Font bold đen
- Data: Border thin, Center alignment, wrapText: true

---

### 2️⃣ Mẫu Theo Ca (Shift-based) ✅ ĐÃ HOÀN THIỆN

**templateType**: `jnt_shift`

**File xử lý**: `app/api/reconciliation/export/strategies/JnT_Shift_Template.ts`

**Cấu trúc Excel**:
| Cột | Header | Nguồn dữ liệu | Logic |
|-----|--------|---------------|-------|
| A | Ngày | `order.date` | Format: dd/MM/yyyy |
| B | Biển số xe | `chiTietLoTrinh[].bienKiemSoat` | Unique values, nối bằng dấu phẩy |
| C | Mã tem | `chiTietLoTrinh[].maTuyen` | Gộp TẤT CẢ bằng xuống dòng (`\n`) |
| D | Điểm đi - Điểm đến | `chiTietLoTrinh[].loTrinhChiTiet` | Gộp TẤT CẢ bằng xuống dòng (`\n`) |
| E | Thể tích | `chiTietLoTrinh[].taiTrongTinhPhi` | Gộp TẤT CẢ bằng xuống dòng (`\n`) |
| F | Loại ca | `chiTietLoTrinh[].loaiCa` | Gộp TẤT CẢ bằng xuống dòng (`\n`) |

**Styling**:
- Header: Background `#D3D3D3` (light gray), Font bold size 12
- Data: Border thin, Center alignment, **wrapText: true** (CRITICAL for multi-line cells)
- Row height: Auto-calculated based on number of lines (maxLines × 15px)

**API Call**:
```
GET /api/reconciliation/export?templateType=jnt_route&fromDate=2024-01-01&khachHang=J%26T
```

**Output**: `Doisoat_JnT_TheoTuyen_YYYYMMDD_HHMMSS.xlsx`

**Đặc điểm quan trọng**:
- ✅ Có cột STT (7 cột total)
- ✅ Single-line cells: Mỗi tem đi/về riêng biệt (first/last logic)
- ✅ Route name từ DB: Lấy order.route_name thay vì JSON
- ✅ Standard row height 20px

---

### 2️⃣ Mẫu Theo Ca (Shift-based) ✅ ĐÃ HOÀN THIỆN

**templateType**: `jnt_shift`

**File xử lý**: `app/api/reconciliation/export/strategies/JnT_Shift_Template.ts`

**API Call**:
```
GET /api/reconciliation/export?templateType=jnt_shift&fromDate=2024-01-01&khachHang=J%26T
```

**Output hiện tại**: Excel với 2 dòng placeholder text

---

## 🚨 Lưu ý quan trọng

### ❌ Lỗi thường gặp

**1. File Excel không có cột STT khi dùng jnt_route**
- **Nguyên nhân**: Đang gọi nhầm `templateType=jnt_shift` thay vì `jnt_route`
- **Giải pháp**: Verify đang gọi đúng `templateType=jnt_route`

**2. File Excel không có cột STT**
- **Nguyên nhân**: Mẫu Theo Ca không có cột STT (design intentional)
- **Giải pháp**: Đây là thiết kế đúng, không cần sửa

**3. Mã tem/Lộ trình không hiển thị multi-line**
- **Nguyên nhân**: Excel chưa bật wrap text hoặc row height quá nhỏ
- **Giải pháp**: Double-click vào border giữa các row để auto-fit height

--Cấu trúc Excel**:
| Cột | Header | Nguồn dữ liệu | Logic |
|-----|--------|---------------|-------|
| A | Ngày | `order.date` | Format: dd/MM/yyyy |
| B | Biển số xe | `chiTietLoTrinh[].bienKiemSoat` | Unique values, nối bằng dấu phẩy |
| C | Mã tem | `chiTietLoTrinh[].maTuyen` | Gộp TẤT CẢ bằng xuống dòng (`\n`) |
| D | Điểm đi - Điểm đến | `chiTietLoTrinh[].loTrinhChiTiet` | Gộp TẤT CẢ bằng xuống dòng (`\n`) |
| E | Thể tích | `chiTiReturn 501 Error - Not Implemented]
    B -->|jnt_shift| D[Call JnT_Shift_Template.ts]
    B -->|general| E[Call generateGeneralExcel]
    D --> F[Download Excel Theo Ca với multi-line cells]
    E --> Gder thin, Center alignment, **wrapText: true** (CRITICAL for multi-line cells)
- Row height: Auto-calculated based on number of lines (maxLines × 15px)

**API Call**:
```
GET /api/reconciliation/export?templateType=jnt_shift&fromDate=2024-01-01&khachHang=J%26T
```

**Output**: `Doisoat_JnT_TheoCa_YYYYMMDD_HHMMSS.xlsx`

**Đặc điểm quan trọng**:
- ✅ Multi-line cells: Mỗi mã tem/lộ trình/thể tích/loại ca nằm trên 1 dòng riêng trong cùng 1 ô
- ✅ wrapText enabled: Cho phép Excel hiển thị nội dung xuống dòng
- ✅ Auto row height: Chiều cao dòng tự động tăng theo số lượng chi tiết
- ⚠️ KHÔNG có cột STT trong mẫu này
    A[User Click Export] --> B{Select templateType}
    B -->|jnt_route| C[Call JnT_Route_Template.ts]
    B -->|jnt_shift| D[Call generateJnTShiftExcel]
    B -->|general| E[Call generateGeneralExcel]
    C --> F[Download Excel với STT + Tem tách]
    D --> G[Download Excel placeholder]
    E --> H[Download Excel tổng hợp]
```

---6 cột (Ngày, Biển số xe, Mã tem, Điểm đi-đến, Thể tích, Loại ca)
- [ ] KHÔNG có cột STT
- [ ] Mã tem hiển thị multi-line (mỗi tem 1 dòng) trong cùng 1 ô
- [ ] Điểm đi - Điểm đến hiển thị multi-line (từ chiTietLoTrinh, không phải route_name)
- [ ] Thể tích hiển thị multi-line (mỗi giá trị 1 dòng)
- [ ] Loại ca hiển thị multi-line
- [ ] Header background màu xám nhạt (#D3D3D3)
- [ ] Tất cả cell có border thin và wrapText enabled
- [ ] Row height tự động tăng khi có nhiều dòng nội dungNgày, Biển số xe, Điểm đi-đến, Tem đi, Tem về, Thể tích)
- [ ] Cột STT tăng dần từ 1
- [ ] Tem chiều đi = maTuyen đầu tiên
- [ ] Tem chiều về = maTuyen cuối cùng
- [ ] Điểm đi - Điểm đến = order.route_name
- [ ] Header background màu xám bạc (#C0C0C0)
- [ ] Tất cả cell có border thin

Khi test mẫu **Theo Ca** (`jnt_shift`):

- [ ] Excel hiển thị placeholder text (expected - chưa implement)

---

## 🛠️ Cách Implement Mẫu Theo Ca
Tuyến

1. Tạo file mới: `strategies/JnT_Route_Template.ts`
2. Define columns theo yêu cầu của khách hàng
3. Implement data mapping logic
4. Update import trong `route.ts`
5. Update case `jnt_route` để gọi strategy mới thay vì return 501

---

## 📞 Support

Nếu gặp vấn đề:
1. Check console log: `📊 Export Request:` để xem templateType
2. Verify API endpoint params
3. Inspect Excel header row để confirm mẫu nào được dùng
4. Đọc `strategies/README.md` để hiểu pattern
