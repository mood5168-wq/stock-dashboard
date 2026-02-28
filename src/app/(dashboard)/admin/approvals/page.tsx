'use client';

import { useState, useEffect, useCallback } from 'react';

interface LeaveRequest {
  id: number;
  user_id: number;
  name: string;
  employee_id: string;
  type: string;
  start_date: string;
  end_date: string;
  hours: number;
  reason: string;
  status: string;
  created_at: string;
}

interface OvertimeRequest {
  id: number;
  user_id: number;
  name: string;
  employee_id: string;
  date: string;
  start_time: string;
  end_time: string;
  hours: number;
  reason: string;
  status: string;
  created_at: string;
}

const LEAVE_LABELS: Record<string, string> = {
  annual: '特休', sick: '病假', personal: '事假', marriage: '婚假',
  maternity: '產假', paternity: '陪產假', funeral: '喪假', official: '公假', other: '其他',
};

export default function ApprovalsPage() {
  const [tab, setTab] = useState<'leave' | 'overtime'>('leave');
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [overtimes, setOvertimes] = useState<OvertimeRequest[]>([]);
  const [message, setMessage] = useState('');

  const fetchData = useCallback(async () => {
    const [lr, or] = await Promise.all([
      fetch('/api/leave?status=pending'),
      fetch('/api/overtime?status=pending'),
    ]);
    const ld = await lr.json();
    const od = await or.json();
    setLeaves(ld.records || []);
    setOvertimes(od.records || []);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLeaveAction = async (id: number, action: 'approve' | 'reject') => {
    const res = await fetch('/api/leave', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    });
    const data = await res.json();
    setMessage(data.message);
    fetchData();
  };

  const handleOvertimeAction = async (id: number, action: 'approve' | 'reject') => {
    const res = await fetch('/api/overtime', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    });
    const data = await res.json();
    setMessage(data.message);
    fetchData();
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">審核中心</h2>

      {message && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm bg-green-50 text-green-700">{message}</div>
      )}

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('leave')} className={`px-4 py-2 rounded-lg font-medium transition ${tab === 'leave' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}>
          請假申請 ({leaves.length})
        </button>
        <button onClick={() => setTab('overtime')} className={`px-4 py-2 rounded-lg font-medium transition ${tab === 'overtime' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}>
          加班申請 ({overtimes.length})
        </button>
      </div>

      {tab === 'leave' && (
        <div className="space-y-3">
          {leaves.length === 0 && (
            <div className="bg-white rounded-xl border p-8 text-center text-slate-400">目前沒有待審核的請假申請</div>
          )}
          {leaves.map(l => (
            <div key={l.id} className="bg-white rounded-xl border p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-semibold text-slate-800">{l.name}</span>
                    <span className="text-sm text-slate-400">{l.employee_id}</span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                      {LEAVE_LABELS[l.type] || l.type}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">
                    {l.start_date}{l.start_date !== l.end_date ? ` ~ ${l.end_date}` : ''} ({l.hours} 小時)
                  </p>
                  {l.reason && <p className="text-sm text-slate-500 mt-1">事由：{l.reason}</p>}
                  <p className="text-xs text-slate-400 mt-2">申請時間：{l.created_at}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleLeaveAction(l.id, 'approve')}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
                  >核准</button>
                  <button
                    onClick={() => handleLeaveAction(l.id, 'reject')}
                    className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition"
                  >駁回</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'overtime' && (
        <div className="space-y-3">
          {overtimes.length === 0 && (
            <div className="bg-white rounded-xl border p-8 text-center text-slate-400">目前沒有待審核的加班申請</div>
          )}
          {overtimes.map(o => (
            <div key={o.id} className="bg-white rounded-xl border p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-semibold text-slate-800">{o.name}</span>
                    <span className="text-sm text-slate-400">{o.employee_id}</span>
                  </div>
                  <p className="text-sm text-slate-600">
                    {o.date} {o.start_time} ~ {o.end_time} ({o.hours} 小時)
                  </p>
                  {o.reason && <p className="text-sm text-slate-500 mt-1">事由：{o.reason}</p>}
                  <p className="text-xs text-slate-400 mt-2">申請時間：{o.created_at}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOvertimeAction(o.id, 'approve')}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
                  >核准</button>
                  <button
                    onClick={() => handleOvertimeAction(o.id, 'reject')}
                    className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition"
                  >駁回</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
