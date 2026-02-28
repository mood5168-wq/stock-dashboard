'use client';

import { useState, useEffect, useCallback } from 'react';

interface Employee {
  id: number;
  employee_id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  monthly_salary: number;
  hourly_rate: number;
  phone: string;
  active: number;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [message, setMessage] = useState('');

  const [form, setForm] = useState({
    employee_id: '', name: '', email: '', password: '', role: 'employee',
    department: '', monthly_salary: '', hourly_rate: '', phone: '',
  });

  const fetchEmployees = useCallback(async () => {
    const res = await fetch('/api/employees');
    const data = await res.json();
    setEmployees(data.employees || []);
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const resetForm = () => {
    setForm({ employee_id: '', name: '', email: '', password: '', role: 'employee', department: '', monthly_salary: '', hourly_rate: '', phone: '' });
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (emp: Employee) => {
    setEditing(emp);
    setForm({
      employee_id: emp.employee_id, name: emp.name, email: emp.email, password: '',
      role: emp.role, department: emp.department || '', monthly_salary: String(emp.monthly_salary),
      hourly_rate: String(emp.hourly_rate), phone: emp.phone || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    const body: Record<string, unknown> = { ...form, monthly_salary: parseFloat(form.monthly_salary) || 0, hourly_rate: parseFloat(form.hourly_rate) || 0 };
    if (editing) body.id = editing.id;
    if (!body.password) delete body.password;

    const res = await fetch('/api/employees', {
      method: editing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setMessage(data.message || data.error);
    if (res.ok) { resetForm(); fetchEmployees(); }
  };

  const toggleActive = async (emp: Employee) => {
    await fetch('/api/employees', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: emp.id, active: emp.active ? 0 : 1 }),
    });
    fetchEmployees();
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">員工管理</h2>
        <button
          onClick={() => { if (showForm) { resetForm(); } else { setShowForm(true); } }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          {showForm ? '取消' : '+ 新增員工'}
        </button>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${message.includes('成功') || message.includes('更新') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border p-6 mb-6">
          <h3 className="font-semibold text-slate-800 mb-4">{editing ? '編輯員工' : '新增員工'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">員工編號</label>
              <input value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })} required disabled={!!editing} className="w-full px-3 py-2 border rounded-lg disabled:bg-slate-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">姓名</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">密碼{editing ? '（留空不修改）' : ''}</label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required={!editing} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">角色</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                <option value="employee">員工</option>
                <option value="manager">主管</option>
                <option value="admin">管理員</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">部門</label>
              <input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">月薪</label>
              <input type="number" value={form.monthly_salary} onChange={e => setForm({ ...form, monthly_salary: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">時薪</label>
              <input type="number" value={form.hourly_rate} onChange={e => setForm({ ...form, hourly_rate: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">電話</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div className="col-span-3">
              <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                {editing ? '更新' : '新增'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-slate-500">編號</th>
              <th className="text-left py-3 px-4 font-medium text-slate-500">姓名</th>
              <th className="text-left py-3 px-4 font-medium text-slate-500">Email</th>
              <th className="text-left py-3 px-4 font-medium text-slate-500">角色</th>
              <th className="text-left py-3 px-4 font-medium text-slate-500">部門</th>
              <th className="text-left py-3 px-4 font-medium text-slate-500">月薪</th>
              <th className="text-left py-3 px-4 font-medium text-slate-500">狀態</th>
              <th className="text-left py-3 px-4 font-medium text-slate-500">操作</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id} className="border-t border-slate-50 hover:bg-slate-50">
                <td className="py-3 px-4 font-mono">{emp.employee_id}</td>
                <td className="py-3 px-4 font-medium">{emp.name}</td>
                <td className="py-3 px-4 text-slate-500">{emp.email}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    emp.role === 'admin' ? 'bg-purple-50 text-purple-700' : emp.role === 'manager' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
                  }`}>{emp.role === 'admin' ? '管理員' : emp.role === 'manager' ? '主管' : '員工'}</span>
                </td>
                <td className="py-3 px-4">{emp.department || '-'}</td>
                <td className="py-3 px-4">{emp.monthly_salary?.toLocaleString()}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${emp.active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {emp.active ? '在職' : '離職'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <button onClick={() => handleEdit(emp)} className="text-blue-600 hover:underline mr-3 text-xs">編輯</button>
                  <button onClick={() => toggleActive(emp)} className={`text-xs ${emp.active ? 'text-red-600' : 'text-green-600'} hover:underline`}>
                    {emp.active ? '停用' : '啟用'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
