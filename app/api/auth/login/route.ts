import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { createSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();

        console.log('[AUTH_LOGIN] Attempt login for email:', email);

        if (!email) {
            return NextResponse.json(
                { message: 'Vui lòng nhập Email' },
                { status: 400 }
            );
        }

        // Lookup user in database
        const result = await sql`
      SELECT 
        ma_nhan_vien as "maNhanVien",
        ho_va_ten as "hoVaTen",
        email,
        phan_quyen as "phanQuyen",
        is_active as "isActive"
      FROM nhan_vien
      WHERE LOWER(email) = LOWER(${email})
      LIMIT 1
    `;

        console.log('[AUTH_LOGIN] Query result:', {
            found: result.rows.length > 0,
            rowCount: result.rows.length
        });

        if (result.rows.length === 0) {
            return NextResponse.json(
                { message: 'Từ chối đăng nhập, bạn không phải là nhân viên của NAK' },
                { status: 401 }
            );
        }

        const user = result.rows[0];

        console.log('[AUTH_LOGIN] User found:', {
            email: user.email,
            maNhanVien: user.maNhanVien,
            phanQuyen: user.phanQuyen,
            isActive: user.isActive
        });

        // Check if user is active
        if (!user.isActive) {
            return NextResponse.json(
                { message: 'Tài khoản của bạn hiện đang bị khóa' },
                { status: 403 }
            );
        }

        // Check if user is admin
        if (user.phanQuyen && user.phanQuyen.toLowerCase() !== 'admin') {
            return NextResponse.json(
                { message: 'Từ chối đăng nhập, bạn không phải là quản trị viên của NAK' },
                { status: 403 }
            );
        }

        // Create session
        await createSession({
            email: user.email,
            name: user.hoVaTen,
            role: user.phanQuyen,
            maNhanVien: user.maNhanVien,
        });

        console.log('[AUTH_LOGIN] Session created successfully for:', user.email);

        return NextResponse.json({
            success: true,
            user: {
                email: user.email,
                name: user.hoVaTen,
                role: user.phanQuyen,
            },
        });

    } catch (error) {
        console.error('[AUTH_LOGIN_ERROR]', error);
        console.error('[AUTH_LOGIN_ERROR] Stack:', error instanceof Error ? error.stack : 'No stack trace');
        
        // Better error messages for different error types
        let errorMessage = 'Đã xảy ra lỗi trong quá trình đăng nhập';
        
        if (error instanceof Error) {
            // Database connection errors
            if (error.message.includes('connect') || error.message.includes('ECONNREFUSED')) {
                errorMessage = 'Không thể kết nối đến database. Vui lòng thử lại sau.';
            } else if (error.message.includes('timeout')) {
                errorMessage = 'Kết nối database timeout. Vui lòng thử lại.';
            }
        }
        
        return NextResponse.json(
            { message: errorMessage, error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined },
            { status: 500 }
        );
    }
}
