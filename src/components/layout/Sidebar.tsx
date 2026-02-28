'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

const menuItems = [
  { href: '/dashboard', label: '打卡', icon: '⏰', roles: ['admin', 'manager', 'employee'] },
  { href: '/leave', label: '請假/加班', icon: '📋', roles: ['admin', 'manager', 'employee'] },
  { href: '/schedule', label: '班表', icon: '📅', roles: ['admin', 'manager', 'employee'] },
  { href: '/admin/employees', label: '員工管理', icon: '👥', roles: ['admin'] },
  { href: '/admin/approvals', label: '審核中心', icon: '✅', roles: ['admin', 'manager'] },
  { href: '/admin/schedule', label: '排班管理', icon: '📊', roles: ['admin', 'manager'] },
  { href: '/admin/salary', label: '薪資管理', icon: '💰', roles: ['admin'] },
  { href: '/admin/reports', label: '月報表', icon: '📈', roles: ['admin', 'manager'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) return null;

  const visibleItems = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <aside className="w-64 bg-slate-800 text-white min-h-screen flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <h1 className="text-lg font-bold">打卡管理系統</h1>
        <p className="text-sm text-slate-400 mt-1">{user.name}</p>
        <p className="text-xs text-slate-500">{user.employee_id} · {user.role === 'admin' ? '管理員' : user.role === 'manager' ? '主管' : '員工'}</p>
      </div>

      <nav className="flex-1 p-2">
        {visibleItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
              pathname === item.href
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <button
          onClick={logout}
          className="w-full px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
        >
          登出
        </button>
      </div>
    </aside>
  );
}
