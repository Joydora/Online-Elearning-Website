import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@elearning.vn';
const FROM_NAME = process.env.FROM_NAME || 'E-Learning Platform';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || FROM_EMAIL; // Email nhận feedback

// Create transporter
const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
    },
});

// Verify connection (optional, for debugging)
export async function verifyEmailConnection(): Promise<boolean> {
    try {
        await transporter.verify();
        console.log('✅ Email server connection verified');
        return true;
    } catch (error) {
        console.warn('⚠️ Email server connection failed:', (error as Error).message);
        console.warn('Email features will be disabled. Set SMTP_USER and SMTP_PASS in .env');
        return false;
    }
}

// Send verification email
export async function sendVerificationEmail(
    to: string,
    username: string,
    verificationToken: string
): Promise<boolean> {
    const verificationUrl = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Xác thực email</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">E-Learning</h1>
                            <p style="margin: 10px 0 0; color: #fecaca; font-size: 14px;">Nền tảng học trực tuyến hàng đầu</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px;">Xác thực địa chỉ email</h2>
                            <p style="margin: 0 0 15px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                Xin chào <strong>${username}</strong>,
                            </p>
                            <p style="margin: 0 0 25px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                Cảm ơn bạn đã đăng ký tài khoản tại E-Learning. Vui lòng click vào nút bên dưới để xác thực địa chỉ email của bạn:
                            </p>
                            
                            <!-- Button -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="${verificationUrl}" 
                                           style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 8px; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.3);">
                                            Xác thực email
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 25px 0 15px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                Hoặc copy và dán link sau vào trình duyệt:
                            </p>
                            <p style="margin: 0 0 25px; padding: 12px; background-color: #f3f4f6; border-radius: 4px; word-break: break-all;">
                                <a href="${verificationUrl}" style="color: #dc2626; font-size: 14px; text-decoration: none;">
                                    ${verificationUrl}
                                </a>
                            </p>
                            
                            <p style="margin: 0 0 10px; color: #9ca3af; font-size: 14px;">
                                ⏰ Link xác thực sẽ hết hạn sau <strong>24 giờ</strong>.
                            </p>
                            <p style="margin: 0; color: #9ca3af; font-size: 14px;">
                                Nếu bạn không đăng ký tài khoản này, vui lòng bỏ qua email này.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 10px; color: #6b7280; font-size: 12px; text-align: center;">
                                © 2024 E-Learning Platform. All rights reserved.
                            </p>
                            <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                                123 Đường ABC, Quận 1, TP. Hồ Chí Minh
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;

    const textContent = `
Xác thực địa chỉ email - E-Learning

Xin chào ${username},

Cảm ơn bạn đã đăng ký tài khoản tại E-Learning. 
Vui lòng click vào link sau để xác thực email của bạn:

${verificationUrl}

Link xác thực sẽ hết hạn sau 24 giờ.

Nếu bạn không đăng ký tài khoản này, vui lòng bỏ qua email này.

---
E-Learning Platform
    `;

    try {
        await transporter.sendMail({
            from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
            to,
            subject: '🔐 Xác thực địa chỉ email - E-Learning',
            text: textContent,
            html: htmlContent,
        });
        console.log(`✅ Verification email sent to ${to}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to send verification email:', (error as Error).message);
        return false;
    }
}

// Send password reset email (for future use)
export async function sendPasswordResetEmail(
    to: string,
    username: string,
    resetToken: string
): Promise<boolean> {
    const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Đặt lại mật khẩu</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px;">E-Learning</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 20px; color: #1f2937;">Đặt lại mật khẩu</h2>
                            <p style="color: #4b5563; line-height: 1.6;">Xin chào <strong>${username}</strong>,</p>
                            <p style="color: #4b5563; line-height: 1.6;">Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
                            <table role="presentation" style="width: 100%;">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="${resetUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 8px;">
                                            Đặt lại mật khẩu
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <p style="color: #9ca3af; font-size: 14px;">Link sẽ hết hạn sau 1 giờ.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;

    try {
        await transporter.sendMail({
            from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
            to,
            subject: '🔑 Đặt lại mật khẩu - E-Learning',
            text: `Đặt lại mật khẩu: ${resetUrl}`,
            html: htmlContent,
        });
        return true;
    } catch (error) {
        console.error('Failed to send password reset email:', error);
        return false;
    }
}

// Send contact/feedback email
export async function sendContactEmail(
    name: string,
    email: string,
    subject: string,
    message: string
): Promise<boolean> {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yêu cầu hỗ trợ mới</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">E-Learning</h1>
                            <p style="margin: 10px 0 0; color: #fecaca; font-size: 14px;">Yêu cầu hỗ trợ mới</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px;">Yêu cầu hỗ trợ từ khách hàng</h2>
                            
                            <div style="background-color: #f9fafb; border-left: 4px solid #dc2626; padding: 20px; margin-bottom: 20px; border-radius: 4px;">
                                <p style="margin: 0 0 10px; color: #4b5563; font-size: 16px;">
                                    <strong style="color: #1f2937;">Tên:</strong> ${name}
                                </p>
                                <p style="margin: 0 0 10px; color: #4b5563; font-size: 16px;">
                                    <strong style="color: #1f2937;">Email:</strong> 
                                    <a href="mailto:${email}" style="color: #dc2626; text-decoration: none;">${email}</a>
                                </p>
                                <p style="margin: 0; color: #4b5563; font-size: 16px;">
                                    <strong style="color: #1f2937;">Chủ đề:</strong> ${subject}
                                </p>
                            </div>
                            
                            <div style="margin-bottom: 20px;">
                                <h3 style="margin: 0 0 10px; color: #1f2937; font-size: 18px;">Nội dung:</h3>
                                <div style="padding: 15px; background-color: #f3f4f6; border-radius: 4px; color: #4b5563; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">
${message}
                                </div>
                            </div>
                            
                            <div style="padding: 15px; background-color: #fef3c7; border-radius: 4px; border-left: 4px solid #f59e0b;">
                                <p style="margin: 0; color: #92400e; font-size: 14px;">
                                    <strong>⚠️ Lưu ý:</strong> Vui lòng phản hồi email này trong vòng 24 giờ.
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
                                © 2024 E-Learning Platform. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;

    const textContent = `
Yêu cầu hỗ trợ mới - E-Learning

Tên: ${name}
Email: ${email}
Chủ đề: ${subject}

Nội dung:
${message}

---
E-Learning Platform
    `;

    try {
        // Send to admin
        await transporter.sendMail({
            from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
            to: ADMIN_EMAIL,
            replyTo: email, // Allow admin to reply directly to user
            subject: `[Hỗ trợ] ${subject} - ${name}`,
            text: textContent,
            html: htmlContent,
        });

        // Send confirmation to user
        const confirmationHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Xác nhận yêu cầu hỗ trợ</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px;">E-Learning</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 20px; color: #1f2937;">Cảm ơn bạn đã liên hệ!</h2>
                            <p style="color: #4b5563; line-height: 1.6;">
                                Xin chào <strong>${name}</strong>,
                            </p>
                            <p style="color: #4b5563; line-height: 1.6;">
                                Chúng tôi đã nhận được yêu cầu hỗ trợ của bạn với chủ đề: <strong>"${subject}"</strong>
                            </p>
                            <p style="color: #4b5563; line-height: 1.6;">
                                Đội ngũ hỗ trợ của chúng tôi sẽ xem xét và phản hồi bạn trong thời gian sớm nhất (thường trong vòng 24 giờ).
                            </p>
                            <div style="margin: 30px 0; padding: 15px; background-color: #f3f4f6; border-radius: 4px;">
                                <p style="margin: 0; color: #6b7280; font-size: 14px;">
                                    <strong>Mã yêu cầu:</strong> #${Date.now()}
                                </p>
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `;

        await transporter.sendMail({
            from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
            to: email,
            subject: `[E-Learning] Xác nhận yêu cầu hỗ trợ: ${subject}`,
            text: `Cảm ơn bạn đã liên hệ! Chúng tôi đã nhận được yêu cầu hỗ trợ của bạn và sẽ phản hồi trong vòng 24 giờ.`,
            html: confirmationHtml,
        });

        console.log(`✅ Contact email sent from ${email} to ${ADMIN_EMAIL}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to send contact email:', (error as Error).message);
        return false;
    }
}

// EPIC 2: Course rejection notification
export async function sendRejectionEmail(
    to: string,
    username: string,
    courseTitle: string,
    reason: string,
): Promise<boolean> {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Khoá học bị từ chối</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">E-Learning</h1>
                            <p style="margin: 10px 0 0; color: #fecaca; font-size: 14px;">Khoá học bị từ chối</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px;">Khoá học chưa được duyệt</h2>
                            <p style="margin: 0 0 15px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                Xin chào <strong>${username}</strong>,
                            </p>
                            <p style="margin: 0 0 15px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                Rất tiếc, khoá học <strong>"${courseTitle}"</strong> của bạn chưa đáp ứng yêu cầu phê duyệt và đã bị từ chối.
                            </p>
                            <div style="margin: 25px 0; padding: 20px; background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px;">
                                <h3 style="margin: 0 0 10px; color: #991b1b; font-size: 16px;">Lý do từ chối:</h3>
                                <p style="margin: 0; color: #7f1d1d; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${reason}</p>
                            </div>
                            <p style="margin: 0 0 15px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                Vui lòng chỉnh sửa khoá học theo phản hồi và gửi lại để được duyệt. Đội ngũ kiểm duyệt sẵn sàng hỗ trợ bạn.
                            </p>
                            <table role="presentation" style="width: 100%;">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="${FRONTEND_URL}/dashboard" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 8px;">
                                            Mở dashboard giảng viên
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
                                © 2026 E-Learning Platform. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

    const textContent = `Khoá học "${courseTitle}" bị từ chối

Xin chào ${username},

Khoá học của bạn chưa được phê duyệt.

Lý do: ${reason}

Vui lòng chỉnh sửa và gửi lại.

E-Learning Platform`;

    try {
        await transporter.sendMail({
            from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
            to,
            subject: `[E-Learning] Khoá học "${courseTitle}" bị từ chối`,
            text: textContent,
            html: htmlContent,
        });
        console.log(`✅ Rejection email sent to ${to}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to send rejection email:', (error as Error).message);
        return false;
    }
}

// EPIC 2: Enrollment expiry reminder
export async function sendEnrollmentExpiryReminder(
    to: string,
    name: string,
    courseTitle: string,
    daysLeft: number,
): Promise<boolean> {
    try {
        const html = `
<!DOCTYPE html>
<html>
<body style="font-family:'Segoe UI',sans-serif;background:#f4f4f4;margin:0;padding:0;">
  <table style="max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;">
    <tr><td style="background:linear-gradient(135deg,#dc2626,#991b1b);padding:32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;">E-Learning Platform</h1>
    </td></tr>
    <tr><td style="padding:32px;">
      <h2 style="color:#111827;">Khoá học sắp hết hạn!</h2>
      <p>Xin chào <strong>${name}</strong>,</p>
      <p>Quyền truy cập khoá học <strong>"${courseTitle}"</strong> của bạn sẽ hết hạn sau <strong>${daysLeft} ngày</strong>.</p>
      <p>Hãy đăng nhập và học ngay để không bỏ lỡ nội dung!</p>
      <a href="${FRONTEND_URL}/my-courses" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Học ngay</a>
      <p style="color:#6b7280;font-size:13px;">Nếu bạn muốn gia hạn, hãy liên hệ với chúng tôi.</p>
    </td></tr>
  </table>
</body>
</html>`;

        await transporter.sendMail({
            from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
            to,
            subject: `[E-Learning] Khoá học "${courseTitle}" hết hạn sau ${daysLeft} ngày`,
            html,
        });
        return true;
    } catch {
        return false;
    }
}

