import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getDb, getSetting } from '@/lib/db/schema';

// 取得打卡紀錄
export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: '未登入' }, { status: 401 });

  const db = getDb();
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month'); // format: 2024-01
  const userId = searchParams.get('user_id');

  let query = 'SELECT a.*, u.name, u.employee_id FROM attendance a JOIN users u ON a.user_id = u.id';
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  // 非管理員只能看自己的
  if (user.role === 'employee') {
    conditions.push('a.user_id = ?');
    params.push(user.id);
  } else if (userId) {
    conditions.push('a.user_id = ?');
    params.push(parseInt(userId));
  }

  if (month) {
    conditions.push("strftime('%Y-%m', a.date) = ?");
    params.push(month);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY a.date DESC, a.clock_in DESC';

  const records = db.prepare(query).all(...params);
  return NextResponse.json({ records });
}

// 打卡
export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: '未登入' }, { status: 401 });

  const { action, latitude, longitude, address } = await request.json();

  if (!action || !['clock_in', 'clock_out'].includes(action)) {
    return NextResponse.json({ error: '無效的打卡動作' }, { status: 400 });
  }

  // GPS 驗證
  const gpsRequired = getSetting('gps_required') === 'true';
  if (gpsRequired) {
    if (latitude == null || longitude == null) {
      return NextResponse.json({ error: '需要 GPS 定位才能打卡' }, { status: 400 });
    }

    const maxDistance = parseInt(getSetting('gps_max_distance_meters') || '200');
    const db = getDb();
    const offices = db.prepare('SELECT * FROM office_locations WHERE active = 1').all() as {
      latitude: number; longitude: number; radius_meters: number; name: string;
    }[];

    if (offices.length > 0) {
      const isWithinRange = offices.some(office => {
        const distance = calculateDistance(latitude, longitude, office.latitude, office.longitude);
        return distance <= (office.radius_meters || maxDistance);
      });

      if (!isWithinRange) {
        return NextResponse.json({
          error: '您不在公司打卡範圍內，請確認您的位置',
        }, { status: 400 });
      }
    }
  }

  const db = getDb();
  const today = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD
  const now = new Date().toLocaleString('sv-SE'); // YYYY-MM-DD HH:mm:ss

  if (action === 'clock_in') {
    const existing = db.prepare(
      'SELECT id FROM attendance WHERE user_id = ? AND date = ?'
    ).get(user.id, today);

    if (existing) {
      return NextResponse.json({ error: '今日已打過上班卡' }, { status: 400 });
    }

    // 檢查是否遲到
    const workStartTime = getSetting('work_start_time') || '09:00';
    const lateThreshold = parseInt(getSetting('late_threshold_minutes') || '15');
    const currentTime = new Date();
    const [startHour, startMin] = workStartTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(startHour, startMin + lateThreshold, 0, 0);
    const status = currentTime > startDate ? 'late' : 'normal';

    db.prepare(`
      INSERT INTO attendance (user_id, date, clock_in, clock_in_lat, clock_in_lng, clock_in_address, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(user.id, today, now, latitude || null, longitude || null, address || null, status);

    return NextResponse.json({
      message: status === 'late' ? '上班打卡成功（遲到）' : '上班打卡成功',
      status,
      time: now,
    });
  }

  if (action === 'clock_out') {
    const record = db.prepare(
      'SELECT * FROM attendance WHERE user_id = ? AND date = ?'
    ).get(user.id, today) as { id: number; clock_in: string; clock_out: string } | undefined;

    if (!record) {
      return NextResponse.json({ error: '今日尚未打上班卡' }, { status: 400 });
    }
    if (record.clock_out) {
      return NextResponse.json({ error: '今日已打過下班卡' }, { status: 400 });
    }

    // 計算工時
    const clockIn = new Date(record.clock_in);
    const clockOut = new Date();
    const workHours = Math.round(((clockOut.getTime() - clockIn.getTime()) / 3600000) * 100) / 100;

    // 檢查是否早退
    const workEndTime = getSetting('work_end_time') || '18:00';
    const [endHour, endMin] = workEndTime.split(':').map(Number);
    const endDate = new Date();
    endDate.setHours(endHour, endMin, 0, 0);
    const isEarlyLeave = clockOut < endDate;

    db.prepare(`
      UPDATE attendance
      SET clock_out = ?, clock_out_lat = ?, clock_out_lng = ?, clock_out_address = ?,
          work_hours = ?, status = CASE WHEN status = 'late' THEN status ELSE ? END
      WHERE id = ?
    `).run(
      now, latitude || null, longitude || null, address || null,
      workHours, isEarlyLeave ? 'early_leave' : 'normal',
      record.id
    );

    return NextResponse.json({
      message: isEarlyLeave ? '下班打卡成功（早退）' : '下班打卡成功',
      workHours,
      time: now,
    });
  }
}

// Haversine formula 計算兩點距離（公尺）
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
