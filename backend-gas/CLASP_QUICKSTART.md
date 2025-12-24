# Clasp Quick Start - 5 Phút Setup

## Bước 1: Cài đặt Clasp (1 phút)

```bash
npm install -g @google/clasp
```

## Bước 2: Enable Apps Script API (30 giây)

1. Mở: https://script.google.com/home/usersettings
2. Bật **Google Apps Script API** (ON)

## Bước 3: Login (30 giây)

```bash
cd /Users/mac/Desktop/nak-logistic-system/backend-gas
clasp login
```

- Browser sẽ mở
- Chọn Google Account
- Click **Allow**

## Bước 4: Pull Code (30 giây)

```bash
clasp pull
```

Kết quả:
```
Cloned 10 files.
└─ gas/Code.gs
└─ gas/Config.gs
└─ gas/ReportService.gs
└─ gas/ReconciliationService.gs
...
```

## Bước 5: Push ReconciliationService.gs (30 giây)

```bash
clasp push
```

Kết quả:
```
└─ gas/ReconciliationService.gs
Pushed 10 files.
```

## Bước 6: Verify (1 phút)

```bash
# Mở Google Apps Script Editor
clasp open
```

Kiểm tra:
- [ ] File `ReconciliationService.gs` đã xuất hiện
- [ ] Code.gs đã có route `getReconciliationData`

## Bước 7: Deploy (30 giây)

**Trong Google Apps Script Editor:**
1. Deploy → Manage deployments
2. Click ✏️ Edit trên deployment hiện tại
3. Version: **New version**
4. Click **Deploy**

## Test API (30 giây)

```bash
# Thay YOUR_DEPLOYMENT_ID bằng ID thực
curl "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=getReconciliationData"
```

Kết quả mong đợi:
```json
{
  "success": true,
  "data": {
    "records": [...],
    "summary": {...},
    "total": 150
  }
}
```

---

## Workflow hàng ngày

### Edit code trong VSCode → Push lên GAS

```bash
# 1. Edit code
code gas/ReconciliationService.gs

# 2. Push
clasp push

# 3. Test
clasp open
```

### Pull code mới nhất từ GAS

```bash
clasp pull
```

---

## Troubleshooting

### ❌ "User has not enabled the Apps Script API"
→ Enable tại: https://script.google.com/home/usersettings

### ❌ "Invalid credentials"
→ `clasp logout` → `clasp login`

### ❌ "Script not found"
→ Kiểm tra `.clasp.json` có đúng scriptId không

---

**Tài liệu đầy đủ:** [CLASP_SETUP.md](CLASP_SETUP.md)
