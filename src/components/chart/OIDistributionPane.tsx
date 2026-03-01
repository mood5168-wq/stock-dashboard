'use client';

import { OIStrikeData } from '@/lib/types';
import { COLORS } from '@/lib/constants';

interface Props {
  data: OIStrikeData[];
  maxCallStrike: number;
  maxPutStrike: number;
}

export default function OIDistributionPane({ data, maxCallStrike, maxPutStrike }: Props) {
  if (!data.length) {
    return (
      <div className="w-full h-full flex items-center justify-center text-[#787B86] text-xs">
        無未平倉資料
      </div>
    );
  }

  const maxOI = Math.max(
    ...data.map((d) => Math.max(d.callOI, d.putOI)),
    1
  );

  return (
    <div className="w-full h-full flex flex-col" style={{ backgroundColor: COLORS.bg }}>
      <div className="px-2 pt-1 pb-0.5 text-[10px] text-[#787B86] shrink-0">
        未平倉分佈 (TXO)
        <span className="ml-2 text-[#EF4444]">■ Call (壓力)</span>
        <span className="ml-2 text-[#10B981]">■ Put (支撐)</span>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-1 custom-scrollbar">
        {data.map((row) => {
          const callWidth = (row.callOI / maxOI) * 100;
          const putWidth = (row.putOI / maxOI) * 100;
          const isMaxCall = row.strikePrice === maxCallStrike;
          const isMaxPut = row.strikePrice === maxPutStrike;

          return (
            <div key={row.strikePrice} className="flex items-center gap-0.5 h-5">
              {/* Call OI — right-aligned bar */}
              <div className="flex-1 flex justify-end">
                <div
                  className="h-3 rounded-l-sm"
                  style={{
                    width: `${callWidth}%`,
                    backgroundColor: COLORS.callOI,
                    opacity: isMaxCall ? 1 : 0.6,
                  }}
                />
              </div>

              {/* Strike price */}
              <div
                className={`w-16 text-center text-[10px] shrink-0 ${
                  isMaxCall || isMaxPut ? 'font-bold text-white' : 'text-[#787B86]'
                }`}
              >
                {row.strikePrice.toLocaleString()}
                {isMaxCall && <span className="text-[#EF4444] ml-0.5">▼</span>}
                {isMaxPut && <span className="text-[#10B981] ml-0.5">▲</span>}
              </div>

              {/* Put OI — left-aligned bar */}
              <div className="flex-1 flex justify-start">
                <div
                  className="h-3 rounded-r-sm"
                  style={{
                    width: `${putWidth}%`,
                    backgroundColor: COLORS.putOI,
                    opacity: isMaxPut ? 1 : 0.6,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
