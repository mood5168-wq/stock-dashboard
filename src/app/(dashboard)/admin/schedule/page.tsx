'use client';

import { useState, useEffect, useCallback } from 'react';

interface Employee {
  id: number;
  employee_id: string;
  name: string;
}

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

const SHIFT_PRESETS = [
  { name: '早班', start: '08:00', end: '16:00' },
  { name: '中班', start: '12:00', end: '20:00' },
  { name: '晚班', start: '16:00', end: '00:00' },
  { name: '正常班', start: '09:00', end: '18:00' },
];

export default function AdminSchedulePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedEmployee, setSelectedEmployee] = useState<number>(0);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [shiftPreset, setShiftPreset] = useState(0);
  const [message, setMessage] = useState('');

  const fetchData = useCallback(async () => {
    const [empRes, schRes] = await Promise.all([
      fetch('/api/employees'),
      fetch(`/api/schedule?month=${month}`),
    ]);
    const empData = await empRes.json();
    const schData = await schRes.json();
    setEmployees(empData.employees || []);
    setSchedules(schData.records || []);
  }, [month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 產生整個月的日期
  const getDatesInMonth = () => {
    const [year, mon] = month.split('-').map(Number);
    const daysInMonth = new Date(year, mon, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      return `${year}-${String(mon).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    });
  };

  const toggleDate = (date: string) => {
    setSelectedDates(prev =>
      prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
    );
  };

  const handleBatchSchedule = async () => {
    if (!selectedEmployee || selectedDates.length === 0) {
      setMessage('請選擇員工和日期');
      return;
    }

    const preset = SHIFT_PRESETS[shiftPreset];
    const body = {
      schedules: selectedDates.map(date => ({
        user_id: selectedEmployee,
        date,
        shift_name: preset.name,
        start_time: preset.start,
        end_time: preset.end,
      })),
    };

    const res = await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setMessage(data.message || data.error);
    if (res.ok) {
      setSelectedDates([]);
      fetchData();
    }
  };

  const handleDelete = async (id: number) => {
    await fetch('/api/schedule', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchData();
  };

  const dates = getDatesInMonth();

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">排班管理</h2>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${message.includes('排定') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message}
        </div>
      )}

      {/* 排班工具 */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <h3 className="font-semibold text-slate-800 mb-4">快速排班</h3>
        <div className="flex gap-4 items-end mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">月份</label>
            <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">員工</label>
            <select
              value={selectedEmployee}
              onChange={e => setSelectedEmployee(parseInt(e.target.value))}
              className="px-3 py-2 border rounded-lg min-w-[150px]"
            >
              <option value={0}>選擇員工</option>
              {employees.filter(e => e.id).map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} ({emp.employee_id})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">班別</label>
            <select
              value={shiftPreset}
              onChange={e => setShiftPreset(parseInt(e.target.value))}
              className="px-3 py-2 border rounded-lg"
            >
              {SHIFT_PRESETS.map((p, i) => (
                <option key={i} value={i}>{p.name} ({p.start}~{p.end})</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleBatchSchedule}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            排班 ({selectedDates.length} 天)
          </button>
        </div>

        {/* 日期選擇器 */}
        <div className="grid grid-cols-7 gap-1">
          {['一', '二', '三', '四', '五', '六', '日'].map(d => (
            <div key={d} className="text-center text-xs font-medium text-slate-400 py-2">{d}</div>
          ))}
          {(() => {
            const firstDate = new Date(dates[0] + 'T00:00:00');
            let dayOfWeek = firstDate.getDay();
            dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0
            const blanks = Array.from({ length: dayOfWeek }, (_, i) => <div key={`blank-${i}`}></div>);
            return blanks;
          })()}
          {dates.map(date => {
            const isSelected = selectedDates.includes(date);
            const dayOfWeek = new Date(date + 'T00:00:00').getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            return (
              <button
                key={date}
                onClick={() => toggleDate(date)}
                className={`py-2 rounded text-sm transition ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : isWeekend
                      ? 'bg-red-50 text-red-400 hover:bg-red-100'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                {parseInt(date.split('-')[2])}
              </button>
            );
          })}
        </div>
      </div>

      {/* 現有排班 */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <h3 className="font-semibold text-slate-800 p-4 border-b">本月排班一覽</h3>
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-slate-500">員工</th>
              <th className="text-left py-3 px-4 font-medium text-slate-500">日期</th>
              <th className="text-left py-3 px-4 font-medium text-slate-500">班別</th>
              <th className="text-left py-3 px-4 font-medium text-slate-500">時間</th>
              <th className="text-left py-3 px-4 font-medium text-slate-500">操作</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map(s => (
              <tr key={s.id} className="border-t border-slate-50">
                <td className="py-3 px-4">{s.name} ({s.employee_id})</td>
                <td className="py-3 px-4">{s.date}</td>
                <td className="py-3 px-4"><span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">{s.shift_name}</span></td>
                <td className="py-3 px-4">{s.start_time} ~ {s.end_time}</td>
                <td className="py-3 px-4">
                  <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:underline text-xs">刪除</button>
                </td>
              </tr>
            ))}
            {schedules.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-slate-400">本月尚無排班</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
