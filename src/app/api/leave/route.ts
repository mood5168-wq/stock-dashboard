import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getDb } from '@/lib/db/schema';

const LEAVE_TYPE_LABELS: Record<string, string> = {
  annual: '特休',
  sick: '病假',
  personal: '事假',
  marriage: '婚假',
  maternity: '產假',
  paternity: '陪產假',
  funeral: '喪假',
  official: '公假',
  other: '其他',
};

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: '未登入' }, { status: 401 });

  const db = getDb();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const userId = searchParams.get('user_id');

  let query = `
    SELECT l.*, u.name, u.employee_id,
           a.name as approver_name
    FROM leaves l
    JOIN users u ON l.user_id = u.id
    LEFT JOIN users a ON l.approved_by = a.id
  `;
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (user.role === 'employee') {
    conditions.push('l.user_id = ?');
    params.push(user.id);
  } else if (userId) {
    conditions.push('l.user_id = ?');
    params.push(parseInt(userId));
  }

  if (status) {
    conditions.push('l.status = ?');
    params.push(status);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY l.created_at DESC';

  const records = db.prepare(query).all(...params);
  return NextResponse.json({ records, leaveTypes: LEAVE_TYPE_LABELS });
}

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: '未登入' }, { status: 401 });

  const { type, start_date, end_date, hours, reason } = await request.json();

  if (!type || !start_date || !end_date || !hours) {
    return NextResponse.json({ error: '請填寫完整資料' }, { status: 400 });
  }

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO leaves (user_id, type, start_date, end_date, hours, reason)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(user.id, type, start_date, end_date, hours, reason || null);

  return NextResponse.json({
    message: '請假申請已送出',
    id: result.lastInsertRowid,
  });
}

// 審核請假（主管/管理員）
export async function PUT(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: '未登入' }, { status: 401 });

  if (user.role === 'employee') {
    return NextResponse.json({ error: '無權限' }, { status: 403 });
  }

  const { id, action, reject_reason } = await request.json();
  if (!id || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: '無效的操作' }, { status: 400 });
  }

  const db = getDb();
  const now = new Date().toLocaleString('sv-SE');
  const newStatus = action === 'approve' ? 'approved' : 'rejected';

  db.prepare(`
    UPDATE leaves SET status = ?, approved_by = ?, approved_at = ?, reject_reason = ?
    WHERE id = ? AND status = 'pending'
  `).run(newStatus, user.id, now, reject_reason || null, id);

  return NextResponse.json({
    message: action === 'approve' ? '已核准' : '已駁回',
  });
}
