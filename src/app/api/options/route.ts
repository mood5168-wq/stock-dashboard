import { NextRequest, NextResponse } from 'next/server';
import { fetchOptionDaily, fetchOptionInstitutional, fetchFuturesInstitutional } from '@/lib/finmind';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '60', 10);
  const type = searchParams.get('type') || 'all';

  const token = process.env.FINMIND_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'Missing FINMIND_TOKEN' }, { status: 500 });
  }

  try {
    if (type === 'daily') {
      const daily = await fetchOptionDaily(days, token);
      return NextResponse.json({ daily }, {
        headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' },
      });
    }

    if (type === 'institutional') {
      const [optionInst, futuresInst] = await Promise.all([
        fetchOptionInstitutional(days, token),
        fetchFuturesInstitutional(days, token),
      ]);
      return NextResponse.json({ optionInst, futuresInst }, {
        headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' },
      });
    }

    // type === 'all'
    const [daily, optionInst, futuresInst] = await Promise.all([
      fetchOptionDaily(days, token),
      fetchOptionInstitutional(days, token),
      fetchFuturesInstitutional(days, token),
    ]);

    return NextResponse.json({ daily, optionInst, futuresInst }, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
