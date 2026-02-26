import { useEffect, useRef } from 'react';
import { StockCandle } from '@/lib/types';
import { useAlertStore } from '@/stores/alertStore';

export function useAlertChecker(symbol: string, candles: StockCandle[]) {
  const { alerts, markTriggered } = useAlertStore();
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!candles.length) return;

    const latest = candles[candles.length - 1];
    const activeAlerts = alerts.filter(
      (a) => a.symbol === symbol && !a.triggered
    );

    for (const alert of activeAlerts) {
      if (notifiedRef.current.has(alert.id)) continue;

      const triggered =
        (alert.direction === 'above' && latest.close >= alert.price) ||
        (alert.direction === 'below' && latest.close <= alert.price);

      if (triggered) {
        markTriggered(alert.id);
        notifiedRef.current.add(alert.id);

        // Browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`${symbol} 價格警報`, {
            body: `${latest.close.toFixed(1)} ${alert.direction === 'above' ? '突破' : '跌破'} ${alert.price.toFixed(1)}`,
            icon: '/favicon.ico',
          });
        } else if ('Notification' in window && Notification.permission !== 'denied') {
          Notification.requestPermission();
        }
      }
    }
  }, [symbol, candles, alerts, markTriggered]);
}
