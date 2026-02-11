import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import ExcelJS from 'exceljs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    if (!month || !year) {
      return NextResponse.json(
        { error: 'Month and year are required' },
        { status: 400 }
      );
    }

    const result = await query(
      `SELECT 
        ma_tai_xe,
        ten_tai_xe,
        email,
        hang_muc,
        so_tien
      FROM du_lieu_bhxh
      WHERE thang = $1 AND nam = $2
      ORDER BY ten_tai_xe ASC`,
      [parseInt(month), parseInt(year)]
    );

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('BHXH');

    // Add title
    worksheet.mergeCells('A1:E1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `DỮ LIỆU BHXH - THÁNG ${month}/${year}`;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Add headers
    const headers = ['Mã tài xế', 'Tên tài xế', 'Email', 'Hạng mục', 'Số tiền'];
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9D9D9' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Add data rows
    result.rows.forEach((row: any) => {
      const dataRow = worksheet.addRow([
        row.ma_tai_xe,
        row.ten_tai_xe,
        row.email,
        row.hang_muc,
        row.so_tien
      ]);
      
      dataRow.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        
        // Format currency for so_tien column
        if (colNumber === 5 && cell.value) {
          cell.numFmt = '#,##0';
        }
      });
    });

    // Auto-fit columns
    worksheet.columns = [
      { key: 'ma_tai_xe', width: 15 },
      { key: 'ten_tai_xe', width: 25 },
      { key: 'email', width: 30 },
      { key: 'hang_muc', width: 30 },
      { key: 'so_tien', width: 15 }
    ];

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="bhxh_${month}_${year}.xlsx"`
      }
    });
  } catch (error: any) {
    console.error('Error exporting BHXH data:', error);
    return NextResponse.json(
      { error: 'Failed to export BHXH data', details: error.message },
      { status: 500 }
    );
  }
}
