import { NextRequest, NextResponse } from 'next/server';
import { THOUSAND_CLUB } from '@/lib/constants';

interface StockInfo {
  stock_id: string;
  stock_name: string;
  type: string;
}

interface SearchResult {
  code: string;
  name: string;
}

let cachedUniverse: SearchResult[] | null = null;
let cachedAt = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000;

function getStaticEntries(): SearchResult[] {
  return Object.entries(THOUSAND_CLUB).map(([code, name]) => ({ code, name }));
}

function isSupportedEntry(entry: StockInfo) {
  return (
    (/^\d{4}$/.test(entry.stock_id) && ['twse', 'tpex'].includes(entry.type)) ||
    /^00\d{2,4}$/.test(entry.stock_id)
  );
}

function mergeEntries(entries: SearchResult[]) {
  const map = new Map<string, string>();
  for (const entry of entries) {
    if (!map.has(entry.code)) {
      map.set(entry.code, entry.name);
    }
  }
  return Array.from(map, ([code, name]) => ({ code, name }));
}

async function loadUniverse(): Promise<SearchResult[]> {
  if (cachedUniverse && Date.now() - cachedAt < CACHE_TTL) {
    return cachedUniverse;
  }

  const staticEntries = getStaticEntries();
  const token = process.env.FINMIND_TOKEN;

  if (!token) {
    cachedUniverse = staticEntries;
    cachedAt = Date.now();
    return staticEntries;
  }

  try {
    const params = new URLSearchParams({
      dataset: 'TaiwanStockInfo',
      token,
    });
    const res = await fetch(`https://api.finmindtrade.com/api/v4/data?${params}`, {
      next: { revalidate: 86400 },
    });
    const json = await res.json();
    if (json.status !== 200 || !Array.isArray(json.data)) {
      throw new Error(json.msg || 'No data');
    }
    const apiEntries = (json.data as StockInfo[])
      .filter(isSupportedEntry)
      .map((entry) => ({ code: entry.stock_id, name: entry.stock_name }));
    cachedUniverse = mergeEntries([...staticEntries, ...apiEntries]);
    cachedAt = Date.now();
    return cachedUniverse;
  } catch {
    return staticEntries;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim().toLowerCase();

  const universe = await loadUniverse();
  const results = q
    ? universe.filter(
        ({ code, name }) => code.includes(q) || name.toLowerCase().includes(q)
      )
    : universe.slice(0, 100);

  return NextResponse.json(results);
}
