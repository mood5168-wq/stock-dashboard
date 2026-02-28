'use client';

import { useState, useEffect, useCallback } from 'react';

interface ScheduleRecord {
  id: number;
  user_id: number;
  name: string;
  employee_id: string;
  date: string;
  shift_name: string;
  start_time: string;
  end_time: string;
}

export default function SchedulePage() {
  const [records, setRecords] = useState<ScheduleRecord[]>([]);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const fetchSchedule = useCallback(async () => {
    const res = await fetch(`/api/schedule?month=${month}`);
    const data = await res.json();
    setRecords(data.records || []);
  }, [month]);

  useEffect(() => { fetchSchedule(); }, [fetchSchedule]);

  // Group by date
  const grouped = records.reduce((acc, r) => {
    if (!acc[r.date]) acc[r.date] = [];
    acc[r.date].push(r);
    return acc;
  }, {} as Record<string, ScheduleRecord[]>);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">我的班表</h2>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        />
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        {Object.keys(grouped).length === 0 ? (
          <div className="text-center py-12 text-slate-400">本月尚無排班</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-slate-500">日期</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500">班別</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500">時間</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([date, items]) =>
                items.map((s, idx) => (
                  <tr key={s.id} className="border-t border-slate-50">
                    {idx === 0 && (
                      <td className="py-3 px-4 font-medium" rowSpan={items.length}>
                        {date}
                        <span className="text-slate-400 ml-2">
                          {new Date(date + 'T00:00:00').toLocaleDateString('zh-TW', { weekday: 'short' })}
                        </span>
                      </td>
                    )}
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-medium">
                        {s.shift_name}
                      </span>
                    </td>
                    <td className="py-3 px-4">{s.start_time} ~ {s.end_time}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
