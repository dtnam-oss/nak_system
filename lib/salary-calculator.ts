/**
 * Salary Calculator Service
 * Tính toán tự động các hạng mục trong Lương tổng hợp
 * Nguồn dữ liệu: chi_phi_sua_chua, luong_tai_xe
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: false,
});

export interface SalaryComponents {
  ma_nhan_vien: string;
  ten_nhan_vien: string;
  email: string;
  chuc_vu: string;
  thang: number;
  nam: number;
  
  // Thu nhập
  luong_bat_dau: number;              // FROM luong_tai_xe
  tong_chi_phi_sua_chua: number;      // FROM chi_phi_sua_chua
  hoan_coc: number;
  chi_phi_do_dau_ngoai: number;
  chi_phi_phat_sinh_new: number;
  thuong: number;
  
  // Khấu trừ
  truy_thu_dau: number;
  truy_thu_ontime: number;
  tru_coc: number;
  tam_ung: number;
  phat_che_tai: number;
  truy_thu_vetc: number;
  phat_nguoi: number;
  tien_lam_the: number;
  bhxh: number;
  khac: number;
  
  // Calculated
  tong_thu_nhap: number;
  tong_khau_tru: number;
  luong_thuc_lanh: number;
}

/**
 * Tính lương cho 1 nhân viên cụ thể
 */
export async function calculateSingleEmployeeSalary(
  ma_nhan_vien: string,
  thang: number,
  nam: number
): Promise<SalaryComponents | null> {
  try {
    // Parallel queries - chỉ 3 queries
    const [employeeResult, maintenanceResult, tripSalaryResult] = await Promise.all([
      // 1. Get employee info
      pool.query(
        `SELECT ma_nhan_vien, ho_va_ten as ten_nhan_vien, email, chuc_vu 
         FROM nhan_vien 
         WHERE ma_nhan_vien = $1`,
        [ma_nhan_vien]
      ),
      
      // 2. Sum maintenance costs
      pool.query(
        `SELECT COALESCE(SUM(so_tien), 0) as total
         FROM chi_phi_sua_chua
         WHERE ma_nhan_vien = $1
           AND EXTRACT(MONTH FROM ngay) = $2
           AND EXTRACT(YEAR FROM ngay) = $3`,
        [ma_nhan_vien, thang, nam]
      ),
      
      // 3. Sum trip salaries
      pool.query(
        `SELECT COALESCE(SUM(luong_tai_xe), 0) as total
         FROM luong_tai_xe
         WHERE ma_tai_xe = $1
           AND EXTRACT(MONTH FROM ngay_tao) = $2
           AND EXTRACT(YEAR FROM ngay_tao) = $3`,
        [ma_nhan_vien, thang, nam]
      ),
    ]);
    
    if (employeeResult.rows.length === 0) {
      return null;
    }
    
    const employee = employeeResult.rows[0];
    const luong_bat_dau = parseFloat(tripSalaryResult.rows[0].total) || 0;
    const tong_chi_phi_sua_chua = parseFloat(maintenanceResult.rows[0].total) || 0;
    
    // Get existing record to preserve manual fields
    const existingResult = await pool.query(
      `SELECT * FROM luong_tong_hop 
       WHERE ma_nhan_vien = $1 AND thang = $2 AND nam = $3`,
      [ma_nhan_vien, thang, nam]
    );
    
    const existing = existingResult.rows[0] || {};
    
    // Build salary components
    const components: SalaryComponents = {
      ma_nhan_vien: employee.ma_nhan_vien,
      ten_nhan_vien: employee.ten_nhan_vien,
      email: employee.email || '',
      chuc_vu: employee.chuc_vu || '',
      thang,
      nam,
      
      // Auto-calculated from source tables
      luong_bat_dau,
      tong_chi_phi_sua_chua,
      
      // Keep existing manual values or default to 0
      hoan_coc: parseFloat(existing.hoan_coc) || 0,
      chi_phi_do_dau_ngoai: parseFloat(existing.chi_phi_do_dau_ngoai) || 0,
      chi_phi_phat_sinh_new: parseFloat(existing.chi_phi_phat_sinh_new) || 0,
      thuong: parseFloat(existing.thuong) || 0,
      
      truy_thu_dau: parseFloat(existing.truy_thu_dau) || 0,
      truy_thu_ontime: parseFloat(existing.truy_thu_ontime) || 0,
      tru_coc: parseFloat(existing.tru_coc) || 0,
      tam_ung: parseFloat(existing.tam_ung) || 0,
      phat_che_tai: parseFloat(existing.phat_che_tai) || 0,
      truy_thu_vetc: parseFloat(existing.truy_thu_vetc) || 0,
      phat_nguoi: parseFloat(existing.phat_nguoi) || 0,
      tien_lam_the: parseFloat(existing.tien_lam_the) || 0,
      bhxh: parseFloat(existing.bhxh) || 0,
      khac: parseFloat(existing.khac) || 0,
      
      // Calculated fields
      tong_thu_nhap: 0,
      tong_khau_tru: 0,
      luong_thuc_lanh: 0,
    };
    
    // Calculate totals
    components.tong_thu_nhap = 
      components.luong_bat_dau +
      components.tong_chi_phi_sua_chua +
      components.hoan_coc +
      components.chi_phi_do_dau_ngoai +
      components.chi_phi_phat_sinh_new +
      components.thuong;
    
    components.tong_khau_tru =
      components.truy_thu_dau +
      components.truy_thu_ontime +
      components.tru_coc +
      components.tam_ung +
      components.phat_che_tai +
      components.truy_thu_vetc +
      components.phat_nguoi +
      components.tien_lam_the +
      components.bhxh +
      components.khac;
    
    components.luong_thuc_lanh = components.tong_thu_nhap - components.tong_khau_tru;
    
    return components;
  } catch (error) {
    console.error('Error calculating single employee salary:', error);
    throw error;
  }
}

