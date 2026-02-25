#!/usr/bin/env python3
"""
📊 數據收集器
整合新聞API + 原物料價格API + RSS新聞
"""
import requests
import pandas as pd
from datetime import datetime, timedelta
import json
import feedparser
import re

class NewsCollector:
    """新聞收集器"""
    def __init__(self):
        # 台灣財經媒體RSS
        self.rss_feeds = {
            'cnyes': 'https://news.cnyes.com/news/rss/tw_stock_news',  # 鉅亨網台股
            'udn': 'https://money.udn.com/rssfeed/news/1001/5591',     # 經濟日報
            'ctee': 'https://ctee.com.tw/news/stock/rss',              # 工商時報
            'wealth': 'https://www.wealth.com.tw/lists/rss.aspx?c=0'   # 財訊
        }
        
        # 產業關鍵字對照表
        self.industry_keywords = {
            'PCB': ['PCB', '印刷電路板', '台光電', '欣興', '臻鼎', '景碩', '載板', 'ABF', 'HDI'],
            'AI_SERVER': ['AI', '伺服器', 'NVIDIA', '廣達', '緯穎', '台積電', '資料中心', 'GPU'],
            'COPPER': ['銅價', '銅', '榮科', '華新', '第一銅', 'LME', '電線電纜'],
            'MEMORY': ['記憶體', 'DRAM', 'NAND', '南亞科', '華邦電', '旺宏', 'Flash'],
            'APPLE': ['蘋果', 'Apple', 'iPhone', '鴻海', '和碩', '大立光', '可成']
        }
    
    def fetch_rss_news(self, source=None, hours=24):
        """抓取RSS新聞"""
        news_items = []
        feeds = [source] if source else list(self.rss_feeds.keys())
        
        for feed_name in feeds:
            feed_url = self.rss_feeds.get(feed_name)
            if not feed_url:
                continue
                
            try:
                feed = feedparser.parse(feed_url)
                
                for entry in feed.entries:
                    # 解析發布時間
                    pub_time = None
                    if hasattr(entry, 'published_parsed'):
                        pub_time = datetime(*entry.published_parsed[:6])
                    elif hasattr(entry, 'updated_parsed'):
                        pub_time = datetime(*entry.updated_parsed[:6])
                    else:
                        pub_time = datetime.now()
                    
                    # 只保留最近N小時的新聞
                    if pub_time > datetime.now() - timedelta(hours=hours):
                        news_items.append({
                            'title': entry.title,
                            'link': entry.link,
                            'description': getattr(entry, 'description', '')[:200] + '...',
                            'source': feed_name,
                            'published': pub_time
                        })
                        
            except Exception as e:
                print(f"❌ RSS {feed_name} 錯誤：{e}")
        
        # 按時間排序
        news_items.sort(key=lambda x: x['published'], reverse=True)
        return news_items
    
    def classify_news_by_industry(self, news_items):
        """根據關鍵字分類新聞到產業鏈"""
        classified_news = {industry: [] for industry in self.industry_keywords.keys()}
        
        for news in news_items:
            text = f"{news['title']} {news['description']}".lower()
            
            for industry, keywords in self.industry_keywords.items():
                if any(keyword.lower() in text for keyword in keywords):
                    classified_news[industry].append({
                        **news,
                        'matched_keywords': [kw for kw in keywords if kw.lower() in text],
                        'relevance_score': len([kw for kw in keywords if kw.lower() in text])
                    })
                    break  # 避免重複分類
        
        return classified_news
    
    def generate_news_events(self, hours=12):
        """生成新聞事件"""
        news_items = self.fetch_rss_news(hours=hours)
        classified = self.classify_news_by_industry(news_items)
        
        events = []
        
        for industry, news_list in classified.items():
            for news in news_list[:3]:  # 每個產業取前3則
                # 判斷新聞情緒（簡化版）
                title_lower = news['title'].lower()
                if any(word in title_lower for word in ['漲', '升', '增', '看好', '利多', '強勁']):
                    sentiment = 'positive'
                    severity = 'medium'
                elif any(word in title_lower for word in ['跌', '降', '減', '看壞', '利空', '疲軟']):
                    sentiment = 'negative' 
                    severity = 'medium'
                else:
                    sentiment = 'neutral'
                    severity = 'low'
                
                events.append({
                    'type': 'news_event',
                    'chain': industry,
                    'title': f'📰 {news["title"][:50]}...',
                    'description': news['description'],
                    'source': f'{news["source"]} | {news["link"]}',
                    'sentiment': sentiment,
                    'severity': severity,
                    'matched_keywords': news['matched_keywords'],
                    'timestamp': news['published']
                })
        
        return sorted(events, key=lambda x: x['timestamp'], reverse=True)


