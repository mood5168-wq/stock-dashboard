'use client';

import { SignalResult } from '@/lib/types';

interface Props {
  signal: SignalResult | null;
}

export default function SignalBadge({ signal }: Props) {
  if (!signal) return null;

  const getBgColor = (total: number) => {
    if (total >= 2.5) return 'bg-green-600/20 border-green-600/50 text-green-400';
    if (total >= 1) return 'bg-green-600/10 border-green-600/30 text-green-400';
    if (total <= -2.5) return 'bg-red-600/20 border-red-600/50 text-red-400';
    if (total <= -1) return 'bg-red-600/10 border-red-600/30 text-red-400';
    return 'bg-yellow-600/10 border-yellow-600/30 text-yellow-400';
  };

  return (
    <div className="flex flex-col gap-2">
      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded border text-sm font-medium ${getBgColor(signal.total)}`}>
        <span>{signal.signal}</span>
        <span className="text-xs opacity-75">({signal.total >= 0 ? '+' : ''}{signal.total.toFixed(1)})</span>
      </div>
      {signal.details.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {signal.details.map((d, i) => (
            <span
              key={i}
              className={`text-[10px] px-1.5 py-0.5 rounded ${
                d.score > 0
                  ? 'bg-green-900/30 text-green-400'
                  : d.score < 0
                  ? 'bg-red-900/30 text-red-400'
                  : 'bg-gray-700/30 text-gray-400'
              }`}
            >
              {d.name}: {d.description}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
