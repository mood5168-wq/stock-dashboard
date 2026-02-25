import { NextRequest, NextResponse } from 'next/server';
import { fetchChipData } from '@/lib/finmind';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const stockId = searchParams.get('id');
  const days = parseInt(searchParams.get('days') || '120', 10);

  if (!stockId) {
    return NextResponse.json({ error: 'Missing stock id' }, { status: 400 });
  }

  const token = process.env.FINMIND_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'Missing FINMIND_TOKEN' }, { status: 500 });
  }

  try {
    const data = await fetchChipData(stockId, days, token);
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=60' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
