# Hướng dẫn sử dụng Clasp - Google Apps Script CLI

## Tổng quan

Clasp (Command Line Apps Script Projects) cho phép bạn develop Google Apps Script locally trong VSCode và sync với Google Apps Script.

## Cài đặt Clasp

### 1. Cài đặt Node.js và npm (nếu chưa có)
```bash
# Kiểm tra version
node --version
npm --version
```

### 2. Cài đặt Clasp globally
```bash
npm install -g @google/clasp
```

### 3. Kiểm tra cài đặt
```bash
clasp --version
```

## Xác thực với Google Account

### 1. Login vào Google Account
```bash
cd /Users/mac/Desktop/nak-logistic-system/backend-gas
clasp login
```

**Lưu ý:**
- Browser sẽ mở để bạn đăng nhập Google Account
- Chọn account có quyền truy cập vào Google Apps Script project
- Click **Allow** để cấp quyền cho clasp

### 2. Kiểm tra đã login
```bash
clasp login --status
```

Kết quả mong đợi:
```
You are logged in as: your-email@gmail.com
```

## Sử dụng Clasp

### Pull code từ Google Apps Script về local

```bash
cd /Users/mac/Desktop/nak-logistic-system/backend-gas
clasp pull
```

**Điều gì xảy ra:**
- Tải tất cả files từ Google Apps Script project về folder `gas/`
- Overwrite files local nếu đã tồn tại
- Download file `appsscript.json` (metadata)

**Khi nào dùng:**
- Sau khi bạn edit code trực tiếp trên Google Apps Script Editor
- Để sync code mới nhất về local

### Push code từ local lên Google Apps Script

```bash
cd /Users/mac/Desktop/nak-logistic-system/backend-gas
clasp push
```

**Điều gì xảy ra:**
- Upload tất cả files từ `gas/` lên Google Apps Script
- Overwrite code trên GAS với code local

**Khi nào dùng:**
- Sau khi edit code trong VSCode
- Muốn deploy changes lên Google Apps Script

**⚠️ Lưu ý:**
- Luôn backup code trước khi push
- Hoặc dùng `clasp pull` trước để đảm bảo sync

### Push và force overwrite

```bash
clasp push --force
```

Bỏ qua confirmation, force upload tất cả files.

### Watch mode - Auto push khi file thay đổi

```bash
clasp push --watch
```

Tự động push mỗi khi bạn save file trong VSCode.

## File Structure

```
backend-gas/
├── .clasp.json           # Clasp configuration (scriptId)
├── appsscript.json       # Apps Script manifest
├── gas/                  # Source code folder
│   ├── Code.gs
│   ├── Config.gs
│   ├── ReportService.gs
│   ├── ReconciliationService.gs
│   ├── AppSheetWebhookService.gs
│   ├── UpdateService.gs
│   ├── Utils.gs
│   ├── CreateDataBase.gs
│   ├── RemoveDuplicates.gs
│   └── WebhookSync.gs
```

## .clasp.json Configuration

```json
{
  "scriptId": "1TTS7pJuKKBuh5w7kAHr4xrGzfUwyN9Bw2IT1xd0DwskRC4Uhjd0EaLLL",
  "rootDir": "./gas"
}
```

**Parameters:**
- `scriptId`: ID của Google Apps Script project
- `rootDir`: Folder chứa source code (.gs files)

## appsscript.json Manifest

```json
{
  "timeZone": "Asia/Ho_Chi_Minh",
  "dependencies": {
    "enabledAdvancedServices": []
  },
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/script.scriptapp"
  ]
}
```

**Parameters:**
- `timeZone`: Múi giờ (Vietnam = Asia/Ho_Chi_Minh)
- `runtimeVersion`: V8 engine (modern JavaScript support)
- `oauthScopes`: Quyền cần thiết:
  - `spreadsheets`: Read/Write Google Sheets
  - `script.external_request`: Gọi external APIs
  - `script.scriptapp`: Chạy Apps Script functions

## Workflow Đề xuất

