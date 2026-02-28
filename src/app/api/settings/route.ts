import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getDb, setSetting } from '@/lib/db/schema';

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: '未登入' }, { status: 401 });

  if (user.role !== 'admin') {
    return NextResponse.json({ error: '無權限' }, { status: 403 });
  }

  const db = getDb();
  const settings = db.prepare('SELECT * FROM settings').all() as { key: string; value: string }[];
  const offices = db.prepare('SELECT * FROM office_locations ORDER BY id').all();

  return NextResponse.json({
    settings: Object.fromEntries(settings.map(s => [s.key, s.value])),
    offices,
  });
}

export async function PUT(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: '未登入' }, { status: 401 });

  if (user.role !== 'admin') {
    return NextResponse.json({ error: '無權限' }, { status: 403 });
  }

  const { settings, office } = await request.json();

  if (settings) {
    for (const [key, value] of Object.entries(settings)) {
      setSetting(key, String(value));
    }
  }

  if (office) {
    const db = getDb();
    if (office.id) {
      db.prepare(`
        UPDATE office_locations SET name = ?, latitude = ?, longitude = ?, radius_meters = ?, active = ?
        WHERE id = ?
      `).run(office.name, office.latitude, office.longitude, office.radius_meters || 200, office.active ?? 1, office.id);
    } else {
      db.prepare(`
        INSERT INTO office_locations (name, latitude, longitude, radius_meters)
        VALUES (?, ?, ?, ?)
      `).run(office.name, office.latitude, office.longitude, office.radius_meters || 200);
    }
  }

  return NextResponse.json({ message: '設定已更新' });
}
