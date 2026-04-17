import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

class EmailService {
  constructor() {
    this.from = `${process.env.EMAIL_FROM_NAME || 'CareNest'} <${process.env.EMAIL_FROM || 'noreply@carenest.com'}>`;
  }

  async sendEmail({ to, subject, html, react }) {
    try {
      const emailData = {
        from: this.from,
        to: Array.isArray(to) ? to : [to],
        subject,
      };

      if (react) {
        emailData.react = react;
      } else {
        emailData.html = html;
      }

      const { data, error } = await resend.emails.send(emailData);

      if (error) {
        console.error('Email sending error:', error);
        throw new Error(error.message || 'Failed to send email');
      }

      console.log('Email sent successfully:', data);
      return { success: true, data };
    } catch (err) {
      console.error('Email service error:', err);
      throw err;
    }
  }

  async sendWelcomeEmail(customerEmail, customerName) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0;">Welcome to CareNest Therapy! 🎉</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Hi <strong>${customerName}</strong>,</p>
            <p style="font-size: 16px;">Thank you for joining CareNest Therapy. We're excited to be part of your wellness journey!</p>
            <p style="font-size: 16px;">Our platform offers:</p>
            <ul style="font-size: 16px;">
              <li>Professional therapy sessions</li>
              <li>Secure and private consultations</li>
              <li>Flexible scheduling</li>
              <li>24/7 support resources</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CORS_ORIGIN || 'http://localhost:5173'}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Get Started
              </a>
            </div>
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              If you have any questions, feel free to reach out to our support team.
            </p>
            <p style="font-size: 14px; color: #666;">
              Best regards,<br>
              <strong>The CareNest Team</strong>
            </p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: customerEmail,
      subject: 'Welcome to CareNest Therapy!',
      html,
    });
  }

  async sendPaymentSuccessEmail(customerEmail, customerName, paymentDetails) {
    const { amount, orderId, paymentId, date } = paymentDetails;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #10b981; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0;">Payment Successful! ✅</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Hi <strong>${customerName}</strong>,</p>
            <p style="font-size: 16px;">Thank you for your payment. Your transaction was successful!</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <h3 style="margin-top: 0; color: #10b981;">Payment Details</h3>
              <table style="width: 100%; font-size: 14px;">
                <tr>
                  <td style="padding: 8px 0; color: #666;">Amount Paid:</td>
                  <td style="padding: 8px 0; text-align: right;"><strong>₹${amount}</strong></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Order ID:</td>
                  <td style="padding: 8px 0; text-align: right;"><strong>${orderId}</strong></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Payment ID:</td>
                  <td style="padding: 8px 0; text-align: right;"><strong>${paymentId}</strong></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Date:</td>
                  <td style="padding: 8px 0; text-align: right;"><strong>${date}</strong></td>
                </tr>
              </table>
            </div>

            <p style="font-size: 16px;">You can now access your therapy sessions and all premium features.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CORS_ORIGIN || 'http://localhost:5173'}/dashboard" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Go to Dashboard
              </a>
            </div>

            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              If you have any questions about your payment, please contact our support team.
            </p>
            <p style="font-size: 14px; color: #666;">
              Best regards,<br>
              <strong>The CareNest Team</strong>
            </p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: customerEmail,
      subject: 'Payment Confirmation - CareNest Therapy',
      html,
    });
  }

  async sendBookingConfirmationEmail(customerEmail, customerName, bookingDetails) {
    const { therapistName, sessionDate, sessionTime, sessionType } = bookingDetails;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #667eea; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0;">Session Confirmed! 📅</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Hi <strong>${customerName}</strong>,</p>
            <p style="font-size: 16px;">Your therapy session has been confirmed!</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h3 style="margin-top: 0; color: #667eea;">Session Details</h3>
              <table style="width: 100%; font-size: 14px;">
                <tr>
                  <td style="padding: 8px 0; color: #666;">Therapist:</td>
                  <td style="padding: 8px 0; text-align: right;"><strong>${therapistName}</strong></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Date:</td>
                  <td style="padding: 8px 0; text-align: right;"><strong>${sessionDate}</strong></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Time:</td>
                  <td style="padding: 8px 0; text-align: right;"><strong>${sessionTime}</strong></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Session Type:</td>
                  <td style="padding: 8px 0; text-align: right;"><strong>${sessionType}</strong></td>
                </tr>
              </table>
            </div>

            <p style="font-size: 16px;">Please join the session at least 5 minutes before the scheduled time.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CORS_ORIGIN || 'http://localhost:5173'}/sessions" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View My Sessions
              </a>
            </div>

            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              Need to reschedule? Contact us at least 24 hours before your session.
            </p>
            <p style="font-size: 14px; color: #666;">
              Best regards,<br>
              <strong>The CareNest Team</strong>
            </p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: customerEmail,
      subject: 'Therapy Session Confirmed - CareNest',
      html,
    });
  }

  async sendPasswordResetEmail(userEmail, resetToken) {
    const resetUrl = `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f59e0b; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0;">Password Reset Request 🔐</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Hello,</p>
            <p style="font-size: 16px;">We received a request to reset your password for your CareNest Therapy account.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Reset Password
              </a>
            </div>

            <p style="font-size: 14px; color: #666;">
              Or copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
            </p>

            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              This link will expire in 1 hour for security reasons.
            </p>

            <p style="font-size: 14px; color: #dc2626; background: #fee2e2; padding: 15px; border-radius: 5px;">
              <strong>⚠️ Important:</strong> If you didn't request this password reset, please ignore this email and your password will remain unchanged.
            </p>

            <p style="font-size: 14px; color: #666;">
              Best regards,<br>
              <strong>The CareNest Team</strong>
            </p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: userEmail,
      subject: 'Password Reset Request - CareNest Therapy',
      html,
    });
  }
}

export default new EmailService();
