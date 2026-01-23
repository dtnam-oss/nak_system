#!/bin/bash

# ============================================================================
# NAK Logistics - Database Migration Script
# Purpose: Automate migration from Neon to Self-hosted PostgreSQL
# Date: 2026-01-22
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
OLD_DB_URL="${POSTGRES_URL}"  # Neon/Vercel Postgres
NEW_DB_URL="postgresql://postgres:123@163.223.12.189:5432/nak_vn"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# ============================================================================
# Helper Functions
# ============================================================================

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

confirm() {
    read -p "$1 (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_error "Operation cancelled by user"
        exit 1
    fi
}

# ============================================================================
# Step 1: Pre-flight Checks
# ============================================================================

step1_preflight() {
    log_info "Step 1: Pre-flight checks..."
    
    # Check if pg_dump exists
    if ! command -v pg_dump &> /dev/null; then
        log_error "pg_dump not found. Please install PostgreSQL client tools."
        exit 1
    fi
    
    # Check if psql exists
    if ! command -v psql &> /dev/null; then
        log_error "psql not found. Please install PostgreSQL client tools."
        exit 1
    fi
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Test old database connection
    log_info "Testing connection to OLD database (Neon)..."
    if psql "$OLD_DB_URL" -c "SELECT 1;" > /dev/null 2>&1; then
        log_info "✅ Connected to OLD database"
    else
        log_error "❌ Cannot connect to OLD database"
        exit 1
    fi
    
    # Test new database connection
    log_info "Testing connection to NEW database..."
    if psql "$NEW_DB_URL" -c "SELECT 1;" > /dev/null 2>&1; then
        log_info "✅ Connected to NEW database"
    else
        log_error "❌ Cannot connect to NEW database"
        exit 1
    fi
    
    log_info "✅ Pre-flight checks passed"
}

# ============================================================================
# Step 2: Backup Old Database
# ============================================================================

step2_backup() {
    log_info "Step 2: Backing up OLD database..."
    
    BACKUP_FILE="$BACKUP_DIR/backup_neon_${TIMESTAMP}.sql"
    
    log_info "Dumping database to $BACKUP_FILE..."
    pg_dump "$OLD_DB_URL" > "$BACKUP_FILE"
    
    # Compress backup
    log_info "Compressing backup..."
    gzip "$BACKUP_FILE"
    
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
    log_info "✅ Backup created: ${BACKUP_FILE}.gz (${BACKUP_SIZE})"
}

# ============================================================================
# Step 3: Export Schema
# ============================================================================

step3_export_schema() {
    log_info "Step 3: Exporting schema..."
    
    SCHEMA_FILE="$BACKUP_DIR/schema_${TIMESTAMP}.sql"
    
    pg_dump "$OLD_DB_URL" --schema-only > "$SCHEMA_FILE"
    
    log_info "✅ Schema exported to $SCHEMA_FILE"
}

# ============================================================================
# Step 4: Export Data
# ============================================================================

step4_export_data() {
    log_info "Step 4: Exporting data..."
    
    DATA_FILE="$BACKUP_DIR/data_${TIMESTAMP}.sql"
    
    # Export data from all tables
    pg_dump "$OLD_DB_URL" \
        --data-only \
        --exclude-table-data=spatial_ref_sys \
        > "$DATA_FILE"
    
    log_info "✅ Data exported to $DATA_FILE"
}

# ============================================================================
# Step 5: Import Schema to New Database
# ============================================================================

step5_import_schema() {
    log_info "Step 5: Importing schema to NEW database..."
    
    confirm "⚠️  This will modify the NEW database. Continue?"
    
    SCHEMA_FILE="$BACKUP_DIR/schema_${TIMESTAMP}.sql"
    
    psql "$NEW_DB_URL" < "$SCHEMA_FILE"
    
    log_info "✅ Schema imported successfully"
}

# ============================================================================
# Step 6: Import Data to New Database
# ============================================================================

step6_import_data() {
    log_info "Step 6: Importing data to NEW database..."
    
    confirm "⚠️  This will insert data into NEW database. Continue?"
    
    DATA_FILE="$BACKUP_DIR/data_${TIMESTAMP}.sql"
    
    psql "$NEW_DB_URL" < "$DATA_FILE"
    
    log_info "✅ Data imported successfully"
}

# ============================================================================
# Step 7: Verify Data Integrity
# ============================================================================

