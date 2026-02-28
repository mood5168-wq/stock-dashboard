import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getDb } from '@/lib/db/schema';

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: '未登入' }, { status: 401 });

  const db = getDb();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  let query = `
    SELECT o.*, u.name, u.employee_id, a.name as approver_name
    FROM overtime o
    JOIN users u ON o.user_id = u.id
    LEFT JOIN users a ON o.approved_by = a.id
  `;
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (user.role === 'employee') {
    conditions.push('o.user_id = ?');
    params.push(user.id);
  }

  if (status) {
    conditions.push('o.status = ?');
    params.push(status);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY o.created_at DESC';

  const records = db.prepare(query).all(...params);
  return NextResponse.json({ records });
}

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: '未登入' }, { status: 401 });

  const { date, start_time, end_time, hours, reason } = await request.json();
  if (!date || !start_time || !end_time || !hours) {
    return NextResponse.json({ error: '請填寫完整資料' }, { status: 400 });
  }

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO overtime (user_id, date, start_time, end_time, hours, reason)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(user.id, date, start_time, end_time, hours, reason || null);

  return NextResponse.json({ message: '加班申請已送出', id: result.lastInsertRowid });
}

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
    UPDATE overtime SET status = ?, approved_by = ?, approved_at = ?, reject_reason = ?
    WHERE id = ? AND status = 'pending'
  `).run(newStatus, user.id, now, reject_reason || null, id);

  return NextResponse.json({ message: action === 'approve' ? '已核准' : '已駁回' });
}
