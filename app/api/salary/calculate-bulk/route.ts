/**
 * API: Calculate salary for all employees (Bulk)
 * POST /api/salary/calculate-bulk
 * 
 * Body: { thang, nam }
 * 
 * Tối ưu: Chỉ 4 queries cho tất cả nhân viên
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateBulkSalary, saveSalaryComponents } from '@/lib/salary-calculator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { thang, nam } = body;
    
    // Validation
    if (!thang || !nam) {
      return NextResponse.json(
        { error: 'Missing required fields: thang, nam' },
        { status: 400 }
      );
    }
    
    if (thang < 1 || thang > 12) {
      return NextResponse.json(
        { error: 'Invalid month. Must be between 1-12' },
        { status: 400 }
      );
    }
    
    console.log(`🔄 Starting bulk calculation for ${thang}/${nam}...`);
    
    // Calculate for all employees
    const result = await calculateBulkSalary(thang, nam);
    
    console.log(`📊 Calculated ${result.processed} employees, saving to database...`);
    
    // Save all components to database
    let savedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    for (const components of result.components) {
      try {
        await saveSalaryComponents(components);
        savedCount++;
      } catch (error: any) {
        errorCount++;
        errors.push(`${components.ma_nhan_vien}: ${error.message}`);
        console.error(`Error saving ${components.ma_nhan_vien}:`, error.message);
      }
    }
    
    console.log(`✅ Saved ${savedCount}/${result.processed} salary records`);
    
    return NextResponse.json({
      success: true,
      message: `Đã tính lương cho ${savedCount}/${result.processed} nhân viên`,
      data: {
        thang,
        nam,
        total_employees: result.processed,
        saved: savedCount,
        errors: errorCount,
        error_details: errors.length > 0 ? errors : undefined,
        sample: result.components.slice(0, 3), // Show first 3 as sample
      },
    });
  } catch (error: any) {
    console.error('Error in calculate-bulk:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