class CommodityCollector:
    """原物料價格收集器"""
    def __init__(self):
        # API Ninjas API Key (免費版每月1000次請求)
        self.api_ninjas_key = None  # 需要申請
        self.base_url = "https://api.api-ninjas.com/v1/commodityprice"
        
        # 關鍵原物料對照表
        self.commodities = {
            'COPPER': 'Copper',
            'GOLD': 'Gold', 
            'SILVER': 'Silver',
            'WTI': 'Crude Oil WTI',
            'BRENT': 'Crude Oil Brent'
        }
        
        # 備用：使用Yahoo Finance或其他免費源
        self.yahoo_symbols = {
            'COPPER': 'HG=F',  # 銅期貨
            'GOLD': 'GC=F',    # 黃金期貨
            'WTI': 'CL=F',     # 原油期貨
        }
    
    def get_yahoo_price(self, symbol):
        """從Yahoo Finance獲取價格（免費）"""
        try:
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
            params = {
                'range': '2d',
                'interval': '1d'
            }
            
            response = requests.get(url, params=params, timeout=10)
            data = response.json()
            
            if 'chart' in data and data['chart']['result']:
                result = data['chart']['result'][0]
                meta = result['meta']
                
                current_price = meta.get('regularMarketPrice', 0)
                prev_close = meta.get('previousClose', current_price)
                change = current_price - prev_close
                change_pct = (change / prev_close * 100) if prev_close else 0
                
                return {
                    'symbol': symbol,
                    'current_price': current_price,
                    'previous_close': prev_close,
                    'change': change,
                    'change_percent': change_pct,
                    'timestamp': datetime.now()
                }
        except Exception as e:
            print(f"❌ Yahoo Finance {symbol} 錯誤：{e}")
            
        return None
    
    def get_all_commodity_prices(self):
        """獲取所有原物料價格"""
        prices = {}
        
        for commodity, symbol in self.yahoo_symbols.items():
            price_data = self.get_yahoo_price(symbol)
            if price_data:
                prices[commodity] = price_data
        
        return prices
    
    def detect_price_events(self, threshold=3.0):
        """偵測價格異動事件"""
        prices = self.get_all_commodity_prices()
        events = []
        
        for commodity, price_data in prices.items():
            change_pct = price_data['change_percent']
            
            if abs(change_pct) >= threshold:
                direction = "上漲" if change_pct > 0 else "下跌"
                severity = "high" if abs(change_pct) >= 5 else "medium"
                
                # 關聯台股
                related_chains = self._get_related_chains(commodity)
                
                events.append({
                    'type': 'commodity_price',
                    'commodity': commodity,
                    'title': f'💰 {commodity} 價格{direction}',
                    'description': f'{commodity} {direction} {change_pct:+.2f}%，目前價格 {price_data["current_price"]:.2f}',
                    'price_data': price_data,
                    'severity': severity,
                    'related_chains': related_chains,
                    'timestamp': price_data['timestamp']
                })
        
        return events
    
    def _get_related_chains(self, commodity):
        """取得原物料相關產業鏈"""
        mapping = {
            'COPPER': ['PCB', 'AI_SERVER'],  # 銅價影響PCB和伺服器
            'GOLD': [],
            'WTI': []  # 原油可能影響塑化、運輸等
        }
        return mapping.get(commodity, [])


# ===== 整合收集器 =====
class DataCollectionManager:
    """數據收集管理器"""
    def __init__(self):
        self.news_collector = NewsCollector()
        self.commodity_collector = CommodityCollector()
    
    def collect_all_events(self, hours=12):
        """收集所有事件"""
        print("📰 收集新聞事件...")
        news_events = self.news_collector.generate_news_events(hours)
        
        print("💰 收集原物料價格事件...")  
        commodity_events = self.commodity_collector.detect_price_events()
        
        # 合併並排序
        all_events = news_events + commodity_events
        all_events.sort(key=lambda x: x['timestamp'], reverse=True)
        
        return all_events
    
    def get_summary_stats(self):
        """取得收集統計"""
        commodity_prices = self.commodity_collector.get_all_commodity_prices()
        
        return {
            'commodity_count': len(commodity_prices),
            'news_sources': len(self.news_collector.rss_feeds),
            'industry_coverage': len(self.news_collector.industry_keywords),
            'last_update': datetime.now()
        }


# ===== 測試腳本 =====
def demo_data_collection():
    print("🔄 數據收集系統測試")
    print("=" * 50)
    
    manager = DataCollectionManager()
    
    # 測試新聞收集
    print("\n📰 測試新聞收集...")
    news_events = manager.news_collector.generate_news_events(hours=24)
    print(f"✅ 收集到 {len(news_events)} 則新聞事件")
    
    if news_events:
        print("\n前3則新聞事件：")
        for i, event in enumerate(news_events[:3], 1):
            print(f"\n{i}. {event['title']}")
            print(f"   產業鏈: {event['chain']}")
            print(f"   關鍵字: {', '.join(event['matched_keywords'])}")
            print(f"   時間: {event['timestamp'].strftime('%Y-%m-%d %H:%M')}")
    
    # 測試原物料價格
    print(f"\n💰 測試原物料價格...")
    commodity_events = manager.commodity_collector.detect_price_events(threshold=1.0)
    print(f"✅ 偵測到 {len(commodity_events)} 個價格事件")
    
    if commodity_events:
        print("\n原物料價格事件：")
        for event in commodity_events:
            print(f"• {event['title']}: {event['description']}")
    
    # 統計資訊
    stats = manager.get_summary_stats()
    print(f"\n📊 收集統計：")
    print(f"  原物料監控: {stats['commodity_count']} 種")
    print(f"  新聞來源: {stats['news_sources']} 個")
    print(f"  產業覆蓋: {stats['industry_coverage']} 條鏈")


if __name__ == "__main__":
    demo_data_collection()