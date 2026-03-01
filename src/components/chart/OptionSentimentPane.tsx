'use client';

import { InstitutionSentiment } from '@/lib/types';

interface Props {
  institutional: InstitutionSentiment[];
}

function formatNum(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toLocaleString()}`;
}

export default function OptionSentimentPane({ institutional }: Props) {
  if (!institutional.length) {
    return (
      <div className="w-full h-[120px] flex items-center justify-center text-[#787B86] text-xs bg-[#131722]">
        無法人選擇權資料
      </div>
    );
  }

  const bullishCount = institutional.filter((i) => i.sentiment === 'bullish').length;
  const bearishCount = institutional.filter((i) => i.sentiment === 'bearish').length;
  const consensus =
    bullishCount > bearishCount
      ? '偏多'
      : bearishCount > bullishCount
        ? '偏空'
        : '中性';
  const consensusColor =
    consensus === '偏多' ? '#EF4444' : consensus === '偏空' ? '#10B981' : '#787B86';

  return (
    <div className="w-full shrink-0 bg-[#131722]">
      <div className="px-2 pt-1 pb-0.5 text-[10px] text-[#787B86]">法人選擇權部位</div>
      <div className="grid grid-cols-3 gap-1 px-2 pb-1">
        {institutional.map((inst) => {
          const sentColor = inst.sentiment === 'bullish' ? '#EF4444' : inst.sentiment === 'bearish' ? '#10B981' : '#787B86';
          const sentLabel = inst.sentiment === 'bullish' ? '偏多' : inst.sentiment === 'bearish' ? '偏空' : '中性';

          return (
            <div
              key={inst.name}
              className="rounded px-2 py-1.5"
              style={{ backgroundColor: '#1E222D' }}
            >
              <div className="text-xs font-medium text-[#D1D4DC] mb-1">{inst.name}</div>
              <div className="text-[10px] text-[#787B86] space-y-0.5">
                <div>
                  Call淨: <span className={inst.callNet > 0 ? 'text-[#EF4444]' : 'text-[#10B981]'}>{formatNum(inst.callNet)}</span>
                </div>
                <div>
                  Put淨: <span className={inst.putNet > 0 ? 'text-[#EF4444]' : 'text-[#10B981]'}>{formatNum(inst.putNet)}</span>
                </div>
                <div>
                  期貨淨: <span className={inst.futuresNet > 0 ? 'text-[#EF4444]' : 'text-[#10B981]'}>{formatNum(inst.futuresNet)}</span>
                </div>
              </div>
              <div className="mt-1 text-xs font-medium text-center" style={{ color: sentColor }}>
                {sentLabel}
              </div>
            </div>
          );
        })}
      </div>
      <div
        className="text-center text-xs py-1 border-t"
        style={{ borderColor: '#363A45' }}
      >
        <span className="text-[#787B86]">法人共識: </span>
        <span style={{ color: consensusColor }} className="font-medium">
          {consensus} ({bullishCount}/{institutional.length})
        </span>
      </div>
    </div>
  );
}
