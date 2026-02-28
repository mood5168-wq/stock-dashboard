import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getDb } from '@/lib/db/schema';

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: '未登入' }, { status: 401 });

  if (user.role === 'employee') {
    return NextResponse.json({ error: '無權限' }, { status: 403 });
  }

  const db = getDb();
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month'); // YYYY-MM

  if (!month) {
    return NextResponse.json({ error: '請指定月份' }, { status: 400 });
  }

  // 各員工出勤摘要
  const attendanceSummary = db.prepare(`
    SELECT
      u.id, u.employee_id, u.name, u.department,
      COUNT(CASE WHEN a.clock_in IS NOT NULL THEN 1 END) as total_days,
      COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_days,
      COUNT(CASE WHEN a.status = 'early_leave' THEN 1 END) as early_leave_days,
      ROUND(AVG(a.work_hours), 1) as avg_work_hours,
      ROUND(SUM(a.work_hours), 1) as total_work_hours
    FROM users u
    LEFT JOIN attendance a ON u.id = a.user_id AND strftime('%Y-%m', a.date) = ?
    WHERE u.active = 1
    GROUP BY u.id
    ORDER BY u.employee_id
  `).all(month);

  // 請假統計
  const leaveSummary = db.prepare(`
    SELECT
      u.id, u.employee_id, u.name,
      l.type, SUM(l.hours) as total_hours
    FROM users u
    LEFT JOIN leaves l ON u.id = l.user_id AND l.status = 'approved'
      AND (strftime('%Y-%m', l.start_date) = ? OR strftime('%Y-%m', l.end_date) = ?)
    WHERE u.active = 1
    GROUP BY u.id, l.type
    ORDER BY u.employee_id
  `).all(month, month);

  // 加班統計
  const overtimeSummary = db.prepare(`
    SELECT
      u.id, u.employee_id, u.name,
      ROUND(SUM(o.hours), 1) as total_overtime_hours,
      COUNT(*) as overtime_count
    FROM users u
    LEFT JOIN overtime o ON u.id = o.user_id AND o.status = 'approved'
      AND strftime('%Y-%m', o.date) = ?
    WHERE u.active = 1
    GROUP BY u.id
    ORDER BY u.employee_id
  `).all(month);

  return NextResponse.json({
    month,
    attendanceSummary,
    leaveSummary,
    overtimeSummary,
  });
}
