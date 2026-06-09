import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@elearning.vn';
const FROM_NAME = process.env.FROM_NAME || 'E-Learning Platform';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || FROM_EMAIL; // Email for receiving feedback

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
    <title>Verify Email</title>
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
                            <p style="margin: 10px 0 0; color: #fecaca; font-size: 14px;">Leading online learning platform</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px;">Verify your email address</h2>
                            <p style="margin: 0 0 15px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                Hello <strong>${username}</strong>,
                            </p>
                            <p style="margin: 0 0 25px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                Thank you for registering an account at E-Learning. Please click the button below to verify your email address:
                            </p>
                            
                            <!-- Button -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="${verificationUrl}" 
                                           style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 8px; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.3);">
                                            Verify Email
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 25px 0 15px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                Or copy and paste the following link into your browser:
                            </p>
                            <p style="margin: 0 0 25px; padding: 12px; background-color: #f3f4f6; border-radius: 4px; word-break: break-all;">
                                <a href="${verificationUrl}" style="color: #dc2626; font-size: 14px; text-decoration: none;">
                                    ${verificationUrl}
                                </a>
                            </p>
                            
                            <p style="margin: 0 0 10px; color: #9ca3af; font-size: 14px;">
                                ⏰ Verification link will expire in <strong>24 hours</strong>.
                            </p>
                            <p style="margin: 0; color: #9ca3af; font-size: 14px;">
                                If you did not register this account, please ignore this email.
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
                                123 ABC Street, District 1, Ho Chi Minh City
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
Verify your email address - E-Learning

Hello ${username},

Thank you for registering an account at E-Learning. 
Please click the following link to verify your email address:

${verificationUrl}

Verification link will expire in 24 hours.

If you did not register this account, please ignore this email.

---
E-Learning Platform
    `;

    try {
        await transporter.sendMail({
            from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
            to,
            subject: '🔐 Verify email address - E-Learning',
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
    <title>Reset Password</title>
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
                            <h2 style="margin: 0 0 20px; color: #1f2937;">Reset Password</h2>
                            <p style="color: #4b5563; line-height: 1.6;">Hello <strong>${username}</strong>,</p>
                            <p style="color: #4b5563; line-height: 1.6;">We received a request to reset the password for your account.</p>
                            <table role="presentation" style="width: 100%;">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="${resetUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 8px;">
                                            Reset Password
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <p style="color: #9ca3af; font-size: 14px;">Link will expire in 1 hour.</p>
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
            subject: '🔑 Reset password - E-Learning',
            text: `Reset password: ${resetUrl}`,
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
    <title>New Support Request</title>
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
                            <p style="margin: 10px 0 0; color: #fecaca; font-size: 14px;">New support request</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px;">Customer Support Request</h2>
                            
                            <div style="background-color: #f9fafb; border-left: 4px solid #dc2626; padding: 20px; margin-bottom: 20px; border-radius: 4px;">
                                <p style="margin: 0 0 10px; color: #4b5563; font-size: 16px;">
                                    <strong style="color: #1f2937;">Name:</strong> ${name}
                                </p>
                                <p style="margin: 0 0 10px; color: #4b5563; font-size: 16px;">
                                    <strong style="color: #1f2937;">Email:</strong> 
                                    <a href="mailto:${email}" style="color: #dc2626; text-decoration: none;">${email}</a>
                                </p>
                                <p style="margin: 0; color: #4b5563; font-size: 16px;">
                                    <strong style="color: #1f2937;">Subject:</strong> ${subject}
                                </p>
                            </div>
                            
                            <div style="margin-bottom: 20px;">
                                <h3 style="margin: 0 0 10px; color: #1f2937; font-size: 18px;">Content:</h3>
                                <div style="padding: 15px; background-color: #f3f4f6; border-radius: 4px; color: #4b5563; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">
${message}
                                </div>
                            </div>
                            
                            <div style="padding: 15px; background-color: #fef3c7; border-radius: 4px; border-left: 4px solid #f59e0b;">
                                <p style="margin: 0; color: #92400e; font-size: 14px;">
                                    <strong>⚠️ Note:</strong> Please respond to this email within 24 hours.
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
New support request - E-Learning

Name: ${name}
Email: ${email}
Subject: ${subject}

Content:
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
            subject: `[Support] ${subject} - ${name}`,
            text: textContent,
            html: htmlContent,
        });

        // Send confirmation to user
        const confirmationHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Confirm Support Request</title>
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
                            <h2 style="margin: 0 0 20px; color: #1f2937;">Thank you for contacting us!</h2>
                            <p style="color: #4b5563; line-height: 1.6;">
                                Hello <strong>${name}</strong>,
                            </p>
                            <p style="color: #4b5563; line-height: 1.6;">
                                We have received your support request with subject: <strong>"${subject}"</strong>
                            </p>
                            <p style="color: #4b5563; line-height: 1.6;">
                                Our support team will review and respond to you as soon as possible (usually within 24 hours).
                            </p>
                            <div style="margin: 30px 0; padding: 15px; background-color: #f3f4f6; border-radius: 4px;">
                                <p style="margin: 0; color: #6b7280; font-size: 14px;">
                                    <strong>Request ID:</strong> #${Date.now()}
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
            subject: `[E-Learning] Confirm support request: ${subject}`,
            text: `Thank you for contacting us! We have received your support request and will respond within 24 hours.`,
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
    <title>Course Rejected</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">E-Learning</h1>
                            <p style="margin: 10px 0 0; color: #fecaca; font-size: 14px;">Course Rejected</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px;">Course not approved</h2>
                            <p style="margin: 0 0 15px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                Hello <strong>${username}</strong>,
                            </p>
                            <p style="margin: 0 0 15px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                Unfortunately, your course <strong>"${courseTitle}"</strong> does not meet the approval requirements and has been rejected.
                            </p>
                            <div style="margin: 25px 0; padding: 20px; background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px;">
                                <h3 style="margin: 0 0 10px; color: #991b1b; font-size: 16px;">Rejection reason:</h3>
                                <p style="margin: 0; color: #7f1d1d; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${reason}</p>
                            </div>
                            <p style="margin: 0 0 15px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                Please edit the course according to the feedback and resubmit for approval. The review team is ready to assist you.
                            </p>
                            <table role="presentation" style="width: 100%;">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="${FRONTEND_URL}/dashboard" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 8px;">
                                            Open Instructor Dashboard
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

    const textContent = `Course "${courseTitle}" rejected

