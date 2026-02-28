import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getDb } from '@/lib/db/schema';

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: '未登入' }, { status: 401 });

  const db = getDb();
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month'); // YYYY-MM
  const userId = searchParams.get('user_id');

  let query = `
    SELECT s.*, u.name, u.employee_id
    FROM schedules s
    JOIN users u ON s.user_id = u.id
  `;
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (user.role === 'employee') {
    conditions.push('s.user_id = ?');
    params.push(user.id);
  } else if (userId) {
    conditions.push('s.user_id = ?');
    params.push(parseInt(userId));
  }

  if (month) {
    conditions.push("strftime('%Y-%m', s.date) = ?");
    params.push(month);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY s.date ASC, u.name ASC';

  const records = db.prepare(query).all(...params);
  return NextResponse.json({ records });
}

// 批次排班（管理員）
export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: '未登入' }, { status: 401 });

  if (user.role === 'employee') {
    return NextResponse.json({ error: '無權限' }, { status: 403 });
  }

  const { schedules } = await request.json() as {
    schedules: { user_id: number; date: string; shift_name: string; start_time: string; end_time: string }[];
  };

  if (!schedules || !Array.isArray(schedules) || schedules.length === 0) {
    return NextResponse.json({ error: '請提供排班資料' }, { status: 400 });
  }

  const db = getDb();
  const insert = db.prepare(`
    INSERT OR REPLACE INTO schedules (user_id, date, shift_name, start_time, end_time)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items: typeof schedules) => {
    for (const s of items) {
      insert.run(s.user_id, s.date, s.shift_name, s.start_time, s.end_time);
    }
  });

  insertMany(schedules);
  return NextResponse.json({ message: `已排定 ${schedules.length} 筆班表` });
}

export async function DELETE(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: '未登入' }, { status: 401 });

  if (user.role === 'employee') {
    return NextResponse.json({ error: '無權限' }, { status: 403 });
  }

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: '請提供排班 ID' }, { status: 400 });

  const db = getDb();
  db.prepare('DELETE FROM schedules WHERE id = ?').run(id);
  return NextResponse.json({ message: '已刪除排班' });
}
