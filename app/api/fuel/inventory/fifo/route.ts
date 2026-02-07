import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface FuelImport {
  id: string;
  import_date: string;
  quantity: number;
  unit_price: number;
  avg_price: number;
  remaining_quantity: number;
}

interface FuelTransaction {
  id: string;
  transaction_date: string;
  quantity: number;
  fuel_source: string;
}

interface FIFOInventoryItem {
  import_id: string;
  import_date: string;
  original_quantity: number;
  consumed_quantity: number;
  remaining_quantity: number;
  avg_price: number;
  unit_price: number;
}

/**
 * API Endpoint: GET /api/fuel/inventory/fifo
 * 
 * Tính toán tồn kho theo phương pháp FIFO (First In First Out)
 * Logic: Chỉ trừ các phiếu xuất SAU thời điểm nhập kho
 * 
 * Ví dụ:
 * - PO#1 nhập 1000L lúc 00:00 ngày 01/01/2026
 * - Xuất 100L lúc 08:00 ngày 01/01/2026 → Trừ vào PO#1 (sau thời điểm nhập)
 * - Xuất 50L lúc 23:59 ngày 31/12/2025 → KHÔNG trừ vào PO#1 (trước thời điểm nhập)
 * 
 * Returns:
 * - inventory: Array of FIFO inventory items (còn tồn)
 * - total_remaining: Tổng tồn kho hiện tại
 * - total_value: Giá trị tồn kho
 * - current_avg_price: Giá bình quân (weighted average)
 */
