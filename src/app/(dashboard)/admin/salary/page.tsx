'use client';

import { useState, useEffect, useCallback } from 'react';

interface SalaryRecord {
  id: number;
  user_id: number;
  name: string;
  employee_id: string;
  email: string;
  year: number;
  month: number;
  base_salary: number;
  overtime_pay: number;
  deductions: number;
  bonus: number;
  labor_insurance: number;
  health_insurance: number;
  net_salary: number;
  work_days: number;
  leave_days: number;
  overtime_hours: number;
  sent: number;
  sent_at: string;
}

export default function SalaryPage() {
  const [records, setRecords] = useState<SalaryRecord[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [message, setMessage] = useState('');
  const [calculating, setCalculating] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchRecords = useCallback(async () => {
    const res = await fetch(`/api/salary?year=${year}&month=${month}`);
    const data = await res.json();
    setRecords(data.records || []);
  }, [year, month]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleCalculate = async () => {
    setCalculating(true);
    setMessage('');
    const res = await fetch('/api/salary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month }),
    });
    const data = await res.json();
    setMessage(data.message || data.error);
    setCalculating(false);
    if (res.ok) fetchRecords();
  };

  const handleSend = async () => {
    setSending(true);
    setMessage('');
    const res = await fetch('/api/salary', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month }),
    });
    const data = await res.json();
    setMessage(data.message || data.error);
    setSending(false);
    if (res.ok) fetchRecords();
  };

  const totalNet = records.reduce((sum, r) => sum + r.net_salary, 0);

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">薪資管理</h2>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${message.includes('完成') || message.includes('寄出') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message}
        </div>
      )}

      {/* 操作區 */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <div className="flex items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">年份</label>
            <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="px-3 py-2 border rounded-lg">
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">月份</label>
            <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="px-3 py-2 border rounded-lg">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m} 月</option>)}
            </select>
          </div>
          <button
            onClick={handleCalculate}
            disabled={calculating}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {calculating ? '計算中...' : '計算薪資'}
          </button>
          <button
            onClick={handleSend}
            disabled={sending || records.length === 0}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"
          >
            {sending ? '寄送中...' : '發送薪資單'}
          </button>
        </div>
      </div>

      {/* 薪資摘要 */}
      {records.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border p-4">
            <p className="text-sm text-slate-500">總人數</p>
            <p className="text-2xl font-bold text-slate-800">{records.length} 人</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-sm text-slate-500">實發薪資總額</p>
            <p className="text-2xl font-bold text-blue-600">NT$ {totalNet.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-sm text-slate-500">已發送</p>
            <p className="text-2xl font-bold text-emerald-600">{records.filter(r => r.sent).length} / {records.length}</p>
          </div>
        </div>
      )}

      {/* 薪資明細表 */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left py-3 px-3 font-medium text-slate-500">編號</th>
                <th className="text-left py-3 px-3 font-medium text-slate-500">姓名</th>
                <th className="text-right py-3 px-3 font-medium text-slate-500">出勤</th>
                <th className="text-right py-3 px-3 font-medium text-slate-500">請假</th>
                <th className="text-right py-3 px-3 font-medium text-slate-500">加班</th>
                <th className="text-right py-3 px-3 font-medium text-slate-500">底薪</th>
                <th className="text-right py-3 px-3 font-medium text-slate-500">加班費</th>
                <th className="text-right py-3 px-3 font-medium text-slate-500">勞保</th>
                <th className="text-right py-3 px-3 font-medium text-slate-500">健保</th>
                <th className="text-right py-3 px-3 font-medium text-slate-500">扣款</th>
                <th className="text-right py-3 px-3 font-medium text-slate-500">實發</th>
                <th className="text-center py-3 px-3 font-medium text-slate-500">寄送</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id} className="border-t border-slate-50 hover:bg-slate-50">
                  <td className="py-3 px-3 font-mono text-xs">{r.employee_id}</td>
                  <td className="py-3 px-3 font-medium">{r.name}</td>
                  <td className="py-3 px-3 text-right">{r.work_days} 天</td>
                  <td className="py-3 px-3 text-right">{r.leave_days} 天</td>
                  <td className="py-3 px-3 text-right">{r.overtime_hours}h</td>
                  <td className="py-3 px-3 text-right">{r.base_salary.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right text-blue-600">{r.overtime_pay.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right text-red-500">-{r.labor_insurance.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right text-red-500">-{r.health_insurance.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right text-red-500">-{r.deductions.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right font-bold">{r.net_salary.toLocaleString()}</td>
                  <td className="py-3 px-3 text-center">
                    {r.sent ? (
                      <span className="text-green-600 text-xs">已寄送</span>
                    ) : (
                      <span className="text-slate-400 text-xs">未寄送</span>
                    )}
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr><td colSpan={12} className="text-center py-8 text-slate-400">尚無薪資紀錄，請先計算薪資</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
