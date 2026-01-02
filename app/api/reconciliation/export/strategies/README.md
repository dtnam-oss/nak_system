# Excel Export Strategies

Thư mục này chứa các strategy (mẫu) xuất Excel khác nhau cho module Reconciliation.

## 📁 Cấu trúc

```
strategies/
├── JnT_Route_Template.ts    # Mẫu J&T theo tuyến (có STT, tách Tem đi/về)
├── JnT_Shift_Template.ts    # Mẫu J&T theo ca (multi-line cells)
└── README.md                 # File này
```

---

## 📊 JnT_Route_Template.ts

**Mục đích**: Mẫu báo cáo J&T theo TUYẾN (Route-based) với Single-line Format

### Cột dữ liệu (7 cột):

| Cột | Tên Header | Source | Logic |
|-----|------------|--------|-------|
| A | **STT** | Auto-increment | 1, 2, 3, ... |
| B | **Ngày** | `order.date` | Format: `dd/MM/yyyy` |
| C | **Biển số xe** | `details.chiTietLoTrinh[0].bienKiemSoat` | Phần tử ĐẦU TIÊN |
| D | **Điểm đi - Điểm đến** | `order.route_name` | Lấy trực tiếp từ DB (KHÔNG từ JSON) |
| E | **Tem chiều đi** | `details.chiTietLoTrinh[0].maTuyen` | Phần tử ĐẦU TIÊN |
| F | **Tem chiều về** | `details.chiTietLoTrinh[length-1].maTuyen` | Phần tử CUỐI CÙNG |
| G | **Thể tích** | `details.chiTietLoTrinh[].taiTrongTinhPhi` | Nối bằng dấu phẩy |

### Styling:

- **Header Row**: Background `#C0C0C0` (silver gray), Font bold đen, Border thin
- **Data Rows**: Border thin bao quanh, Alignment center/middle, wrapText: true
- **Row Height**: Standard 20px

### Usage:

```typescript
import { generateJnTRouteExcel } from './strategies/JnT_Route_Template';

const buffer = await generateJnTRouteExcel(orders);
// Returns ExcelJS.Buffer ready for download
```

---

## 📊 JnT_Shift_Template.ts

**Mục đích**: Mẫu báo cáo J&T theo CA (Shift-based) với Multi-line Cells

### Cột dữ liệu (6 cột):

| Cột | Tên Header | Source | Logic |
|-----|------------|--------|-------|
| A | **Ngày** | `order.date` | Format: `dd/MM/yyyy` |
| B | **Biển số xe** | `details.chiTietLoTrinh[].bienKiemSoat` | Unique values, nối bằng dấu phẩy |
| C | **Mã tem** | `details.chiTietLoTrinh[].maTuyen` | Gộp TẤT CẢ bằng xuống dòng (`\n`) |
| D | **Điểm đi - Điểm đến** | `details.chiTietLoTrinh[].loTrinhChiTiet` | Gộp TẤT CẢ bằng xuống dòng (`\n`) |
| E | **Thể tích** | `details.chiTietLoTrinh[].taiTrongTinhPhi` | Gộp TẤT CẢ bằng xuống dòng (`\n`) |
| F | **Loại ca** | `details.chiTietLoTrinh[].loaiCa` | Gộp TẤT CẢ bằng xuống dòng (`\n`) |

### Styling:

- **Header Row**: Background `#D3D3D3` (light gray), Font bold size 12, Border thin
- **Data Rows**: Border thin bao quanh, Alignment center/middle, **wrapText: true** (CRITICAL)
- **Row Height**: Auto-calculated - maxLines × 15px (minimum 20px)

### Key Features:

- ✅ Multi-line cells: Cho phép hiển thị nhiều dòng trong 1 ô
- ✅ wrapText enabled: Bắt buộc để Excel render ký tự `\n` thành xuống dòng
- ✅ Auto row height: Tự động tăng chiều cao dòng theo nội dung
- ⚠️ KHÔNG có cột STT trong mẫu này

### Usage:

```typescript
import { generateJnTShiftExcel } from './strategies/JnT_Shift_Template';

const buffer = await generateJnTShiftExcel(orders);
// Returns ExcelJS.Buffer ready for download
```

---

## 🔧 Cách thêm Strategy mới

1. Tạo file mới trong `strategies/` (VD: `GHN_Template.ts`)
2. Export function có signature: `async function generateXXX(data: ReconciliationDatabaseRow[]): Promise<ExcelJS.Buffer>`
3. Import vào `route.ts` và thêm case mới trong switch
4. Update README này

---

## ⚠️ Lưu ý

- **Không dùng type `Buffer`** từ Node.js - dùng `ExcelJS.Buffer`
- Parse `details` JSON an toàn (try-catch)
- Kiểm tra mảng rỗng trước khi access index
- Console log để tracking
