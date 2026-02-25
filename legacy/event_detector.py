#!/usr/bin/env python3
"""
📊 台股事件偵測引擎 v1.0
基於 FinMind API 數據的即時事件偵測
"""
import requests
import pandas as pd
from datetime import datetime, timedelta
import json

class StockEventDetector:
    def __init__(self, api_token):
        self.api_token = api_token
        self.base_url = "https://api.finmindtrade.com/api/v4/data"
        
    def get_stock_data(self, stock_id, days=5):
        """取得股票數據"""
        end_date = datetime.now().strftime("%Y-%m-%d")
        start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
        
        params = {
            "dataset": "TaiwanStockPrice",
            "data_id": stock_id,
            "start_date": start_date,
            "end_date": end_date,
            "token": self.api_token
        }
        
        response = requests.get(self.base_url, params=params)
        data = response.json()
        
        if data.get("status") != 200:
            return None
            
        df = pd.DataFrame(data["data"])
        df['date'] = pd.to_datetime(df['date'])
        return df.sort_values('date').reset_index(drop=True)
    
    def get_institutional_data(self, stock_id, days=5):
        """取得法人買賣數據"""
        end_date = datetime.now().strftime("%Y-%m-%d")
        start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
        
        params = {
            "dataset": "TaiwanStockInstitutionalInvestorsBuySell",
            "data_id": stock_id,
            "start_date": start_date,
            "end_date": end_date,
            "token": self.api_token
        }
        
        response = requests.get(self.base_url, params=params)
        data = response.json()
        
        if data.get("status") != 200:
            return None
            
        df = pd.DataFrame(data["data"])
        df['date'] = pd.to_datetime(df['date'])
        return df.sort_values('date').reset_index(drop=True)
    
    def detect_volume_surge(self, df, stock_id, stock_name):
        """偵測成交量異動"""
        if len(df) < 5:
            return []
            
        # 計算近5日平均量
        avg_volume = df['Trading_Volume'].iloc[:-1].mean()
        latest_volume = df['Trading_Volume'].iloc[-1]
        
        events = []
        
        # 爆量偵測（超過平均量2倍）
        if latest_volume > avg_volume * 2:
            events.append({
                'type': 'volume_surge',
                'stock_id': stock_id,
                'stock_name': stock_name,
                'title': f'🔥 {stock_name}({stock_id}) 爆量',
                'description': f'成交量 {latest_volume/1e6:.1f}M，為近5日均量的 {latest_volume/avg_volume:.1f} 倍',
                'severity': 'high' if latest_volume > avg_volume * 3 else 'medium',
                'timestamp': datetime.now()
            })
            
        # 地量偵測（低於平均量0.3倍）
        elif latest_volume < avg_volume * 0.3:
            events.append({
                'type': 'volume_low',
                'stock_id': stock_id,
                'stock_name': stock_name,
                'title': f'📉 {stock_name}({stock_id}) 地量',
                'description': f'成交量 {latest_volume/1e6:.1f}M，創近期新低',
                'severity': 'medium',
                'timestamp': datetime.now()
            })
            
        return events
    
    def detect_price_breakout(self, df, stock_id, stock_name):
        """偵測技術突破"""
        if len(df) < 20:
            return []
            
        # 計算均線
        df['MA5'] = df['close'].rolling(5).mean()
        df['MA20'] = df['close'].rolling(20).mean()
        
        events = []
        latest = df.iloc[-1]
        prev = df.iloc[-2]
        
        # 突破20日均線
        if prev['close'] <= prev['MA20'] and latest['close'] > latest['MA20']:
            events.append({
                'type': 'ma20_breakout',
                'stock_id': stock_id,
                'stock_name': stock_name,
                'title': f'📈 {stock_name}({stock_id}) 突破MA20',
                'description': f'股價 {latest["close"]:.0f}，突破20日均線 {latest["MA20"]:.0f}',
                'severity': 'high',
                'timestamp': datetime.now()
            })
            
        # 跌破20日均線
        elif prev['close'] >= prev['MA20'] and latest['close'] < latest['MA20']:
            events.append({
                'type': 'ma20_breakdown',
                'stock_id': stock_id,
                'stock_name': stock_name,
                'title': f'📉 {stock_name}({stock_id}) 跌破MA20',
                'description': f'股價 {latest["close"]:.0f}，跌破20日均線 {latest["MA20"]:.0f}',
                'severity': 'high',
                'timestamp': datetime.now()
            })
            
        return events
    
    def detect_institutional_activity(self, inst_df, stock_id, stock_name):
        """偵測法人異動"""
        if inst_df is None or len(inst_df) < 2:
            return []
            
        events = []
        latest = inst_df.iloc[-1]
        
        # 外資大買（超過5000張）
        if latest.get('foreign_buy', 0) - latest.get('foreign_sell', 0) > 5000:
            net_buy = latest['foreign_buy'] - latest['foreign_sell']
            events.append({
                'type': 'foreign_big_buy',
                'stock_id': stock_id,
                'stock_name': stock_name,
                'title': f'💰 {stock_name}({stock_id}) 外資大買',
                'description': f'外資買超 {net_buy:,.0f} 張',
                'severity': 'high',
                'timestamp': datetime.now()
            })
            
        # 外資大賣（超過5000張）
        elif latest.get('foreign_sell', 0) - latest.get('foreign_buy', 0) > 5000:
            net_sell = latest['foreign_sell'] - latest['foreign_buy']
            events.append({
                'type': 'foreign_big_sell',
                'stock_id': stock_id,
                'stock_name': stock_name,
                'title': f'💸 {stock_name}({stock_id}) 外資大賣',
                'description': f'外資賣超 {net_sell:,.0f} 張',
                'severity': 'high',
                'timestamp': datetime.now()
            })
            
        return events
    
    def scan_watchlist(self, watchlist):
        """掃描關注清單"""
        all_events = []
        
        for stock_id, stock_name in watchlist.items():
            try:
                # 取得數據
                price_df = self.get_stock_data(stock_id)
                inst_df = self.get_institutional_data(stock_id)
                
                if price_df is not None:
                    # 偵測各類事件
                    volume_events = self.detect_volume_surge(price_df, stock_id, stock_name)
                    breakout_events = self.detect_price_breakout(price_df, stock_id, stock_name)
                    
                    all_events.extend(volume_events)
                    all_events.extend(breakout_events)
                
                if inst_df is not None:
                    inst_events = self.detect_institutional_activity(inst_df, stock_id, stock_name)
                    all_events.extend(inst_events)
                    
            except Exception as e:
                print(f"❌ 掃描 {stock_id} 時發生錯誤：{e}")
                
        return all_events
    
    def format_telegram_message(self, event):
        """格式化 Telegram 訊息"""
        severity_emoji = {
            'high': '🚨',
            'medium': '⚠️',
            'low': 'ℹ️'
        }
        
        emoji = severity_emoji.get(event['severity'], 'ℹ️')
        
        message = f"""
{emoji} **事件提醒**

📊 {event['title']}
💬 {event['description']}
⏰ {event['timestamp'].strftime('%H:%M')}

#台股事件 #{event['stock_id']}
"""
        return message.strip()

# ===== 使用範例 =====
def main():
    # 初始化偵測器
    detector = StockEventDetector(
        api_token="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJkYXRlIjoiMjAyNi0wMi0wNCAxOTozNjo0NiIsInVzZXJfaWQiOiJtb29kNTE2OCIsImVtYWlsIjoibW9vZDUxNjhAZ21haWwuY29tIiwiaXAiOiI1OS4xMTUuMTUzLjE1NyJ9.ZmNWlruCZRKWNqja9Wz3tAyxHMf9JZK-7XK8MQ3Ej0w"
    )
    
    # 關注股票清單
    watchlist = {
        "2330": "台積電",
        "2454": "聯發科", 
        "2382": "廣達",
        "6669": "緯穎",
        "3017": "奇鋐"
    }
    
    print("🔍 開始掃描股票事件...")
    
    # 掃描事件
    events = detector.scan_watchlist(watchlist)
    
    if events:
        print(f"📊 發現 {len(events)} 個事件：")
        for event in events:
            print("\n" + "="*50)
            print(detector.format_telegram_message(event))
    else:
        print("😴 目前沒有重要事件")

if __name__ == "__main__":
    main()