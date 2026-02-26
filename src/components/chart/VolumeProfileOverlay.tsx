'use client';

import { useMemo } from 'react';
import { StockCandle } from '@/lib/types';
import { calcVolumeProfile } from '@/lib/indicators';

interface Props {
  candles: StockCandle[];
}

export default function VolumeProfileOverlay({ candles }: Props) {
  const buckets = useMemo(() => calcVolumeProfile(candles, 30), [candles]);

  if (!buckets.length) return null;

  const maxPrice = Math.max(...candles.map(c => c.high));
  const minPrice = Math.min(...candles.map(c => c.low));
  const priceRange = maxPrice - minPrice;

  if (priceRange <= 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-[5] overflow-hidden">
      {buckets.map((b, i) => {
        // Position each bar vertically based on price level
        const topPct = ((maxPrice - b.price) / priceRange) * 100;
        const barHeight = (1 / buckets.length) * 100;
        const barWidth = Math.max(2, b.pct * 35); // max 35% of chart width

        return (
          <div
            key={i}
            className="absolute right-[52px]"
            style={{
              top: `${topPct}%`,
              height: `${barHeight}%`,
              width: `${barWidth}%`,
              backgroundColor: b.pct > 0.7
                ? 'rgba(41, 98, 255, 0.25)'
                : 'rgba(41, 98, 255, 0.12)',
              borderLeft: b.pct > 0.7 ? '2px solid rgba(41, 98, 255, 0.5)' : 'none',
              transform: 'translateY(-50%)',
            }}
          />
        );
      })}
    </div>
  );
}