/**
 * Tính lương cho tất cả nhân viên (Bulk calculation)
 * Tối ưu: Chỉ 4 queries cho toàn bộ nhân viên
 */
export async function calculateBulkSalary(
  thang: number,
  nam: number
): Promise<{ success: boolean; processed: number; components: SalaryComponents[] }> {
  try {
    // Parallel queries - only 4 queries for ALL employees
    const [employeesResult, maintenanceResult, tripSalaryResult, existingResult] = await Promise.all([
      // 1. Get all active drivers
      pool.query(
        `SELECT ma_nhan_vien, ho_va_ten as ten_nhan_vien, email, chuc_vu
         FROM nhan_vien
         WHERE tinh_trang_cong_tac = 'Đang làm việc'
           AND (chuc_vu LIKE '%Tài xế%' OR chuc_vu LIKE '%Lái xe%')`
      ),
      
      // 2. Aggregate maintenance costs for ALL employees
      pool.query(
        `SELECT 
           ma_nhan_vien,
           SUM(so_tien) as tong_chi_phi_sua_chua
         FROM chi_phi_sua_chua
         WHERE EXTRACT(MONTH FROM ngay) = $1
           AND EXTRACT(YEAR FROM ngay) = $2
           AND ma_nhan_vien IS NOT NULL
         GROUP BY ma_nhan_vien`,
        [thang, nam]
      ),
      
      // 3. Aggregate trip salaries for ALL employees
      pool.query(
        `SELECT 
           ma_tai_xe,
           SUM(luong_tai_xe) as luong_bat_dau
         FROM luong_tai_xe
         WHERE EXTRACT(MONTH FROM ngay_tao) = $1
           AND EXTRACT(YEAR FROM ngay_tao) = $2
           AND ma_tai_xe IS NOT NULL
         GROUP BY ma_tai_xe`,
        [thang, nam]
      ),
      
      // 4. Get existing records to preserve manual fields
      pool.query(
        `SELECT * FROM luong_tong_hop
         WHERE thang = $1 AND nam = $2`,
        [thang, nam]
      ),
    ]);
    
    // Create HashMaps for O(1) lookup
    const maintenanceMap = new Map<string, number>();
    maintenanceResult.rows.forEach(row => {
      maintenanceMap.set(row.ma_nhan_vien, parseFloat(row.tong_chi_phi_sua_chua) || 0);
    });
    
    const tripSalaryMap = new Map<string, number>();
    tripSalaryResult.rows.forEach(row => {
      tripSalaryMap.set(row.ma_tai_xe, parseFloat(row.luong_bat_dau) || 0);
    });
    
    const existingMap = new Map<string, any>();
    existingResult.rows.forEach(row => {
      existingMap.set(row.ma_nhan_vien, row);
    });
    
    // Build components for each employee
    const allComponents: SalaryComponents[] = [];
    
    for (const employee of employeesResult.rows) {
      const ma_nhan_vien = employee.ma_nhan_vien;
      const existing = existingMap.get(ma_nhan_vien) || {};
      
      const luong_bat_dau = tripSalaryMap.get(ma_nhan_vien) || 0;
      const tong_chi_phi_sua_chua = maintenanceMap.get(ma_nhan_vien) || 0;
      
      const components: SalaryComponents = {
        ma_nhan_vien: employee.ma_nhan_vien,
        ten_nhan_vien: employee.ten_nhan_vien,
        email: employee.email || '',
        chuc_vu: employee.chuc_vu || '',
        thang,
        nam,
        
        // Auto-calculated
        luong_bat_dau,
        tong_chi_phi_sua_chua,
        
        // Preserve manual values
        hoan_coc: parseFloat(existing.hoan_coc) || 0,
        chi_phi_do_dau_ngoai: parseFloat(existing.chi_phi_do_dau_ngoai) || 0,
        chi_phi_phat_sinh_new: parseFloat(existing.chi_phi_phat_sinh_new) || 0,
        thuong: parseFloat(existing.thuong) || 0,
        
        truy_thu_dau: parseFloat(existing.truy_thu_dau) || 0,
        truy_thu_ontime: parseFloat(existing.truy_thu_ontime) || 0,
        tru_coc: parseFloat(existing.tru_coc) || 0,
        tam_ung: parseFloat(existing.tam_ung) || 0,
        phat_che_tai: parseFloat(existing.phat_che_tai) || 0,
        truy_thu_vetc: parseFloat(existing.truy_thu_vetc) || 0,
        phat_nguoi: parseFloat(existing.phat_nguoi) || 0,
        tien_lam_the: parseFloat(existing.tien_lam_the) || 0,
        bhxh: parseFloat(existing.bhxh) || 0,
        khac: parseFloat(existing.khac) || 0,
        
        tong_thu_nhap: 0,
        tong_khau_tru: 0,
        luong_thuc_lanh: 0,
      };
      
      // Calculate totals
      components.tong_thu_nhap = 
        components.luong_bat_dau +
        components.tong_chi_phi_sua_chua +
        components.hoan_coc +
        components.chi_phi_do_dau_ngoai +
        components.chi_phi_phat_sinh_new +
        components.thuong;
      
      components.tong_khau_tru =
        components.truy_thu_dau +
        components.truy_thu_ontime +
        components.tru_coc +
        components.tam_ung +
        components.phat_che_tai +
        components.truy_thu_vetc +
        components.phat_nguoi +
        components.tien_lam_the +
        components.bhxh +
        components.khac;
      
      components.luong_thuc_lanh = components.tong_thu_nhap - components.tong_khau_tru;
      
      allComponents.push(components);
    }
    
    return {
      success: true,
      processed: allComponents.length,
      components: allComponents,
    };
  } catch (error) {
    console.error('Error calculating bulk salary:', error);
    throw error;
  }
}

