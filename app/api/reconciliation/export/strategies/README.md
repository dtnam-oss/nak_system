# Excel Export Strategies

Thư mục này chứa các strategy (mẫu) xuất Excel khác nhau cho module Reconciliation.

## 📁 Cấu trúc

```
strategies/
├── JnT_Route_Template.ts    # Mẫu J&T theo tuyến (có STT, tách Tem đi/về)
└── README.md                 # File này
```

---

## 📊 JnT_Route_Template.ts

**Mục đích**: Mẫu báo cáo J&T theo TUYẾN (Route-based) với Multi-line Cells

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
import { generateJnTRouteExcel } from './strategies/JnT_Route_Template';

const buffer = await generateJnTRouteExcel(orders);
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
