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

    // Filter to regular stocks only:
    // - 4-digit numeric IDs starting with 1-9 (excludes ETFs starting with 0)
    // - twse/tpex type
    // - exclude non-stock categories (ETF, TDR, preferred stocks, etc.)
    const EXCLUDED_CATEGORIES = new Set([
      'ETF',
      '存託憑證',        // TDR
      '特別股',          // Preferred stocks
      '受益證券',        // Beneficial certificates
      '臺灣存託憑證',    // Taiwan Depositary Receipts
    ]);

    const regular = json.data
      .filter((r: StockInfo) =>
        /^[1-9]\d{3}$/.test(r.stock_id) &&
        ['twse', 'tpex'].includes(r.type) &&
        !EXCLUDED_CATEGORIES.has(r.industry_category)
      )
      .map((r: StockInfo) => ({
        stock_id: r.stock_id,
        stock_name: r.stock_name,
        type: r.type,
        industry_category: r.industry_category,
      }));

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