/**
 * Save salary components to database
 */
export async function saveSalaryComponents(components: SalaryComponents): Promise<void> {
  const query = `
    INSERT INTO luong_tong_hop (
      ma_nhan_vien, ten_nhan_vien, email, chuc_vu, thang, nam,
      luong_bat_dau, tong_chi_phi_sua_chua, hoan_coc, chi_phi_do_dau_ngoai,
      chi_phi_phat_sinh_new, thuong,
      truy_thu_dau, truy_thu_ontime, tru_coc, tam_ung, phat_che_tai,
      truy_thu_vetc, phat_nguoi, tien_lam_the, bhxh, khac,
      tong_thu_nhap, tong_khau_tru, luong_thuc_lanh
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11, $12,
      $13, $14, $15, $16, $17, $18, $19, $20, $21, $22,
      $23, $24, $25
    )
    ON CONFLICT (ma_nhan_vien, thang, nam)
    DO UPDATE SET
      ten_nhan_vien = EXCLUDED.ten_nhan_vien,
      email = EXCLUDED.email,
      chuc_vu = EXCLUDED.chuc_vu,
      luong_bat_dau = EXCLUDED.luong_bat_dau,
      tong_chi_phi_sua_chua = EXCLUDED.tong_chi_phi_sua_chua,
      hoan_coc = EXCLUDED.hoan_coc,
      chi_phi_do_dau_ngoai = EXCLUDED.chi_phi_do_dau_ngoai,
      chi_phi_phat_sinh_new = EXCLUDED.chi_phi_phat_sinh_new,
      thuong = EXCLUDED.thuong,
      truy_thu_dau = EXCLUDED.truy_thu_dau,
      truy_thu_ontime = EXCLUDED.truy_thu_ontime,
      tru_coc = EXCLUDED.tru_coc,
      tam_ung = EXCLUDED.tam_ung,
      phat_che_tai = EXCLUDED.phat_che_tai,
      truy_thu_vetc = EXCLUDED.truy_thu_vetc,
      phat_nguoi = EXCLUDED.phat_nguoi,
      tien_lam_the = EXCLUDED.tien_lam_the,
      bhxh = EXCLUDED.bhxh,
      khac = EXCLUDED.khac,
      tong_thu_nhap = EXCLUDED.tong_thu_nhap,
      tong_khau_tru = EXCLUDED.tong_khau_tru,
      luong_thuc_lanh = EXCLUDED.luong_thuc_lanh
  `;
  
  await pool.query(query, [
    components.ma_nhan_vien,
    components.ten_nhan_vien,
    components.email,
    components.chuc_vu,
    components.thang,
    components.nam,
    components.luong_bat_dau,
    components.tong_chi_phi_sua_chua,
    components.hoan_coc,
    components.chi_phi_do_dau_ngoai,
    components.chi_phi_phat_sinh_new,
    components.thuong,
    components.truy_thu_dau,
    components.truy_thu_ontime,
    components.tru_coc,
    components.tam_ung,
    components.phat_che_tai,
    components.truy_thu_vetc,
    components.phat_nguoi,
    components.tien_lam_the,
    components.bhxh,
    components.khac,
    components.tong_thu_nhap,
    components.tong_khau_tru,
    components.luong_thuc_lanh,
  ]);
}
