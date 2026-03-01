import useSWR from 'swr';
import { useMemo } from 'react';
import {
  OptionDailyEntry,
  OptionInstitutionalEntry,
  FuturesInstitutionalEntry,
  PCRatioPoint,
  OIStrikeData,
  InstitutionSentiment,
} from '@/lib/types';
import {
  calcPCRatio,
  calcOIDistribution,
  calcInstitutionalSentiment,
  calcOptionSignalScore,
} from '@/lib/options';

interface OptionsAPIResponse {
  daily: OptionDailyEntry[];
  optionInst: OptionInstitutionalEntry[];
  futuresInst: FuturesInstitutionalEntry[];
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error('Failed to fetch options data');
    return r.json();
  });

export function useOptionsData() {
  const { data, error, isLoading } = useSWR<OptionsAPIResponse>(
    '/api/options?days=60&type=all',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );

  const pcRatio = useMemo((): PCRatioPoint[] => {
    if (!data?.daily?.length) return [];
    return calcPCRatio(data.daily);
  }, [data]);

  const oiDistribution = useMemo((): {
    data: OIStrikeData[];
    maxCallStrike: number;
    maxPutStrike: number;
  } => {
    if (!data?.daily?.length)
      return { data: [], maxCallStrike: 0, maxPutStrike: 0 };
    return calcOIDistribution(data.daily);
  }, [data]);

  const institutional = useMemo((): InstitutionSentiment[] => {
    if (!data?.optionInst?.length) return [];
    return calcInstitutionalSentiment(data.optionInst, data.futuresInst || []);
  }, [data]);

  const optionSignal = useMemo(() => {
    return calcOptionSignalScore(pcRatio, institutional);
  }, [pcRatio, institutional]);

  return {
    pcRatio,
    oiDistribution,
    institutional,
    optionSignal,
    error,
    isLoading,
  };
}
