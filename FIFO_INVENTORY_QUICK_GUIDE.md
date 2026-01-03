# FIFO Inventory - Quick Guide

## 🎯 Tóm tắt Cải tiến

### 1. Tab "Nhật ký cấp dầu" - Phân loại theo nguồn ⛽

Giờ đây bạn có thể xem riêng từng loại hình cấp dầu:

```
┌─────────────────────────────────────────────────┐
│ [Tất cả] [Trụ nội bộ] [Trụ Quang Minh] [Trụ vãng lai] │
└─────────────────────────────────────────────────┘
```

- **Tất cả**: Hiển thị toàn bộ giao dịch
- **Trụ nội bộ**: Chỉ xe đổ tại trụ công ty (ảnh hưởng tồn kho)
- **Trụ Quang Minh**: Xe đổ tại trạm Quang Minh
- **Trụ vãng lai**: Các trạm khác (Petrolimex, PV Oil...)

### 2. Logic Tồn Kho FIFO - Tính theo thời gian 🕐

**Trước đây** (Simple):
```
Tồn kho = Tổng nhập - Tổng xuất
```
❌ **Vấn đề**: Trừ cả xuất TRƯỚC khi nhập → Sai tồn kho

**Bây giờ** (FIFO):
```
Chỉ trừ các phiếu xuất SAU thời điểm nhập
```
✅ **Đúng**: Phản ánh chính xác tồn kho thực tế

---

## 📖 Ví dụ Minh họa

### Scenario 1: Xuất trước nhập

```
Timeline:
├─ 31/12/2025 23:00 → Xuất 500L (Trụ nội bộ)
└─ 01/01/2026 00:00 → Nhập 1000L (PO#1)

❌ Logic cũ:
   Tồn kho = 1000 - 500 = 500L

✅ Logic FIFO mới:
   PO#1 không bị trừ (xuất trước nhập)
   Tồn kho = 1000L
```

### Scenario 2: Xuất sau nhập

```
Timeline:
├─ 01/01/2026 00:00 → Nhập 1000L (PO#1)
├─ 01/01/2026 08:00 → Xuất 300L (Trụ nội bộ)
└─ 01/01/2026 15:00 → Xuất 200L (Trụ nội bộ)

✅ Logic FIFO:
   PO#1: 1000 - 300 - 200 = 500L
   Tồn kho = 500L
```

### Scenario 3: Nhiều PO (FIFO)

```
Timeline:
├─ 01/01/2026 00:00 → Nhập 500L (PO#1)
├─ 02/01/2026 00:00 → Nhập 500L (PO#2)
└─ 02/01/2026 08:00 → Xuất 600L (Trụ nội bộ)

✅ Logic FIFO:
   Trừ theo thứ tự: PO cũ trước
   - PO#1: 500 - 500 = 0L (hết)
   - PO#2: 500 - 100 = 400L (còn)
   
   Tồn kho = 400L
```

### Scenario 4: Xuất ngoài vs Xuất nội bộ

```
Timeline:
├─ 01/01/2026 00:00 → Nhập 1000L (PO#1)
├─ 01/01/2026 08:00 → Xuất 200L (Petrolimex) ← Mua ngoài
└─ 01/01/2026 15:00 → Xuất 300L (Trụ nội bộ) ← Đổ nội bộ

✅ Logic FIFO:
   - Xuất 200L Petrolimex: KHÔNG trừ tồn kho (mua ngoài)
   - Xuất 300L Trụ nội bộ: TRỪ vào PO#1
   
   PO#1: 1000 - 300 = 700L
   Tồn kho = 700L
```

---

## 🖥️ Giao diện Mới

### Tab "Nhật ký cấp dầu"

```
┌────────────────────────────────────────────────────┐
│ Quản lý Nhiên liệu                                 │
├────────────────────────────────────────────────────┤
│                                                    │
│ [Nhật ký cấp dầu] [Nhập kho] [Hiệu suất]         │
│                                                    │
│ ┌──────────────────────────────────────────────┐  │
│ │ [Tất cả] [Trụ nội bộ] [Trụ QM] [Vãng lai]   │  │
│ └──────────────────────────────────────────────┘  │
│                                                    │
│ ┌─────────────────────────────────────────────┐   │
│ │ Danh sách giao dịch                         │   │
│ │                                             │   │
│ │ ID    | Ngày   | Nguồn        | SL    | ... │   │
│ │ T-001 | 01/01  | Trụ nội bộ   | 100L  | ... │   │
│ │ T-002 | 01/01  | Petrolimex   | 50L   | ... │   │
│ └─────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────┘
```

### KPI Cards - Sử dụng FIFO