export async function GET() {
  try {
    console.log('========================================');
    console.log('📊 FIFO INVENTORY CALCULATION');
    console.log('🕐 Timestamp:', new Date().toISOString());
    console.log('========================================');

    // 1. Lấy tất cả phiếu nhập (sorted by import_date ASC - FIFO)
    const importsResult = await sql`
      SELECT 
        id,
        ngay_nhap as import_date,
        REPLACE(COALESCE(so_luong::TEXT, '0'), ',', '.')::NUMERIC as quantity,
        REPLACE(COALESCE(don_gia_nhap::TEXT, '0'), ',', '.')::NUMERIC as unit_price,
        REPLACE(COALESCE(don_gia_xuat_binh_quan::TEXT, '0'), ',', '.')::NUMERIC as avg_price
      FROM nhap_nhien_lieu
      ORDER BY ngay_nhap ASC, thoi_gian_tao ASC
    `;

    const imports: FuelImport[] = importsResult.rows.map(row => ({
      id: row.id,
      import_date: row.import_date,
      quantity: parseFloat(row.quantity || '0'),
      unit_price: parseFloat(row.unit_price || '0'),
      avg_price: parseFloat(row.avg_price || '0'),
      remaining_quantity: parseFloat(row.quantity || '0'), // Initialize with full quantity
    }));

    console.log(`✓ Found ${imports.length} import records`);

    // 2. Lấy tất cả phiếu xuất tại "Trụ nội bộ" (sorted by transaction_date ASC)
    const transactionsResult = await sql`
      SELECT
        id,
        ngay_tao as transaction_date,
        REPLACE(COALESCE(so_luong::TEXT, '0'), ',', '.')::NUMERIC as quantity,
        loai_hinh as fuel_source
      FROM xuat_nhien_lieu
      WHERE id IS NOT NULL
        AND ngay_tao IS NOT NULL
        AND LOWER(TRIM(loai_hinh)) = 'trụ nội bộ'
      ORDER BY ngay_tao ASC, thoi_gian_tao ASC
    `;

    const transactions: FuelTransaction[] = transactionsResult.rows.map(row => ({
      id: row.id,
      transaction_date: row.transaction_date,
      quantity: parseFloat(row.quantity || '0'),
      fuel_source: row.fuel_source,
    }));

    console.log(`✓ Found ${transactions.length} export transactions (Trụ nội bộ)`);

    // 3. Tính toán FIFO: Trừ dần từ PO cũ nhất
    const fifoInventory: FIFOInventoryItem[] = [];
    
    // Initialize remaining quantity for each import
    const importRemaining = new Map<string, number>();
    imports.forEach(imp => {
      importRemaining.set(imp.id, imp.quantity);
    });

    // Process each transaction and deduct from oldest imports first
    for (const transaction of transactions) {
      let transactionRemaining = transaction.quantity;
      const transactionTimestamp = new Date(transaction.transaction_date).getTime();

      console.log(`\n  Processing Transaction ${transaction.id} (${transaction.quantity}L at ${transaction.transaction_date})`);

      // Find imports that came BEFORE this transaction (FIFO eligible)
      for (const importRecord of imports) {
        if (transactionRemaining <= 0) break;

        const importTimestamp = new Date(importRecord.import_date).getTime();
        
        // Only deduct if import came BEFORE or AT SAME TIME as transaction
        if (importTimestamp <= transactionTimestamp) {
          const currentRemaining = importRemaining.get(importRecord.id) || 0;
          
          if (currentRemaining > 0) {
            const consumedFromThisImport = Math.min(currentRemaining, transactionRemaining);
            const newRemaining = currentRemaining - consumedFromThisImport;
            
            importRemaining.set(importRecord.id, newRemaining);
            transactionRemaining -= consumedFromThisImport;

            console.log(`    → Deducted ${consumedFromThisImport}L from Import ${importRecord.id} (${importRecord.import_date})`);
            console.log(`      Remaining in Import: ${newRemaining}L`);
          }
        }
      }

      if (transactionRemaining > 0) {
        console.log(`    ⚠️ Warning: Transaction has ${transactionRemaining}L not matched to any import (possible negative inventory)`);
      }
    }

    // 4. Build final inventory report
    for (const importRecord of imports) {
      const remaining = importRemaining.get(importRecord.id) || 0;
      const consumed = importRecord.quantity - remaining;

      fifoInventory.push({
        import_id: importRecord.id,
        import_date: importRecord.import_date,
        original_quantity: importRecord.quantity,
        consumed_quantity: consumed,
        remaining_quantity: remaining,
        avg_price: importRecord.avg_price,
        unit_price: importRecord.unit_price,
      });

      console.log(`  ✓ Import ${importRecord.id}: ${remaining}L remaining (consumed ${consumed}L of ${importRecord.quantity}L)`);
    }

    // 5. Tính tổng tồn kho và giá trị
    const totalRemaining = fifoInventory.reduce((sum, item) => sum + item.remaining_quantity, 0);
    const totalValue = fifoInventory.reduce(
      (sum, item) => sum + (item.remaining_quantity * item.avg_price),
      0
    );
    const currentAvgPrice = totalRemaining > 0 ? totalValue / totalRemaining : 0;

    console.log('========================================');
    console.log('📊 FIFO CALCULATION RESULTS:');
    console.log(`  - Total Remaining: ${totalRemaining.toFixed(2)} L`);
    console.log(`  - Total Value: ${totalValue.toFixed(2)} VND`);
    console.log(`  - Current Avg Price: ${currentAvgPrice.toFixed(2)} VND/L`);
    console.log('========================================');

    // 6. Filter chỉ lấy những PO còn tồn
    const inventoryWithStock = fifoInventory.filter(item => item.remaining_quantity > 0);

    return NextResponse.json({
      success: true,
      data: {
        inventory: inventoryWithStock,
        summary: {
          total_remaining: Math.max(0, totalRemaining),
          total_value: Math.max(0, totalValue),
          current_avg_price: currentAvgPrice,
          total_imports: imports.length,
          total_transactions: transactions.length,
          items_with_stock: inventoryWithStock.length,
        }
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('========================================');
    console.error('❌ FIFO INVENTORY ERROR');
    console.error('Error:', error);
    console.error('========================================');

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to calculate FIFO inventory',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
