import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { createSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();

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

        if (result.rows.length === 0) {
            return NextResponse.json(
                { message: 'Từ chối đăng nhập, bạn không phải là nhân viên của NAK' },
                { status: 401 }
            );
        }

        const user = result.rows[0];

        // Check if user is active
        if (!user.isActive) {
            return NextResponse.json(
                { message: 'Tài khoản của bạn hiện đang bị khóa' },
                { status: 403 }
            );
        }

        // Check if user is admin
        if (user.phanQuyen.toLowerCase() !== 'admin') {
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
        return NextResponse.json(
            { message: 'Đã xảy ra lỗi trong quá trình đăng nhập' },
            { status: 500 }
        );
    }
}