```
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ Tồn kho hiện tại │ │ Giá trị tồn kho  │ │ Tiêu thụ tháng   │
│                  │ │                  │ │                  │
│   5,420 L        │ │  121,961,250đ    │ │    1,234 L       │
│   ↓ FIFO         │ │  ↓ FIFO          │ │                  │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

---

## 🔍 Kiểm tra Tồn Kho FIFO

### Xem Chi tiết Inventory theo PO

**API Endpoint**:
```bash
GET /api/fuel/inventory/fifo
```

**Response**:
```json
{
  "success": true,
  "data": {
    "inventory": [
      {
        "import_id": "PO-001",
        "import_date": "2026-01-01T00:00:00Z",
        "original_quantity": 1000,
        "consumed_quantity": 300,
        "remaining_quantity": 700,
        "avg_price": 22500
      },
      {
        "import_id": "PO-002",
        "import_date": "2026-01-02T00:00:00Z",
        "original_quantity": 2000,
        "consumed_quantity": 500,
        "remaining_quantity": 1500,
        "avg_price": 23000
      }
    ],
    "summary": {
      "total_remaining": 2200,
      "total_value": 50100000,
      "current_avg_price": 22772.73
    }
  }
}
```

**Giải thích**:
- `original_quantity`: Số lượng nhập ban đầu
- `consumed_quantity`: Đã xuất bao nhiêu
- `remaining_quantity`: Còn lại bao nhiêu
- `total_remaining`: Tổng tồn kho (theo FIFO)

---

## ⚠️ Lưu ý Quan trọng

### 1. Timestamp Chính xác
```
✅ ĐÚNG:
   Nhập: 01/01/2026 00:00:00
   Xuất: 01/01/2026 00:00:01 → Được trừ

❌ SAI (không xảy ra với logic mới):
   Nhập: 01/01/2026 08:00:00
   Xuất: 01/01/2026 00:00:00 → Không trừ
```

### 2. Chỉ "Trụ nội bộ" Ảnh Hưởng Tồn Kho
```
✅ Trừ tồn kho:
   - fuel_source = "Trụ nội bộ"

❌ KHÔNG trừ tồn kho:
   - fuel_source = "Petrolimex"
   - fuel_source = "PV Oil"
   - fuel_source = "Trạm Quang Minh"
   - fuel_source = "Khác"
```

### 3. Negative Inventory Warning
```
Nếu xuất > nhập:
  - Hệ thống hiển thị warning trong log
  - Tồn kho không âm (clamped về 0)
  - Cần kiểm tra dữ liệu nguồn
```

---

## 📊 So Sánh: Trước vs Sau

| Tiêu chí | Trước (Simple) | Sau (FIFO) |
|----------|----------------|------------|
| **Logic** | Tổng nhập - Tổng xuất | Trừ theo timestamp + FIFO |
| **Độ chính xác** | ❌ Không chính xác | ✅ Chính xác |
| **Xét timestamp** | ❌ Không | ✅ Có |
| **Phân biệt PO** | ❌ Không | ✅ Có (chi tiết từng PO) |
| **Chuẩn kế toán** | ❌ Không | ✅ Tuân thủ FIFO |

---

## 🚀 Hướng Dẫn Sử Dụng

### Bước 1: Xem Tabs Nguồn Cấp Dầu
1. Vào **Dashboard** → **Nhiên liệu**
2. Tab **"Nhật ký cấp dầu"**
3. Chọn tab con:
   - **Tất cả**: Xem toàn bộ
   - **Trụ nội bộ**: Chỉ xem xe đổ nội bộ
   - **Trụ Quang Minh**: Chỉ xem trạm QM
   - **Trụ vãng lai**: Các trạm khác

### Bước 2: Kiểm tra Tồn Kho
1. Xem **KPI Cards** ở đầu trang
2. **Tồn kho hiện tại**: Tính theo FIFO
3. **Giá trị tồn kho**: Sử dụng avg_price từ FIFO
4. **% Bồn chứa**: Dựa trên FIFO inventory

### Bước 3: Xác minh FIFO
1. Mở Developer Console (F12)
2. Reload trang
3. Xem logs:
   ```
   ✓ Using FIFO Inventory Calculation
   ✓ FIFO Inventory: 5420.5L
   ✓ FIFO Avg Price: 22500.23 VND/L
   ```

---

## 🐛 Troubleshooting

### Vấn đề 1: Tồn kho khác biệt lớn so với trước
**Nguyên nhân**: Có nhiều giao dịch xuất TRƯỚC các PO nhập  
**Giải pháp**: Kiểm tra lại timestamp data, đây là kết quả chính xác hơn

### Vấn đề 2: Tab không filter đúng
**Nguyên nhân**: fuel_source không chuẩn (có khoảng trắng, viết hoa/thường)  
**Giải pháp**: Chuẩn hóa dữ liệu fuel_source trong AppSheet

### Vấn đề 3: API FIFO lỗi → Fallback
**Triệu chứng**: Log hiển thị "⚠️ FIFO API failed, using simple calculation"  
**Giải pháp**: Tạm thời dùng simple method, báo dev team để fix

---

## 📞 Hỗ Trợ

Nếu gặp vấn đề:
1. Kiểm tra logs trong Console (F12)
2. Screenshot KPI cards + error message
3. Liên hệ dev team với thông tin:
   - Timestamp khi xảy ra lỗi
   - Screenshot logs
   - Mô tả hành động đang làm

---

**Version**: 2.0.0  
**Last Updated**: January 3, 2026  
**Status**: ✅ Production Ready
