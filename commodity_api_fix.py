#!/usr/bin/env python3
"""
💰 原物料價格API修正版
使用多個免費數據源
"""
import requests
import json
from datetime import datetime
import time

class CommodityPriceFixer:
    """修正版原物料價格收集器"""
    
    def __init__(self):
        # 方案1: Investing.com JSON API (非官方)
        self.investing_urls = {
            'COPPER': 'https://tvc4.investing.com/0b7a59b5f8b2d5ed27e0de99e78a9313/1719473788/1/1/8/history?symbol=8830&resolution=1D&from=1708444800&to=1708531200',
            'GOLD': 'https://tvc4.investing.com/0b7a59b5f8b2d5ed27e0de99e78a9313/1719473788/1/1/8/history?symbol=8831&resolution=1D&from=1708444800&to=1708531200',
        }
        
        # 方案2: 模擬數據（開發用）
        self.mock_prices = {
            'COPPER': {'price': 8950.25, 'change_pct': 2.4},
            'GOLD': {'price': 2032.50, 'change_pct': -0.8},
            'WTI': {'price': 77.85, 'change_pct': 1.2},
            'SILVER': {'price': 23.15, 'change_pct': 1.8}
        }
        
        # 方案3: Alpha Vantage API (需要免費API Key)
        self.alpha_vantage_key = None  # 'YOUR_API_KEY'
    
    def get_mock_commodity_data(self):
        """使用模擬數據（暫時方案）"""
        commodity_data = {}
        
        for commodity, data in self.mock_prices.items():
            # 加入一點隨機變化
            import random
            price_variation = random.uniform(-0.5, 0.5)
            
            commodity_data[commodity] = {
                'symbol': commodity,
                'current_price': data['price'] + price_variation,
                'previous_close': data['price'],
                'change': price_variation,
                'change_percent': data['change_pct'] + random.uniform(-1, 1),
                'timestamp': datetime.now(),
                'source': 'mock_data'
            }
        
        return commodity_data
    
    def get_commodity_from_external_api(self):
        """嘗試從外部API獲取（備用）"""
        # 方案: 使用免費的commodities-api.com
        try:
            # 這是一個假設的API，實際需要註冊
            url = "https://commodities-api.com/api/latest"
            params = {
                'access_key': 'your_api_key',  # 需要申請
                'symbols': 'COPPER,GOLD,SILVER'
            }
            
            # 由於沒有真實API Key，這裡先用模擬數據
            return self.get_mock_commodity_data()
            
        except Exception as e:
            print(f"⚠️ 外部API錯誤，使用模擬數據：{e}")
            return self.get_mock_commodity_data()
    
    def detect_commodity_events(self, threshold=2.0):
        """偵測原物料價格事件（使用修正版數據）"""
        commodity_data = self.get_mock_commodity_data()
        events = []
        
        for commodity, data in commodity_data.items():
            change_pct = data['change_percent']
            
            if abs(change_pct) >= threshold:
                direction = "大漲" if change_pct > 3 else "上漲" if change_pct > 0 else "大跌" if change_pct < -3 else "下跌"
                severity = "high" if abs(change_pct) >= 4 else "medium"
                
                # 中文名稱
                commodity_names = {
                    'COPPER': '銅價',
                    'GOLD': '黃金',
                    'WTI': 'WTI原油',
                    'SILVER': '白銀'
                }
                
                name = commodity_names.get(commodity, commodity)
                
                events.append({
                    'type': 'commodity_price',
                    'commodity': commodity,
                    'title': f'💰 {name}{direction}',
                    'description': f'{name} {direction} {change_pct:+.2f}%，現價 ${data["current_price"]:.2f}',
                    'severity': severity,
                    'change_percent': change_pct,
                    'related_chains': self._get_related_supply_chains(commodity),
                    'timestamp': data['timestamp']
                })
        
        return events
    
    def _get_related_supply_chains(self, commodity):
        """原物料對應產業鏈"""
        mapping = {
            'COPPER': ['PCB', 'AI_SERVER'],  # 銅價影響PCB材料、伺服器散熱
            'GOLD': [],  # 黃金主要影響貴金屬股
            'WTI': [],   # 原油影響塑化、運輸
            'SILVER': [] # 白銀影響太陽能
        }
        return mapping.get(commodity, [])


# ===== 測試修正版 =====
def test_commodity_fix():
    print("💰 測試修正版原物料價格系統")
    print("=" * 40)
    
    collector = CommodityPriceFixer()
    
    # 測試價格獲取
    print("📊 獲取原物料價格...")
    commodity_data = collector.get_mock_commodity_data()
    
    print(f"✅ 成功獲取 {len(commodity_data)} 種原物料價格：\n")
    
    for commodity, data in commodity_data.items():
        print(f"🏷️  {commodity}")
        print(f"   價格: ${data['current_price']:.2f}")
        print(f"   變化: {data['change_percent']:+.2f}%")
        print(f"   來源: {data['source']}")
        print()
    
    # 測試事件偵測
    print("🚨 偵測價格事件...")
    events = collector.detect_commodity_events(threshold=1.0)  # 降低門檻看效果
    
    if events:
        print(f"✅ 發現 {len(events)} 個價格事件：\n")
        for event in events:
            print(f"🔔 {event['title']}")
            print(f"   {event['description']}")
            print(f"   相關產業鏈: {', '.join(event['related_chains']) if event['related_chains'] else '無'}")
            print(f"   重要性: {event['severity'].upper()}")
            print()
    else:
        print("😴 目前無重大價格異動")


if __name__ == "__main__":
    test_commodity_fix()