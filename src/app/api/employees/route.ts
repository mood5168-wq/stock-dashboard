import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, hashPassword } from '@/lib/auth';
import { getDb } from '@/lib/db/schema';

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: '未登入' }, { status: 401 });

  if (user.role === 'employee') {
    return NextResponse.json({ error: '無權限' }, { status: 403 });
  }

  const db = getDb();
  const employees = db.prepare(`
    SELECT id, employee_id, name, email, role, department, monthly_salary, hourly_rate, phone, active, created_at
    FROM users ORDER BY employee_id ASC
  `).all();

  return NextResponse.json({ employees });
}

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: '未登入' }, { status: 401 });

  if (user.role !== 'admin') {
    return NextResponse.json({ error: '無權限' }, { status: 403 });
  }

  const { employee_id, name, email, password, role, department, monthly_salary, hourly_rate, phone } =
    await request.json();

  if (!employee_id || !name || !email || !password) {
    return NextResponse.json({ error: '請填寫必要欄位' }, { status: 400 });
  }

  const db = getDb();
  try {
    const result = db.prepare(`
      INSERT INTO users (employee_id, name, email, password, role, department, monthly_salary, hourly_rate, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      employee_id, name, email, hashPassword(password),
      role || 'employee', department || null,
      monthly_salary || 0, hourly_rate || 0, phone || null
    );
    return NextResponse.json({ message: '員工新增成功', id: result.lastInsertRowid });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNIQUE')) {
      return NextResponse.json({ error: '員工編號或 Email 已存在' }, { status: 400 });
    }
    throw error;
  }
}

export async function PUT(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: '未登入' }, { status: 401 });

  if (user.role !== 'admin') {
    return NextResponse.json({ error: '無權限' }, { status: 403 });
  }

  const { id, name, email, password, role, department, monthly_salary, hourly_rate, phone, active } =
    await request.json();

  if (!id) return NextResponse.json({ error: '缺少員工 ID' }, { status: 400 });

  const db = getDb();
  const updates: string[] = [];
  const params: (string | number)[] = [];

  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (email !== undefined) { updates.push('email = ?'); params.push(email); }
  if (password) { updates.push('password = ?'); params.push(hashPassword(password)); }
  if (role !== undefined) { updates.push('role = ?'); params.push(role); }
  if (department !== undefined) { updates.push('department = ?'); params.push(department); }
  if (monthly_salary !== undefined) { updates.push('monthly_salary = ?'); params.push(monthly_salary); }
  if (hourly_rate !== undefined) { updates.push('hourly_rate = ?'); params.push(hourly_rate); }
  if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
  if (active !== undefined) { updates.push('active = ?'); params.push(active); }

  updates.push("updated_at = datetime('now', 'localtime')");
  params.push(id);

  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  return NextResponse.json({ message: '員工資料已更新' });
}
