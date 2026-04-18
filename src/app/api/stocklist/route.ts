import { NextResponse } from 'next/server';

interface StockInfo {
  stock_id: string;
  stock_name: string;
  type: string;
  industry_category: string;
}

let cachedList: StockInfo[] | null = null;
let cachedAt = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function GET() {
  const token = process.env.FINMIND_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'Missing FINMIND_TOKEN' }, { status: 500 });
  }

  // Use cache if available
  if (cachedList && Date.now() - cachedAt < CACHE_TTL) {
    return NextResponse.json(cachedList, {
      headers: { 'Cache-Control': 's-maxage=86400, stale-while-revalidate=3600' },
    });
  }

  try {
    const params = new URLSearchParams({
      dataset: 'TaiwanStockInfo',
      token,
    });

    const res = await fetch(`https://api.finmindtrade.com/api/v4/data?${params}`);
    const json = await res.json();

    if (json.status !== 200 || !json.data?.length) {
      throw new Error(json.msg || 'No data');
    }

    // Filter to regular stocks only: 4-digit numeric IDs, twse/tpex
    // FinMind TaiwanStockInfo 每檔可能有多列（交叉上市 / 歷史產業分類），
    // 用 Map 以 stock_id 去重，保留第一筆。
    const dedupMap = new Map<string, StockInfo>();
    for (const r of json.data as StockInfo[]) {
      if (!/^\d{4}$/.test(r.stock_id)) continue;
      if (!['twse', 'tpex'].includes(r.type)) continue;
      if (!dedupMap.has(r.stock_id)) {
        dedupMap.set(r.stock_id, {
          stock_id: r.stock_id,
          stock_name: r.stock_name,
          type: r.type,
          industry_category: r.industry_category,
        });
      }
    }
    const regular = Array.from(dedupMap.values());

    cachedList = regular;
    cachedAt = Date.now();

    return NextResponse.json(regular, {
      headers: { 'Cache-Control': 's-maxage=86400, stale-while-revalidate=3600' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
