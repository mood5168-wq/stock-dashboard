#!/usr/bin/env python3
"""
🔗 產業鏈連動監控系統
追蹤國際事件對台股的影響
"""
import requests
import pandas as pd
from datetime import datetime, timedelta

class SupplyChainMonitor:
    def __init__(self):
        # 產業鏈對照表
        self.supply_chains = {
            'PCB': {
                'upstream': ['日本住友化學', '東麗', 'CCL材料'],
                'taiwan_stocks': {
                    '2383': '台光電',
                    '3037': '欣興', 
                    '4958': '臻鼎',
                    '3189': '景碩',
                    '1449': '佳和'
                },
                'keywords': ['PCB', '印刷電路板', '載板', 'ABF', 'HDI']
            },
            
            'AI_SERVER': {
                'upstream': ['NVIDIA', 'AMD', 'Intel'],
                'taiwan_stocks': {
                    '2330': '台積電',
                    '2382': '廣達',
                    '6669': '緯穎',
                    '2376': '技嘉',
                    '6285': '啟碁'
                },
                'keywords': ['AI', '伺服器', '資料中心', '算力', 'GPU']
            },
            
            'COPPER': {
                'upstream': ['智利銅礦', '秘魯銅礦', 'LME銅價'],
                'taiwan_stocks': {
                    '4989': '榮科',
                    '1605': '華新',
                    '2009': '第一銅',
                    '1802': '台玻',
                    '8046': '南電'
                },
                'keywords': ['銅價', '電線電纜', '銅箔', '基板']
            },
            
            'MEMORY': {
                'upstream': ['三星', 'SK海力士', 'DRAM價格', 'NAND價格'],
                'taiwan_stocks': {
                    '2408': '南亞科',
                    '2344': '華邦電',
                    '2337': '旺宏',
                    '3711': '日月光投控'
                },
                'keywords': ['記憶體', 'DRAM', 'NAND', 'Flash']
            },
            
            'APPLE': {
                'upstream': ['Apple新品', 'iPhone銷量', '蘋果財報'],
                'taiwan_stocks': {
                    '2317': '鴻海',
                    '4938': '和碩', 
                    '2474': '可成',
                    '3008': '大立光',
                    '2408': '南亞科'
                },
                'keywords': ['蘋果', 'iPhone', 'iPad', 'Mac', '組裝']
            }
        }
    
    def get_correlation_signals(self):
        """產生連動信號"""
        signals = []
        
        # 模擬國際事件偵測（實際需要接新聞API）
        mock_events = [
            {
                'type': 'price_surge',
                'source': 'LME銅價',
                'change': '+5.2%',
                'impact_chain': 'COPPER',
                'severity': 'high',
                'description': '印尼Grasberg銅礦事故，LME銅價飆升5.2%'
            },
            {
                'type': 'earnings',
                'source': 'NVIDIA Q4財報',
                'change': '超預期',
                'impact_chain': 'AI_SERVER', 
                'severity': 'high',
                'description': 'NVIDIA Q4營收超預期，AI需求強勁'
            },
            {
                'type': 'supply_shortage',
                'source': '日本PCB材料廠',
                'change': '停工維修',
                'impact_chain': 'PCB',
                'severity': 'medium',
                'description': '日本住友化學廠區維修，PCB材料供應緊張'
            }
        ]
        
        # 分析連動影響
        for event in mock_events:
            chain = self.supply_chains.get(event['impact_chain'])
            if chain:
                affected_stocks = chain['taiwan_stocks']
                
                for stock_id, stock_name in affected_stocks.items():
                    signals.append({
                        'type': 'supply_chain_impact',
                        'stock_id': stock_id,
                        'stock_name': stock_name,
                        'title': f'🔗 {stock_name} 連動事件',
                        'description': f'{event["description"]}，預期影響{stock_name}',
                        'source_event': event['source'],
                        'severity': event['severity'],
                        'chain': event['impact_chain'],
                        'timestamp': datetime.now()
                    })
        
        return signals
    
    def analyze_chain_strength(self, chain_name, days=30):
        """分析產業鏈強度"""
        chain = self.supply_chains.get(chain_name)
        if not chain:
            return None
        
        # 這裡可以加入：
        # 1. 計算相關股票的相關係數
        # 2. 分析歷史連動性
        # 3. 評估當前強度
        
        return {
            'chain_name': chain_name,
            'correlation_strength': 0.75,  # 模擬數據
            'recent_events': 3,
            'affected_stocks': len(chain['taiwan_stocks']),
            'status': '高度相關'
        }
    
    def get_monitoring_dashboard(self):
        """產生監控儀表板數據"""
        dashboard = {
            'active_chains': [],
            'recent_events': self.get_correlation_signals(),
            'chain_strength': {}
        }
        
        # 計算各產業鏈狀態
        for chain_name in self.supply_chains.keys():
            strength = self.analyze_chain_strength(chain_name)
            dashboard['chain_strength'][chain_name] = strength
            
            if strength['correlation_strength'] > 0.6:
                dashboard['active_chains'].append(chain_name)
        
        return dashboard

# ===== 使用範例 =====
def demo_supply_chain_monitor():
    print("🔗 產業鏈連動監控系統 Demo")
    print("="*50)
    
    monitor = SupplyChainMonitor()
    
    # 取得連動信號
    signals = monitor.get_correlation_signals()
    
    print(f"📊 發現 {len(signals)} 個連動信號：\n")
    
    for signal in signals:
        print(f"🚨 {signal['title']}")
        print(f"   {signal['description']}")
        print(f"   來源事件：{signal['source_event']}")
        print(f"   產業鏈：{signal['chain']}")
        print(f"   重要性：{signal['severity'].upper()}")
        print()
    
    # 產業鏈強度分析
    print("📈 產業鏈強度分析：")
    print("-" * 30)
    
    for chain_name in monitor.supply_chains.keys():
        strength = monitor.analyze_chain_strength(chain_name)
        print(f"{chain_name:12} | 相關度: {strength['correlation_strength']:.2f} | {strength['status']}")

if __name__ == "__main__":
    demo_supply_chain_monitor()