step7_verify() {
    log_info "Step 7: Verifying data integrity..."
    
    # Count rows in old database
    log_info "Counting rows in OLD database..."
    OLD_COUNTS=$(psql "$OLD_DB_URL" -t -c "
        SELECT 'reconciliation_orders: ' || COUNT(*) FROM reconciliation_orders
        UNION ALL
        SELECT 'fuel_transactions: ' || COUNT(*) FROM fuel_transactions
        UNION ALL
        SELECT 'fuel_imports: ' || COUNT(*) FROM fuel_imports
        UNION ALL
        SELECT 'vehicles: ' || COUNT(*) FROM vehicles
        UNION ALL
        SELECT 'nhan_vien: ' || COUNT(*) FROM nhan_vien;
    ")
    
    # Count rows in new database
    log_info "Counting rows in NEW database..."
    NEW_COUNTS=$(psql "$NEW_DB_URL" -t -c "
        SELECT 'reconciliation_orders: ' || COUNT(*) FROM reconciliation_orders
        UNION ALL
        SELECT 'fuel_transactions: ' || COUNT(*) FROM fuel_transactions
        UNION ALL
        SELECT 'fuel_imports: ' || COUNT(*) FROM fuel_imports
        UNION ALL
        SELECT 'vehicles: ' || COUNT(*) FROM vehicles
        UNION ALL
        SELECT 'nhan_vien: ' || COUNT(*) FROM nhan_vien;
    ")
    
    # Display results
    log_info "OLD database row counts:"
    echo "$OLD_COUNTS"
    
    log_info "NEW database row counts:"
    echo "$NEW_COUNTS"
    
    # Compare
    if [ "$OLD_COUNTS" == "$NEW_COUNTS" ]; then
        log_info "✅ Row counts match! Data integrity verified."
    else
        log_warn "⚠️  Row counts DO NOT match. Please investigate."
    fi
}

# ============================================================================
# Step 8: Run Normalization Migration
# ============================================================================

step8_normalize() {
    log_info "Step 8: Running schema normalization..."
    
    confirm "⚠️  This will create new normalized tables. Continue?"
    
    MIGRATION_FILE="./database/migrate_to_normalized_schema.sql"
    
    if [ ! -f "$MIGRATION_FILE" ]; then
        log_error "Migration file not found: $MIGRATION_FILE"
        exit 1
    fi
    
    psql "$NEW_DB_URL" < "$MIGRATION_FILE"
    
    log_info "✅ Schema normalized successfully"
}

# ============================================================================
# Step 9: Create AppSheet User
# ============================================================================

step9_create_appsheet_user() {
    log_info "Step 9: Creating AppSheet user..."
    
    psql "$NEW_DB_URL" <<EOF
-- Create user if not exists
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'appsheet_user') THEN
        CREATE USER appsheet_user WITH PASSWORD 'AppSheet2026@Secure!';
        RAISE NOTICE 'User appsheet_user created';
    ELSE
        RAISE NOTICE 'User appsheet_user already exists';
    END IF;
END
\$\$;

-- Grant permissions
GRANT CONNECT ON DATABASE nak_vn TO appsheet_user;
GRANT USAGE ON SCHEMA public TO appsheet_user;

-- Tables
GRANT SELECT, INSERT, UPDATE ON chuyen_di TO appsheet_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON chi_tiet_chuyen_di TO appsheet_user;
GRANT SELECT, INSERT, UPDATE ON fuel_transactions TO appsheet_user;
GRANT SELECT, INSERT, UPDATE ON fuel_imports TO appsheet_user;
GRANT SELECT, INSERT, UPDATE ON vehicles TO appsheet_user;
GRANT SELECT ON nhan_vien TO appsheet_user;

-- Sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO appsheet_user;

RAISE NOTICE 'Permissions granted to appsheet_user';
EOF
    
    log_info "✅ AppSheet user created and configured"
}

# ============================================================================
# Step 10: Final Verification
# ============================================================================

step10_final_verification() {
    log_info "Step 10: Final verification..."
    
    # Check normalized tables
    log_info "Checking normalized tables..."
    NORMALIZED_COUNTS=$(psql "$NEW_DB_URL" -t -c "
        SELECT 'chuyen_di: ' || COUNT(*) FROM chuyen_di
        UNION ALL
        SELECT 'chi_tiet_chuyen_di: ' || COUNT(*) FROM chi_tiet_chuyen_di;
    ")
    
    log_info "Normalized table counts:"
    echo "$NORMALIZED_COUNTS"
    
    # Test AppSheet user permissions
    log_info "Testing AppSheet user permissions..."
    if psql "postgresql://appsheet_user:AppSheet2026@Secure!@163.223.12.189:5432/nak_vn" \
        -c "SELECT COUNT(*) FROM chuyen_di;" > /dev/null 2>&1; then
        log_info "✅ AppSheet user can connect and query"
    else
        log_warn "⚠️  AppSheet user permissions may need adjustment"
    fi
    
    log_info "✅ Final verification completed"
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    echo "============================================================================"
    echo "  NAK Logistics - Database Migration"
    echo "  From: Neon (Vercel Postgres)"
    echo "  To:   Self-hosted PostgreSQL (163.223.12.189)"
    echo "============================================================================"
    echo
    
    confirm "⚠️  WARNING: This will migrate your database. Have you backed up? Continue?"
    
    step1_preflight
    step2_backup
    step3_export_schema
    step4_export_data
    step5_import_schema
    step6_import_data
    step7_verify
    step8_normalize
    step9_create_appsheet_user
    step10_final_verification
    
    echo
    echo "============================================================================"
    log_info "✅ MIGRATION COMPLETED SUCCESSFULLY!"
    echo "============================================================================"
    echo
    echo "Next steps:"
    echo "1. Update .env.local with new POSTGRES_URL"
    echo "2. Set DB_MODE=new"
    echo "3. Restart Next.js: npm run dev"
    echo "4. Test API endpoints"
    echo "5. Configure AppSheet (see APPSHEET_DIRECT_CONNECTION_GUIDE.md)"
    echo
    echo "Backups saved in: $BACKUP_DIR"
    echo
}

# Run main function
main
