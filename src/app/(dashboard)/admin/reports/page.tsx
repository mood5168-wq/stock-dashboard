'use client';

import { useState, useEffect, useCallback } from 'react';

interface AttendanceSummary {
  id: number;
  employee_id: string;
  name: string;
  department: string;
  total_days: number;
  late_days: number;
  early_leave_days: number;
  avg_work_hours: number;
  total_work_hours: number;
}

interface OvertimeSummary {
  id: number;
  employee_id: string;
  name: string;
  total_overtime_hours: number;
  overtime_count: number;
}

export default function ReportsPage() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [attendance, setAttendance] = useState<AttendanceSummary[]>([]);
  const [overtime, setOvertime] = useState<OvertimeSummary[]>([]);

  const fetchReport = useCallback(async () => {
    const res = await fetch(`/api/reports?month=${month}`);
    if (res.ok) {
      const data = await res.json();
      setAttendance(data.attendanceSummary || []);
      setOvertime(data.overtimeSummary || []);
    }
  }, [month]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">月報表</h2>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        />
      </div>

      {/* 出勤統計 */}
      <div className="bg-white rounded-xl border overflow-hidden mb-6">
        <h3 className="font-semibold text-slate-800 p-4 border-b">出勤統計 - {month}</h3>
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-slate-500">編號</th>
              <th className="text-left py-3 px-4 font-medium text-slate-500">姓名</th>
              <th className="text-left py-3 px-4 font-medium text-slate-500">部門</th>
              <th className="text-right py-3 px-4 font-medium text-slate-500">出勤天數</th>
              <th className="text-right py-3 px-4 font-medium text-slate-500">遲到</th>
              <th className="text-right py-3 px-4 font-medium text-slate-500">早退</th>
              <th className="text-right py-3 px-4 font-medium text-slate-500">平均工時</th>
              <th className="text-right py-3 px-4 font-medium text-slate-500">總工時</th>
            </tr>
          </thead>
          <tbody>
            {attendance.map(a => (
              <tr key={a.id} className="border-t border-slate-50 hover:bg-slate-50">
                <td className="py-3 px-4 font-mono text-xs">{a.employee_id}</td>
                <td className="py-3 px-4 font-medium">{a.name}</td>
                <td className="py-3 px-4">{a.department || '-'}</td>
                <td className="py-3 px-4 text-right">{a.total_days}</td>
                <td className="py-3 px-4 text-right">
                  {a.late_days > 0 ? <span className="text-orange-600 font-medium">{a.late_days}</span> : '0'}
                </td>
                <td className="py-3 px-4 text-right">
                  {a.early_leave_days > 0 ? <span className="text-yellow-600 font-medium">{a.early_leave_days}</span> : '0'}
                </td>
                <td className="py-3 px-4 text-right">{a.avg_work_hours || 0}h</td>
                <td className="py-3 px-4 text-right font-medium">{a.total_work_hours || 0}h</td>
              </tr>
            ))}
            {attendance.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-slate-400">尚無資料</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 加班統計 */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <h3 className="font-semibold text-slate-800 p-4 border-b">加班統計 - {month}</h3>
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-slate-500">編號</th>
              <th className="text-left py-3 px-4 font-medium text-slate-500">姓名</th>
              <th className="text-right py-3 px-4 font-medium text-slate-500">加班次數</th>
              <th className="text-right py-3 px-4 font-medium text-slate-500">總時數</th>
            </tr>
          </thead>
          <tbody>
            {overtime.map(o => (
              <tr key={o.id} className="border-t border-slate-50 hover:bg-slate-50">
                <td className="py-3 px-4 font-mono text-xs">{o.employee_id}</td>
                <td className="py-3 px-4 font-medium">{o.name}</td>
                <td className="py-3 px-4 text-right">{o.overtime_count || 0}</td>
                <td className="py-3 px-4 text-right font-medium">{o.total_overtime_hours || 0}h</td>
              </tr>
            ))}
            {overtime.length === 0 && (
              <tr><td colSpan={4} className="text-center py-8 text-slate-400">尚無加班資料</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
