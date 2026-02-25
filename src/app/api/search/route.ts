import { NextRequest, NextResponse } from 'next/server';
import { THOUSAND_CLUB } from '@/lib/constants';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').toLowerCase();

  const results = Object.entries(THOUSAND_CLUB)
    .filter(([code, name]) =>
      code.includes(q) || name.toLowerCase().includes(q)
    )
    .map(([code, name]) => ({ code, name }));

  return NextResponse.json(results);
}
