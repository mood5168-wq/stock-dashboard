import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getDb } from '@/lib/db/schema';
import { sendSalarySlip } from '@/lib/email';

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: '未登入' }, { status: 401 });

  const db = getDb();
  const { searchParams } = new URL(request.url);
  const year = searchParams.get('year');
  const month = searchParams.get('month');

  let query = `
    SELECT sr.*, u.name, u.employee_id, u.email
    FROM salary_records sr
    JOIN users u ON sr.user_id = u.id
  `;
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (user.role === 'employee') {
    conditions.push('sr.user_id = ?');
    params.push(user.id);
  }

  if (year) { conditions.push('sr.year = ?'); params.push(parseInt(year)); }
  if (month) { conditions.push('sr.month = ?'); params.push(parseInt(month)); }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY sr.year DESC, sr.month DESC, u.employee_id ASC';

  const records = db.prepare(query).all();
  return NextResponse.json({ records });
}

// 計算月薪
export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: '未登入' }, { status: 401 });

  if (user.role !== 'admin') {
    return NextResponse.json({ error: '無權限' }, { status: 403 });
  }

  const { year, month } = await request.json();
  if (!year || !month) {
    return NextResponse.json({ error: '請指定年月' }, { status: 400 });
  }

  const db = getDb();
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  // 取得所有在職員工
  const employees = db.prepare(
    'SELECT * FROM users WHERE active = 1'
  ).all() as {
    id: number; employee_id: string; name: string; email: string;
    monthly_salary: number; hourly_rate: number;
  }[];

  const results = [];

  for (const emp of employees) {
    // 出勤天數
    const attendance = db.prepare(`
      SELECT COUNT(*) as work_days, SUM(work_hours) as total_hours
      FROM attendance
      WHERE user_id = ? AND strftime('%Y-%m', date) = ? AND clock_out IS NOT NULL
    `).get(emp.id, monthStr) as { work_days: number; total_hours: number };

    // 請假天數（已核准的）
    const leaves = db.prepare(`
      SELECT SUM(hours) as total_hours
      FROM leaves
      WHERE user_id = ? AND status = 'approved'
        AND (strftime('%Y-%m', start_date) = ? OR strftime('%Y-%m', end_date) = ?)
    `).get(emp.id, monthStr, monthStr) as { total_hours: number };
    const leaveDays = (leaves.total_hours || 0) / 8;

    // 加班時數（已核准的）
    const overtime = db.prepare(`
      SELECT SUM(hours) as total_hours
      FROM overtime
      WHERE user_id = ? AND status = 'approved' AND strftime('%Y-%m', date) = ?
    `).get(emp.id, monthStr) as { total_hours: number };
    const overtimeHours = overtime.total_hours || 0;

    // 計算薪資
    const baseSalary = emp.monthly_salary;
    const hourlyRate = emp.hourly_rate || (emp.monthly_salary / 30 / 8);
    const overtimePay = Math.round(overtimeHours * hourlyRate * 1.34); // 加班費倍率 1.34
    const laborInsurance = Math.round(baseSalary * 0.023); // 勞保自付 2.3%
    const healthInsurance = Math.round(baseSalary * 0.0211); // 健保自付 2.11%

    // 事假扣薪
    const personalLeaves = db.prepare(`
      SELECT SUM(hours) as total_hours
      FROM leaves
      WHERE user_id = ? AND status = 'approved' AND type = 'personal'
        AND (strftime('%Y-%m', start_date) = ? OR strftime('%Y-%m', end_date) = ?)
    `).get(emp.id, monthStr, monthStr) as { total_hours: number };
    const deductions = Math.round((personalLeaves.total_hours || 0) * hourlyRate);

    const netSalary = baseSalary + overtimePay - laborInsurance - healthInsurance - deductions;

    // 寫入薪資紀錄
    db.prepare(`
      INSERT OR REPLACE INTO salary_records
      (user_id, year, month, base_salary, overtime_pay, deductions, bonus,
       labor_insurance, health_insurance, net_salary, work_days, leave_days, overtime_hours)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)
    `).run(
      emp.id, year, month, baseSalary, overtimePay, deductions,
      laborInsurance, healthInsurance, netSalary,
      attendance.work_days || 0, leaveDays, overtimeHours
    );

    results.push({
      employee_id: emp.employee_id,
      name: emp.name,
      netSalary,
    });
  }

  return NextResponse.json({
    message: `${year}年${month}月薪資計算完成，共 ${results.length} 人`,
    results,
  });
}

// 發送薪資單
export async function PUT(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: '未登入' }, { status: 401 });

  if (user.role !== 'admin') {
    return NextResponse.json({ error: '無權限' }, { status: 403 });
  }

  const { year, month } = await request.json();
  if (!year || !month) {
    return NextResponse.json({ error: '請指定年月' }, { status: 400 });
  }

  const db = getDb();
  const records = db.prepare(`
    SELECT sr.*, u.name, u.employee_id, u.email
    FROM salary_records sr
    JOIN users u ON sr.user_id = u.id
    WHERE sr.year = ? AND sr.month = ? AND sr.sent = 0
  `).all(year, month) as {
    id: number; user_id: number; name: string; employee_id: string; email: string;
    base_salary: number; overtime_pay: number; deductions: number; bonus: number;
    labor_insurance: number; health_insurance: number; net_salary: number;
    work_days: number; leave_days: number; overtime_hours: number;
  }[];

  let sentCount = 0;
  const now = new Date().toLocaleString('sv-SE');

  for (const record of records) {
    const success = await sendSalarySlip({
      employeeName: record.name,
      employeeId: record.employee_id,
      email: record.email,
      year,
      month,
      baseSalary: record.base_salary,
      overtimePay: record.overtime_pay,
      bonus: record.bonus,
      laborInsurance: record.labor_insurance,
      healthInsurance: record.health_insurance,
      deductions: record.deductions,
      netSalary: record.net_salary,
      workDays: record.work_days,
      leaveDays: record.leave_days,
      overtimeHours: record.overtime_hours,
    });

    if (success) {
      db.prepare('UPDATE salary_records SET sent = 1, sent_at = ? WHERE id = ?').run(now, record.id);
      sentCount++;
    }
  }

  return NextResponse.json({
    message: `薪資單已寄出 ${sentCount}/${records.length} 封`,
    sent: sentCount,
    total: records.length,
  });
}
