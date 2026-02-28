import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getDb } from './db/schema';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'attendance-system-secret-key-change-in-production';

export interface UserPayload {
  id: number;
  employee_id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'employee';
  department: string;
}

export function signToken(user: UserPayload): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): UserPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserPayload;
  } catch {
    return null;
  }
}

export function getUserFromRequest(request: NextRequest): UserPayload | null {
  const token = request.cookies.get('token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  return verifyToken(token);
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function authenticateUser(email: string, password: string): UserPayload | null {
  const db = getDb();
  const user = db.prepare(
    'SELECT id, employee_id, name, email, password, role, department FROM users WHERE email = ? AND active = 1'
  ).get(email) as (UserPayload & { password: string }) | undefined;

  if (!user || !comparePassword(password, user.password)) {
    return null;
  }

  return {
    id: user.id,
    employee_id: user.employee_id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
  };
}
