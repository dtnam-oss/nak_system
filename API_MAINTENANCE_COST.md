# API Chi Phí Sửa Chữa (Maintenance Cost)

## Overview
API endpoints để quản lý chi phí sửa chữa xe (table: `chi_phi_sua_chua`)

## Database Schema

```sql
CREATE TABLE chi_phi_sua_chua (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Date & Vehicle Info
  ngay DATE NOT NULL,
  loai_xe VARCHAR(100),
  bien_so_xe VARCHAR(20) NOT NULL,
  
  -- Part Details
  loai_phu_tung VARCHAR(100),
  ma_phu_tung VARCHAR(50),
  ten_phu_tung VARCHAR(255),
  
  -- Cost Details
  so_luong NUMERIC(10,2) DEFAULT 0,
  don_gia NUMERIC(15,2) DEFAULT 0,
  thanh_tien NUMERIC(15,2) DEFAULT 0,
  km_sua_chua NUMERIC(10,2) DEFAULT 0,
  so_tien NUMERIC(15,2) DEFAULT 0,
  
  -- Other Info
  ca_nhan_thanh_toan VARCHAR(255),
  dia_chi_sua_chua VARCHAR(255),
  
  -- Driver Info
  ma_nhan_vien VARCHAR(20),
  ten_nhan_vien VARCHAR(100),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_chi_phi_sua_chua_ngay ON chi_phi_sua_chua(ngay);
CREATE INDEX idx_chi_phi_sua_chua_bien_so ON chi_phi_sua_chua(bien_so_xe);
CREATE INDEX idx_chi_phi_sua_chua_ma_nv ON chi_phi_sua_chua(ma_nhan_vien);
```

## TypeScript Interface

```typescript
interface MaintenanceCost {
  id: string;
  
  // Date & Vehicle
  ngay: string;  // ISO date string
  loai_xe: string;
  bien_so_xe: string;
  
  // Part Details
  loai_phu_tung: string;
  ma_phu_tung: string;
  ten_phu_tung: string;
  
  // Cost Details
  so_luong: number;
  don_gia: number;
  thanh_tien: number;
  km_sua_chua: number;
  so_tien: number;
  
  // Other Info
  ca_nhan_thanh_toan: string;
  dia_chi_sua_chua: string;
  
  // Driver Info
  ma_nhan_vien: string;
  ten_nhan_vien: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}
```

## API Endpoints

### 1. GET /api/maintenance
Lấy danh sách chi phí sửa chữa với filters và pagination

**Query Parameters:**
- `ma_nhan_vien` (optional): Mã nhân viên
- `bien_so_xe` (optional): Biển số xe
- `from_date` (optional): Từ ngày (YYYY-MM-DD)
- `to_date` (optional): Đến ngày (YYYY-MM-DD)
- `limit` (optional, default: 100): Số records trả về
- `offset` (optional, default: 0): Vị trí bắt đầu (pagination)

**Example Request:**
```bash
GET /api/maintenance?from_date=2026-01-01&to_date=2026-02-10&limit=20
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "ngay": "2026-02-10",
      "loai_xe": "Xe tải",
      "bien_so_xe": "51C-12345",
      "loai_phu_tung": "Lốp xe",
      "ma_phu_tung": "LOP-001",
      "ten_phu_tung": "Lốp Bridgestone 295/80R22.5",
      "so_luong": 2,
      "don_gia": 5500000,
      "thanh_tien": 11000000,
      "km_sua_chua": 125000,
      "so_tien": 11000000,
      "ca_nhan_thanh_toan": "Không",
      "dia_chi_sua_chua": "Garage Bình Dương",
      "ma_nhan_vien": "TX001",
      "ten_nhan_vien": "Nguyễn Văn A",
      "created_at": "2026-02-10T10:00:00Z",
      "updated_at": "2026-02-10T10:00:00Z"
    }
  ],
  "count": 1,
  "total": 150,
  "pagination": {
    "limit": 20,
    "offset": 0,
    "hasMore": true
  },
  "summary": {
    "total_records": 150,
    "total_cost": 45000000,
    "total_vehicles": 25,
    "total_drivers": 15
  },
  "filters": {
    "ma_nhan_vien": null,
    "bien_so_xe": null,
    "from_date": "2026-01-01",
    "to_date": "2026-02-10"
  }
}
```

