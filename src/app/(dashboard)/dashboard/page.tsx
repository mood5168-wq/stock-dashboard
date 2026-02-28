'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface AttendanceRecord {
  id: number;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  clock_in_address: string | null;
  clock_out_address: string | null;
  work_hours: number;
  status: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState('');
  const [clockMessage, setClockMessage] = useState('');
  const [clockLoading, setClockLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // 即時時鐘
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 取得 GPS 位置
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        err => setLocationError(err.message === 'User denied Geolocation'
          ? '請允許定位權限以使用打卡功能'
          : '無法取得定位：' + err.message)
      );
    } else {
      setLocationError('瀏覽器不支援定位功能');
    }
  }, []);

  const fetchRecords = useCallback(async () => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const res = await fetch(`/api/attendance?month=${month}`);
    const data = await res.json();
    if (data.records) {
      setRecords(data.records);
      const today = now.toLocaleDateString('sv-SE');
      const todayRec = data.records.find((r: AttendanceRecord) => r.date === today);
      setTodayRecord(todayRec || null);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleClock = async (action: 'clock_in' | 'clock_out') => {
    setClockLoading(true);
    setClockMessage('');
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          latitude: location?.lat,
          longitude: location?.lng,
        }),
      });
      const data = await res.json();
      setClockMessage(data.message || data.error);
      if (res.ok) fetchRecords();
    } catch {
      setClockMessage('打卡失敗，請稍後再試');
    } finally {
      setClockLoading(false);
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'late': return <span className="text-orange-600 font-medium">遲到</span>;
      case 'early_leave': return <span className="text-yellow-600 font-medium">早退</span>;
      case 'absent': return <span className="text-red-600 font-medium">缺勤</span>;
      default: return <span className="text-green-600 font-medium">正常</span>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">
        {user?.name}，{currentTime.getHours() < 12 ? '早安' : currentTime.getHours() < 18 ? '午安' : '晚安'}
      </h2>

      {/* 打卡區域 */}
      <div className="bg-white rounded-2xl shadow-sm border p-8 mb-6">
        <div className="text-center">
          <div className="text-5xl font-mono font-bold text-slate-800 mb-2">
            {currentTime.toLocaleTimeString('zh-TW')}
          </div>
          <div className="text-slate-500 mb-6">
            {currentTime.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </div>

          {/* GPS 狀態 */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm mb-6 ${
            location ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            <span className={`w-2 h-2 rounded-full ${location ? 'bg-green-500' : 'bg-red-500'}`}></span>
            {location
              ? `GPS 定位成功 (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})`
              : locationError || '定位中...'}
          </div>

          {/* 今日狀態 */}
          {todayRecord && (
            <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">上班打卡</span>
                  <p className="font-medium mt-1">{todayRecord.clock_in ? new Date(todayRecord.clock_in).toLocaleTimeString('zh-TW') : '---'}</p>
                </div>
                <div>
                  <span className="text-slate-500">下班打卡</span>
                  <p className="font-medium mt-1">{todayRecord.clock_out ? new Date(todayRecord.clock_out).toLocaleTimeString('zh-TW') : '---'}</p>
                </div>
                <div>
                  <span className="text-slate-500">狀態</span>
                  <p className="mt-1">{statusLabel(todayRecord.status)}</p>
                </div>
              </div>
            </div>
          )}

          {/* 打卡按鈕 */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => handleClock('clock_in')}
              disabled={clockLoading || !!todayRecord?.clock_in}
              className="px-8 py-4 bg-blue-600 text-white text-lg font-medium rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-lg shadow-blue-200"
            >
              上班打卡
            </button>
            <button
              onClick={() => handleClock('clock_out')}
              disabled={clockLoading || !todayRecord?.clock_in || !!todayRecord?.clock_out}
              className="px-8 py-4 bg-emerald-600 text-white text-lg font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-lg shadow-emerald-200"
            >
              下班打卡
            </button>
          </div>

          {clockMessage && (
            <div className={`mt-4 px-4 py-2 rounded-lg text-sm ${
              clockMessage.includes('成功') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {clockMessage}
            </div>
          )}
        </div>
      </div>

      {/* 本月打卡紀錄 */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">本月打卡紀錄</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 text-slate-500 font-medium">日期</th>
                <th className="text-left py-3 px-2 text-slate-500 font-medium">上班</th>
                <th className="text-left py-3 px-2 text-slate-500 font-medium">下班</th>
                <th className="text-left py-3 px-2 text-slate-500 font-medium">工時</th>
                <th className="text-left py-3 px-2 text-slate-500 font-medium">狀態</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-3 px-2">{r.date}</td>
                  <td className="py-3 px-2">{r.clock_in ? new Date(r.clock_in).toLocaleTimeString('zh-TW') : '---'}</td>
                  <td className="py-3 px-2">{r.clock_out ? new Date(r.clock_out).toLocaleTimeString('zh-TW') : '---'}</td>
                  <td className="py-3 px-2">{r.work_hours ? `${r.work_hours}h` : '---'}</td>
                  <td className="py-3 px-2">{statusLabel(r.status)}</td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400">本月尚無打卡紀錄</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
