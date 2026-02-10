/**
 * API: Calculate salary for single employee
 * POST /api/salary/calculate-single
 * 
 * Body: { ma_nhan_vien, thang, nam }
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateSingleEmployeeSalary, saveSalaryComponents } from '@/lib/salary-calculator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ma_nhan_vien, thang, nam } = body;
    
    // Validation
    if (!ma_nhan_vien || !thang || !nam) {
      return NextResponse.json(
        { error: 'Missing required fields: ma_nhan_vien, thang, nam' },
        { status: 400 }
      );
    }
    
    if (thang < 1 || thang > 12) {
      return NextResponse.json(
        { error: 'Invalid month. Must be between 1-12' },
        { status: 400 }
      );
    }
    
    // Calculate salary components
    const components = await calculateSingleEmployeeSalary(ma_nhan_vien, thang, nam);
    
    if (!components) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }
    
    // Save to database
    await saveSalaryComponents(components);
    
    return NextResponse.json({
      success: true,
      message: `Đã tính lại lương cho ${components.ten_nhan_vien}`,
      data: components,
    });
  } catch (error: any) {
    console.error('Error in calculate-single:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
