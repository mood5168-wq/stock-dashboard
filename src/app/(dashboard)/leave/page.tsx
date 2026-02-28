'use client';

import { useState, useEffect, useCallback } from 'react';

interface LeaveRecord {
  id: number;
  type: string;
  start_date: string;
  end_date: string;
  hours: number;
  reason: string;
  status: string;
  approver_name: string;
  created_at: string;
}

interface OvertimeRecord {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  hours: number;
  reason: string;
  status: string;
  approver_name: string;
  created_at: string;
}

const LEAVE_LABELS: Record<string, string> = {
  annual: '特休', sick: '病假', personal: '事假', marriage: '婚假',
  maternity: '產假', paternity: '陪產假', funeral: '喪假', official: '公假', other: '其他',
};

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
};

const STATUS_LABEL: Record<string, string> = {
  pending: '審核中', approved: '已核准', rejected: '已駁回',
};

export default function LeavePage() {
  const [tab, setTab] = useState<'leave' | 'overtime'>('leave');
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [overtimes, setOvertimes] = useState<OvertimeRecord[]>([]);
  const [showForm, setShowForm] = useState(false);

  // Leave form
  const [leaveType, setLeaveType] = useState('annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hours, setHours] = useState('8');
  const [reason, setReason] = useState('');

  // Overtime form
  const [otDate, setOtDate] = useState('');
  const [otStart, setOtStart] = useState('18:00');
  const [otEnd, setOtEnd] = useState('20:00');
  const [otHours, setOtHours] = useState('2');
  const [otReason, setOtReason] = useState('');

  const [message, setMessage] = useState('');

  const fetchData = useCallback(async () => {
    const [leaveRes, otRes] = await Promise.all([
      fetch('/api/leave'),
      fetch('/api/overtime'),
    ]);
    const leaveData = await leaveRes.json();
    const otData = await otRes.json();
    setLeaves(leaveData.records || []);
    setOvertimes(otData.records || []);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const submitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: leaveType, start_date: startDate, end_date: endDate, hours: parseFloat(hours), reason }),
    });
    const data = await res.json();
    setMessage(data.message || data.error);
    if (res.ok) { setShowForm(false); fetchData(); }
  };

  const submitOvertime = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/overtime', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: otDate, start_time: otStart, end_time: otEnd, hours: parseFloat(otHours), reason: otReason }),
    });
    const data = await res.json();
    setMessage(data.message || data.error);
    if (res.ok) { setShowForm(false); fetchData(); }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">請假 / 加班</h2>
        <button
          onClick={() => { setShowForm(!showForm); setMessage(''); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          {showForm ? '取消' : tab === 'leave' ? '+ 申請請假' : '+ 申請加班'}
        </button>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${message.includes('成功') || message.includes('送出') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message}
        </div>
      )}

      {/* 分頁 */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => { setTab('leave'); setShowForm(false); }} className={`px-4 py-2 rounded-lg font-medium transition ${tab === 'leave' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>
          請假紀錄
        </button>
        <button onClick={() => { setTab('overtime'); setShowForm(false); }} className={`px-4 py-2 rounded-lg font-medium transition ${tab === 'overtime' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>
          加班紀錄
        </button>
      </div>

      {/* 申請表單 */}
      {showForm && tab === 'leave' && (
        <div className="bg-white rounded-xl border p-6 mb-6">
          <h3 className="font-semibold text-slate-800 mb-4">請假申請</h3>
          <form onSubmit={submitLeave} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">假別</label>
              <select value={leaveType} onChange={e => setLeaveType(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                {Object.entries(LEAVE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">時數</label>
              <input type="number" value={hours} onChange={e => setHours(e.target.value)} step="0.5" min="0.5" className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">開始日期</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">結束日期</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">事由</label>
              <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div className="col-span-2">
              <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">送出申請</button>
            </div>
          </form>
        </div>
      )}

      {showForm && tab === 'overtime' && (
        <div className="bg-white rounded-xl border p-6 mb-6">
          <h3 className="font-semibold text-slate-800 mb-4">加班申請</h3>
          <form onSubmit={submitOvertime} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">日期</label>
              <input type="date" value={otDate} onChange={e => setOtDate(e.target.value)} required className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">時數</label>
              <input type="number" value={otHours} onChange={e => setOtHours(e.target.value)} step="0.5" min="0.5" className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">開始時間</label>
              <input type="time" value={otStart} onChange={e => setOtStart(e.target.value)} required className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">結束時間</label>
              <input type="time" value={otEnd} onChange={e => setOtEnd(e.target.value)} required className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">事由</label>
              <textarea value={otReason} onChange={e => setOtReason(e.target.value)} rows={2} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div className="col-span-2">
              <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">送出申請</button>
            </div>
          </form>
        </div>
      )}

      {/* 請假紀錄列表 */}
      {tab === 'leave' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-slate-500">日期</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500">假別</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500">時數</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500">事由</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500">狀態</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map(l => (
                <tr key={l.id} className="border-t border-slate-50">
                  <td className="py-3 px-4">{l.start_date}{l.start_date !== l.end_date ? ` ~ ${l.end_date}` : ''}</td>
                  <td className="py-3 px-4">{LEAVE_LABELS[l.type] || l.type}</td>
                  <td className="py-3 px-4">{l.hours}h</td>
                  <td className="py-3 px-4 text-slate-500">{l.reason || '-'}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLE[l.status]}`}>
                      {STATUS_LABEL[l.status]}
                    </span>
                  </td>
                </tr>
              ))}
              {leaves.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400">尚無請假紀錄</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 加班紀錄列表 */}
      {tab === 'overtime' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-slate-500">日期</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500">時間</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500">時數</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500">事由</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500">狀態</th>
              </tr>
            </thead>
            <tbody>
              {overtimes.map(o => (
                <tr key={o.id} className="border-t border-slate-50">
                  <td className="py-3 px-4">{o.date}</td>
                  <td className="py-3 px-4">{o.start_time} ~ {o.end_time}</td>
                  <td className="py-3 px-4">{o.hours}h</td>
                  <td className="py-3 px-4 text-slate-500">{o.reason || '-'}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLE[o.status]}`}>
                      {STATUS_LABEL[o.status]}
                    </span>
                  </td>
                </tr>
              ))}
              {overtimes.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400">尚無加班紀錄</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