### 1. Development Workflow
```bash
# 1. Pull code mới nhất từ GAS
clasp pull

# 2. Edit code trong VSCode
# ... make changes ...

# 3. Push code lên GAS
clasp push

# 4. Test trên Google Apps Script Editor
# Mở: https://script.google.com/home/projects/1TTS7pJuKKBuh5w7kAHr4xrGzfUwyN9Bw2IT1xd0DwskRC4Uhjd0EaLLL/edit

# 5. Deploy nếu cần
# (Deploy through Google Apps Script Editor UI)
```

### 2. Live Development với Watch Mode
```bash
# Terminal 1: Watch mode
cd backend-gas
clasp push --watch

# Terminal 2: Dev server (optional)
cd ..
npm run dev

# Edit code trong VSCode → Tự động push lên GAS
```

## Useful Clasp Commands

### Mở Google Apps Script trong browser
```bash
clasp open
```

### List tất cả deployments
```bash
clasp deployments
```

### Tạo version mới
```bash
clasp version "Version description"
```

### Deploy version mới
```bash
clasp deploy -V <version_number> -d "Deployment description"
```

### View logs
```bash
clasp logs
```

### Clone một project khác
```bash
clasp clone <scriptId>
```

## Troubleshooting

### Lỗi: "User has not enabled the Apps Script API"

**Giải pháp:**
1. Mở: https://script.google.com/home/usersettings
2. Enable **Google Apps Script API**

### Lỗi: "Manifest file has been updated"

**Giải pháp:**
```bash
clasp pull
# Review changes
clasp push --force
```

### Lỗi: "Invalid credentials"

**Giải pháp:**
```bash
clasp logout
clasp login
```

### Lỗi: "Script not found"

**Kiểm tra:**
- Script ID trong `.clasp.json` đúng chưa
- Account có quyền truy cập project không

## Ignoring Files

Tạo file `.claspignore` để ignore files không muốn push:

```bash
# File: backend-gas/.claspignore
**/**
!gas/*.gs
!appsscript.json
```

Chỉ push files trong `gas/` và `appsscript.json`.

## Best Practices

1. **Luôn pull trước khi edit:**
   ```bash
   clasp pull
   ```

2. **Test local trước khi push:**
   - Review changes
   - Check syntax

3. **Backup trước khi push:**
   ```bash
   git commit -am "Backup before clasp push"
   clasp push
   ```

4. **Sử dụng version control:**
   - Commit changes to Git
   - Tag versions

5. **Deploy từ UI:**
   - Push code với clasp
   - Deploy web app từ Google Apps Script Editor UI
   - Tránh deploy qua CLI để có control tốt hơn

## VSCode Integration

### Recommended Extensions
- **Apps Script** by Google
- **Google Apps Script Snippets**

### VSCode Settings
```json
{
  "files.associations": {
    "*.gs": "javascript"
  }
}
```

## Workflow với Git

```bash
# 1. Pull từ GAS về local
clasp pull

# 2. Commit changes
git add .
git commit -m "Sync from GAS"

# 3. Edit code trong VSCode
# ... make changes ...

# 4. Push lên GAS
clasp push

# 5. Test trên GAS
# ... test ...

# 6. Commit nếu OK
git add .
git commit -m "Add new feature"
git push origin main
```

## Next Steps

### 1. Pull code hiện tại từ GAS
```bash
cd /Users/mac/Desktop/nak-logistic-system/backend-gas
clasp pull
```

### 2. Push ReconciliationService.gs lên GAS
```bash
# Đã có file local: backend-gas/gas/ReconciliationService.gs
clasp push
```

### 3. Verify trên GAS Editor
```bash
clasp open
```

### 4. Deploy Web App
- Qua Google Apps Script Editor UI
- Deploy → New deployment → Deploy

---

**Tài liệu:**
- Clasp Documentation: https://github.com/google/clasp
- Apps Script API: https://developers.google.com/apps-script/api

**Support:**
- Nếu gặp vấn đề về authentication, xem phần Troubleshooting
- Nếu lỗi permission, check OAuth scopes trong appsscript.json