### 2. POST /api/maintenance/create
Tạo record chi phí sửa chữa mới

**Required Fields:**
- `ngay`: Date (YYYY-MM-DD)
- `bien_so_xe`: Biển số xe

**Optional Fields:**
- All other fields

**Auto-calculated:**
- `thanh_tien` = `so_luong` × `don_gia` (if not provided)
- `id` = UUID auto-generated

**Example Request:**
```bash
POST /api/maintenance/create
Content-Type: application/json

{
  "ngay": "2026-02-10",
  "loai_xe": "Xe tải",
  "bien_so_xe": "51C-12345",
  "loai_phu_tung": "Lốp xe",
  "ma_phu_tung": "LOP-001",
  "ten_phu_tung": "Lốp Bridgestone 295/80R22.5",
  "so_luong": 2,
  "don_gia": 5500000,
  "km_sua_chua": 125000,
  "ca_nhan_thanh_toan": "Không",
  "dia_chi_sua_chua": "Garage Bình Dương",
  "ma_nhan_vien": "TX001",
  "ten_nhan_vien": "Nguyễn Văn A"
}
```

**Example Response:**
```json
{
  "success": true,
  "message": "Maintenance record created successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "ngay": "2026-02-10",
    "bien_so_xe": "51C-12345",
    "thanh_tien": 11000000,
    ...
  }
}
```

### 3. PATCH /api/maintenance/[id]
Cập nhật record chi phí sửa chữa

**Parameters:**
- `id`: UUID của record cần update

**Body:** Partial update - chỉ cần gửi fields cần thay đổi

**Example Request:**
```bash
PATCH /api/maintenance/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "so_luong": 4,
  "don_gia": 5200000,
  "thanh_tien": 20800000,
  "so_tien": 20800000
}
```

**Example Response:**
```json
{
  "success": true,
  "message": "Maintenance record updated successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "so_luong": 4,
    "don_gia": 5200000,
    "thanh_tien": 20800000,
    ...
  }
}
```

### 4. DELETE /api/maintenance/[id]
Xóa record chi phí sửa chữa

**Parameters:**
- `id`: UUID của record cần xóa

**Example Request:**
```bash
DELETE /api/maintenance/550e8400-e29b-41d4-a716-446655440000
```

**Example Response:**
```json
{
  "success": true,
  "message": "Maintenance record deleted successfully",
  "data": {
    "bien_so_xe": "51C-12345",
    "ten_phu_tung": "Lốp Bridgestone 295/80R22.5",
    "ngay": "2026-02-10"
  }
}
```

## Testing

Run test script:
```bash
node test-maintenance-api.js
```

## Common Use Cases

### 1. Lấy tất cả chi phí sửa chữa tháng này
```bash
GET /api/maintenance?from_date=2026-02-01&to_date=2026-02-29
```

### 2. Lấy chi phí theo xe
```bash
GET /api/maintenance?bien_so_xe=51C-12345
```

### 3. Lấy chi phí theo tài xế
```bash
GET /api/maintenance?ma_nhan_vien=TX001
```

### 4. Pagination - trang 2 (skip 20 records đầu)
```bash
GET /api/maintenance?limit=20&offset=20
```

## Error Handling

All endpoints return consistent error format:
```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message"
}
```

**Common Error Codes:**
- `400`: Bad Request - Missing required fields
- `404`: Not Found - Record không tồn tại
- `500`: Internal Server Error - Database error

## Notes

- Tất cả số tiền (don_gia, thanh_tien, so_tien) được lưu dưới dạng NUMERIC(15,2)
- Date format: YYYY-MM-DD (ISO 8601)
- UUID được generate tự động khi tạo record mới
- `thanh_tien` được tính tự động = `so_luong` × `don_gia` nếu không được cung cấp
- Timestamps (created_at, updated_at) được quản lý tự động bởi database

---

**Date:** February 10, 2026  
**Status:** ✅ Ready for use
