#!/usr/bin/env python3
"""
📊 事件偵測測試版
"""
import requests
import pandas as pd
from datetime import datetime, timedelta

FINMIND_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJkYXRlIjoiMjAyNi0wMi0wNCAxOTozNjo0NiIsInVzZXJfaWQiOiJtb29kNTE2OCIsImVtYWlsIjoibW9vZDUxNjhAZ21haWwuY29tIiwiaXAiOiI1OS4xMTUuMTUzLjE1NyJ9.ZmNWlruCZRKWNqja9Wz3tAyxHMf9JZK-7XK8MQ3Ej0w"

def test_api():
    """測試 API 連接"""
    print("🔍 測試 FinMind API 連接...")
    
    url = "https://api.finmindtrade.com/api/v4/data"
    params = {
        "dataset": "TaiwanStockPrice",
        "data_id": "2330",
        "start_date": "2026-02-10",
        "end_date": "2026-02-21",
        "token": FINMIND_TOKEN
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        print(f"📊 API 狀態：{data.get('status')}")
        print(f"📊 回應訊息：{data.get('msg', 'N/A')}")
        
        if data.get("data"):
            df = pd.DataFrame(data["data"])
            print(f"📊 數據筆數：{len(df)}")
            print(f"📊 欄位：{df.columns.tolist()}")
            
            if len(df) > 0:
                latest = df.iloc[-1]
                print(f"📊 最新數據：{latest.to_dict()}")
                
                # 簡單事件偵測
                detect_simple_events(df)
        else:
            print("❌ 無數據")
            
    except Exception as e:
        print(f"❌ API 錯誤：{e}")

def detect_simple_events(df):
    """簡單事件偵測"""
    print("\n🚨 事件偵測結果：")
    
    if len(df) < 2:
        print("😴 數據不足，無法偵測事件")
        return
    
    events = []
    latest = df.iloc[-1]
    prev = df.iloc[-2]
    
    # 價格變化
    price_change = latest['close'] - prev['close']
    price_pct = price_change / prev['close'] * 100
    
    if abs(price_pct) > 3:  # 漲跌幅超過3%
        direction = "上漲" if price_pct > 0 else "下跌"
        events.append({
            'type': 'price_move',
            'title': f'📈 台積電大幅{direction}',
            'description': f'股價{direction} {price_pct:+.2f}%，收盤 {latest["close"]:.0f}',
            'severity': 'high'
        })
    
    # 成交量
    if len(df) >= 5:
        avg_volume = df['Trading_Volume'].iloc[-5:-1].mean()
        latest_volume = latest['Trading_Volume']
        volume_ratio = latest_volume / avg_volume
        
        if volume_ratio > 2:  # 爆量
            events.append({
                'type': 'volume_surge',
                'title': '🔥 台積電爆量',
                'description': f'成交量 {latest_volume/1e6:.1f}M，為近日均量的 {volume_ratio:.1f} 倍',
                'severity': 'medium'
            })
    
    # 顯示結果
    if events:
        for i, event in enumerate(events, 1):
            print(f"\n📢 事件 {i}：")
            print(f"   {event['title']}")
            print(f"   {event['description']}")
            print(f"   重要性：{event['severity']}")
    else:
        print("😴 無重要事件")

if __name__ == "__main__":
    test_api()