import nodemailer from 'nodemailer';
import { getSetting } from './db/schema';

// 建立 email transporter（需要在環境變數中設定 SMTP 資訊）
function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  });
}

interface SalarySlipData {
  employeeName: string;
  employeeId: string;
  email: string;
  year: number;
  month: number;
  baseSalary: number;
  overtimePay: number;
  bonus: number;
  laborInsurance: number;
  healthInsurance: number;
  deductions: number;
  netSalary: number;
  workDays: number;
  leaveDays: number;
  overtimeHours: number;
}

export async function sendSalarySlip(data: SalarySlipData): Promise<boolean> {
  const companyName = getSetting('company_name') || '公司';
  const transporter = getTransporter();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Microsoft JhengHei', Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { border: 1px solid #e5e7eb; padding: 20px; border-radius: 0 0 8px 8px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f3f4f6; font-weight: 600; }
        .total { font-size: 1.2em; font-weight: bold; color: #1e40af; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
        .amount { text-align: right; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${companyName}</h1>
          <h2>${data.year} 年 ${data.month} 月 薪資明細</h2>
        </div>
        <div class="content">
          <p><strong>員工姓名：</strong>${data.employeeName}</p>
          <p><strong>員工編號：</strong>${data.employeeId}</p>

          <h3>出勤統計</h3>
          <table>
            <tr><td>出勤天數</td><td class="amount">${data.workDays} 天</td></tr>
            <tr><td>請假天數</td><td class="amount">${data.leaveDays} 天</td></tr>
            <tr><td>加班時數</td><td class="amount">${data.overtimeHours} 小時</td></tr>
          </table>

          <h3>薪資明細</h3>
          <table>
            <tr><th>項目</th><th class="amount">金額 (NT$)</th></tr>
            <tr><td>底薪</td><td class="amount">${data.baseSalary.toLocaleString()}</td></tr>
            <tr><td>加班費</td><td class="amount">${data.overtimePay.toLocaleString()}</td></tr>
            <tr><td>獎金</td><td class="amount">${data.bonus.toLocaleString()}</td></tr>
            <tr><td>勞保費（自付）</td><td class="amount">-${data.laborInsurance.toLocaleString()}</td></tr>
            <tr><td>健保費（自付）</td><td class="amount">-${data.healthInsurance.toLocaleString()}</td></tr>
            <tr><td>其他扣款</td><td class="amount">-${data.deductions.toLocaleString()}</td></tr>
          </table>

          <table>
            <tr>
              <td class="total">實發金額</td>
              <td class="amount total">NT$ ${data.netSalary.toLocaleString()}</td>
            </tr>
          </table>
        </div>
        <div class="footer">
          <p>此為系統自動發送之薪資明細，如有疑問請洽人資部門。</p>
          <p>${companyName} &copy; ${data.year}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"${companyName} 人資系統" <${process.env.SMTP_USER}>`,
      to: data.email,
      subject: `【${companyName}】${data.year}年${data.month}月 薪資明細`,
      html,
    });
    return true;
  } catch (error) {
    console.error('Failed to send salary slip:', error);
    return false;
  }
}
