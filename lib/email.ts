import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

// Create SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send email using SMTP (Brevo)
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const { to, subject, html, from } = options;

    const result = await transporter.sendMail({
      from: from || process.env.SMTP_FROM || 'noreply@yourcompany.com',
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
    });

    console.log('Email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

/**
 * Send expense approval request email
 */
export async function sendApprovalRequestEmail(
  approverEmail: string,
  approverName: string,
  submitterName: string,
  expenseTitle: string,
  expenseAmount: string,
  expenseId: string
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const approvalUrl = `${appUrl}/dashboard/manager/approvals?expense=${expenseId}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { 
            display: inline-block; 
            background: #4F46E5; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px;
            margin: 20px 0;
          }
          .expense-details { 
            background: white; 
            padding: 20px; 
            border-radius: 6px; 
            margin: 20px 0;
            border-left: 4px solid #4F46E5;
          }
          .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">New Expense Approval Request</h1>
          </div>
          <div class="content">
            <p>Hi ${approverName},</p>
            <p>${submitterName} has submitted an expense for your approval.</p>
            
            <div class="expense-details">
              <h3 style="margin-top: 0;">Expense Details</h3>
              <p><strong>Title:</strong> ${expenseTitle}</p>
              <p><strong>Amount:</strong> ${expenseAmount}</p>
              <p><strong>Submitted by:</strong> ${submitterName}</p>
            </div>

            <a href="${approvalUrl}" class="button">Review & Approve</a>

            <p>Please review this expense at your earliest convenience.</p>
            
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: approverEmail,
    subject: `New Expense Approval Request: ${expenseTitle}`,
    html,
  });
}

/**
 * Send expense status update email
 */
export async function sendExpenseStatusEmail(
  userEmail: string,
  userName: string,
  expenseTitle: string,
  status: 'approved' | 'rejected',
  comments?: string
): Promise<boolean> {
  const statusColor = status === 'approved' ? '#10b981' : '#ef4444';
  const statusText = status === 'approved' ? 'Approved' : 'Rejected';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${statusColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .status-badge { 
            background: ${statusColor}; 
            color: white; 
            padding: 8px 16px; 
            border-radius: 20px;
            display: inline-block;
            font-weight: bold;
          }
          .expense-details { 
            background: white; 
            padding: 20px; 
            border-radius: 6px; 
            margin: 20px 0;
          }
          .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">Expense ${statusText}</h1>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>Your expense has been <span class="status-badge">${statusText}</span></p>
            
            <div class="expense-details">
              <h3 style="margin-top: 0;">${expenseTitle}</h3>
              ${comments ? `<p><strong>Comments:</strong> ${comments}</p>` : ''}
            </div>

            ${
              status === 'approved'
                ? '<p>Your reimbursement will be processed according to company policy.</p>'
                : '<p>If you have questions about this decision, please contact your manager.</p>'
            }
            
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: userEmail,
    subject: `Expense ${statusText}: ${expenseTitle}`,
    html,
  });
}

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(
  userEmail: string,
  userName: string,
  tempPassword?: string
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { 
            display: inline-block; 
            background: #4F46E5; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px;
            margin: 20px 0;
          }
          .credentials { 
            background: white; 
            padding: 20px; 
            border-radius: 6px; 
            margin: 20px 0;
            border: 2px dashed #e5e7eb;
          }
          .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">Welcome to Expense Management</h1>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>Your account has been created successfully! You can now submit and track your expense reimbursements.</p>
            
            ${
              tempPassword
                ? `
            <div class="credentials">
              <h3 style="margin-top: 0;">Login Credentials</h3>
              <p><strong>Email:</strong> ${userEmail}</p>
              <p><strong>Temporary Password:</strong> ${tempPassword}</p>
              <p style="color: #ef4444; font-size: 14px;">⚠️ Please change your password after first login.</p>
            </div>
            `
                : ''
            }

            <a href="${appUrl}/login" class="button">Login to Your Account</a>

            <p>If you have any questions, please contact your administrator.</p>
            
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: userEmail,
    subject: 'Welcome to Expense Management System',
    html,
  });
}