Hello ${username},

Your course has not been approved.

Reason: ${reason}

Please edit and resubmit.

E-Learning Platform`;

    try {
        await transporter.sendMail({
            from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
            to,
            subject: `[E-Learning] Course "${courseTitle}" rejected`,
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
      <h2 style="color:#111827;">Course expiring soon!</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your access to the course <strong>"${courseTitle}"</strong> will expire in <strong>${daysLeft} days</strong>.</p>
      <p>Please log in and learn now so you don't miss out on the content!</p>
      <a href="${FRONTEND_URL}/my-courses" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Learn Now</a>
      <p style="color:#6b7280;font-size:13px;">If you wish to extend access, please contact us.</p>
    </td></tr>
  </table>
</body>
</html>`;

        await transporter.sendMail({
            from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
            to,
            subject: `[E-Learning] Course "${courseTitle}" expires in ${daysLeft} days`,
            html,
        });
        return true;
    } catch {
        return false;
    }
}

export async function sendNotificationEmail(
    to: string,
    name: string,
    title: string,
    message: string,
    link?: string,
): Promise<boolean> {
    const actionLink = link ? `${FRONTEND_URL}${link}` : `${FRONTEND_URL}/profile`;

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family:'Segoe UI',sans-serif;background:#f4f4f4;margin:0;padding:0;">
  <table style="max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;">
    <tr><td style="background:linear-gradient(135deg,#dc2626,#991b1b);padding:28px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;">E-Learning Notification</h1>
    </td></tr>
    <tr><td style="padding:28px;">
      <p>Hello <strong>${name}</strong>,</p>
      <h2 style="color:#111827;margin-top:0;">${title}</h2>
      <p style="color:#374151;line-height:1.6;">${message}</p>
      <a href="${actionLink}" style="display:inline-block;margin-top:14px;padding:12px 22px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">
        View details
      </a>
    </td></tr>
  </table>
</body>
</html>`;

    try {
        await transporter.sendMail({
            from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
            to,
            subject: `[E-Learning] ${title}`,
            text: `${title}\n\n${message}\n\nView details: ${actionLink}`,
            html,
        });
        return true;
    } catch (error) {
        console.error('❌ Failed to send notification email:', (error as Error).message);
        return false;
    }
}

