#!/usr/bin/env python3
"""
📊 台股分析 Dashboard v3.0
功能：股票技術分析 + 選擇權法人分析 + 即時事件流
完整台股投資平台
"""
import streamlit as st
import requests
import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from datetime import datetime, timedelta
import numpy as np

# ===== 頁面設定 =====
st.set_page_config(
    page_title="台股分析平台",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ===== 樣式 =====
st.markdown("""
<style>
    .main-header {
        font-size: 2.5rem;
        font-weight: 700;
        color: #1E3A5F;
        margin-bottom: 0;
    }
    .sub-header {
        font-size: 1rem;
        color: #6B7280;
        margin-top: 0;
    }
    .metric-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 1rem;
        border-radius: 10px;
        color: white;
    }
    .signal-buy { color: #10B981; font-weight: bold; }
    .signal-sell { color: #EF4444; font-weight: bold; }
    .signal-hold { color: #F59E0B; font-weight: bold; }
    .stMetric > div { background-color: #F8FAFC; border-radius: 8px; padding: 10px; }
    .option-card {
        background: #F1F5F9;
        padding: 1rem;
        border-radius: 8px;
        border-left: 4px solid #3B82F6;
    }
    .event-card {
        background: #FFFFFF;
        border: 1px solid #E5E7EB;
        border-radius: 8px;
        padding: 1rem;
        margin: 0.5rem 0;
        border-left: 4px solid #3B82F6;
    }
    .event-high { border-left-color: #EF4444; }
    .event-medium { border-left-color: #F59E0B; }
    .event-low { border-left-color: #10B981; }
</style>
""", unsafe_allow_html=True)

# ===== API 設定 =====
FINMIND_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJkYXRlIjoiMjAyNi0wMi0wNCAxOTozNjo0NiIsInVzZXJfaWQiOiJtb29kNTE2OCIsImVtYWlsIjoibW9vZDUxNjhAZ21haWwuY29tIiwiaXAiOiI1OS4xMTUuMTUzLjE1NyJ9.ZmNWlruCZRKWNqja9Wz3tAyxHMf9JZK-7XK8MQ3Ej0w"

# ===== 千元股清單 =====
THOUSAND_CLUB = {
    "2330": "台積電", "2454": "聯發科", "3008": "大立光",
    "2382": "廣達", "6669": "緯穎", "3017": "奇鋐",
    "3037": "欣興", "2345": "智邦", "3661": "世芯-KY",
    "6415": "矽力-KY", "5347": "世界", "3443": "創意",
    "6488": "環球晶", "3533": "嘉澤", "2379": "瑞昱",
    "3711": "日月光投控", "6409": "旭隼", "2395": "研華",
    "3529": "力旺", "6239": "力成", "4966": "譜瑞-KY",
}

# ===== 通用數據函數 =====
@st.cache_data(ttl=300)
def get_stock_data(stock_id, days=120):
    """取得股票數據"""
    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    
    url = "https://api.finmindtrade.com/api/v4/data"
    params = {
        "dataset": "TaiwanStockPrice",
        "data_id": stock_id,
        "start_date": start_date,
        "end_date": end_date,
        "token": FINMIND_TOKEN
    }
    
    response = requests.get(url, params=params)
    data = response.json()
    
    if data.get("status") != 200 or not data.get("data"):
        return None
    
    df = pd.DataFrame(data["data"])
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values('date').reset_index(drop=True)
    return df

# ===== 事件偵測函數 =====
def detect_stock_events(stock_id, stock_name, days=10):
    """偵測個股事件"""
    df = get_stock_data(stock_id, days)
    if df is None or len(df) < 2:
        return []
    
    events = []
    latest = df.iloc[-1]
    prev = df.iloc[-2]
    
    # 價格異動
    price_change = latest['close'] - prev['close']
    price_pct = price_change / prev['close'] * 100
    
    if abs(price_pct) > 3:
        direction = "上漲" if price_pct > 0 else "下跌" 
        severity = "high" if abs(price_pct) > 5 else "medium"
        events.append({
            'type': 'price_move',
            'stock_id': stock_id,
            'stock_name': stock_name,
            'title': f'{"📈" if price_pct > 0 else "📉"} {stock_name} 大幅{direction}',
            'description': f'股價{direction} {price_pct:+.2f}%，收盤 {latest["close"]:.0f}',
            'severity': severity,
            'timestamp': latest['date'],
            'value': abs(price_pct)
        })
    
    # 成交量異動
    if len(df) >= 5:
        avg_volume = df['Trading_Volume'].iloc[-5:-1].mean()
        latest_volume = latest['Trading_Volume']
        volume_ratio = latest_volume / avg_volume
        
        if volume_ratio > 2:
            severity = "high" if volume_ratio > 3 else "medium"
            events.append({
                'type': 'volume_surge',
                'stock_id': stock_id,
                'stock_name': stock_name,
                'title': f'🔥 {stock_name} 爆量交易',
                'description': f'成交量 {latest_volume/1e6:.1f}M，為近日均量的 {volume_ratio:.1f} 倍',
                'severity': severity,
                'timestamp': latest['date'],
                'value': volume_ratio
            })
        elif volume_ratio < 0.3:
            events.append({
                'type': 'volume_low',
                'stock_id': stock_id,
                'stock_name': stock_name,
                'title': f'📉 {stock_name} 量縮',
                'description': f'成交量 {latest_volume/1e6:.1f}M，創近期新低',
                'severity': 'low',
                'timestamp': latest['date'],
                'value': volume_ratio
            })
    
    # 技術突破
    if len(df) >= 20:
        df_ma = df.copy()
        df_ma['MA20'] = df_ma['close'].rolling(20).mean()
        
        if len(df_ma) >= 2:
            latest_ma = df_ma.iloc[-1]
            prev_ma = df_ma.iloc[-2]
            
            # 突破MA20
            if (prev_ma['close'] <= prev_ma['MA20'] and 
                latest_ma['close'] > latest_ma['MA20']):
                events.append({
                    'type': 'ma20_breakout',
                    'stock_id': stock_id,
                    'stock_name': stock_name,
                    'title': f'📈 {stock_name} 突破MA20',
                    'description': f'股價 {latest_ma["close"]:.0f}，突破20日均線 {latest_ma["MA20"]:.0f}',
                    'severity': 'high',
                    'timestamp': latest_ma['date'],
                    'value': (latest_ma['close'] - latest_ma['MA20']) / latest_ma['MA20'] * 100
                })
            
            # 跌破MA20
            elif (prev_ma['close'] >= prev_ma['MA20'] and 
                  latest_ma['close'] < latest_ma['MA20']):
                events.append({
                    'type': 'ma20_breakdown',
                    'stock_id': stock_id,
                    'stock_name': stock_name,
                    'title': f'📉 {stock_name} 跌破MA20',
                    'description': f'股價 {latest_ma["close"]:.0f}，跌破20日均線 {latest_ma["MA20"]:.0f}',
                    'severity': 'high',
                    'timestamp': latest_ma['date'],
                    'value': abs((latest_ma['close'] - latest_ma['MA20']) / latest_ma['MA20'] * 100)
                })
    
    return events

def scan_watchlist_events(watchlist, max_events=50):
    """掃描關注清單事件"""
    all_events = []
    
    progress_bar = st.progress(0)
    status_text = st.empty()
    
    total_stocks = len(watchlist)
    
    for i, (stock_id, stock_name) in enumerate(watchlist.items()):
        status_text.text(f"🔍 掃描 {stock_name}...")
        progress_bar.progress((i + 1) / total_stocks)
        
        try:
            events = detect_stock_events(stock_id, stock_name)
            all_events.extend(events)
        except Exception as e:
            st.warning(f"⚠️ 掃描 {stock_name} 時發生錯誤")
    
    # 清除進度條
    progress_bar.empty()
    status_text.empty()
    
    # 排序事件（按時間和重要性）
    severity_score = {'high': 3, 'medium': 2, 'low': 1}
    all_events.sort(key=lambda x: (x['timestamp'], severity_score.get(x['severity'], 0)), reverse=True)
    
    return all_events[:max_events]

# ===== 頁面函數 =====
def stock_analysis_page():
    """股票技術分析頁面（簡化版）"""
    st.markdown('<p class="main-header">📈 股票技術分析</p>', unsafe_allow_html=True)
    st.markdown('<p class="sub-header">K線 + 技術指標 + 大戶籌碼</p>', unsafe_allow_html=True)
    st.success("📊 股票分析功能正在優化中...")

def option_analysis_page():
    """選擇權法人分析頁面（簡化版）"""
    st.markdown('<p class="main-header">🎯 選擇權法人分析</p>', unsafe_allow_html=True)
    st.markdown('<p class="sub-header">三大法人多空 + Put/Call Ratio</p>', unsafe_allow_html=True)
    st.success("🎯 選擇權分析功能正在優化中...")

def event_stream_page():
    """即時事件流頁面"""
    st.markdown('<p class="main-header">🚨 即時事件流</p>', unsafe_allow_html=True)
    st.markdown('<p class="sub-header">智能偵測 + 即時推播 + 多維分析</p>', unsafe_allow_html=True)
    st.markdown("---")
    
    # 側邊欄設定
    with st.sidebar:
        st.header("⚙️ 事件設定")
        
        # 關注股票
        watch_option = st.radio("關注股票", ["千元股清單", "自選股票"])
        
        if watch_option == "千元股清單":
            selected_stocks = st.multiselect(
                "選擇關注股票",
                options=list(THOUSAND_CLUB.keys()),
                default=["2330", "2454", "2382"],
                format_func=lambda x: f"{x} {THOUSAND_CLUB[x]}"
            )
            watchlist = {k: THOUSAND_CLUB[k] for k in selected_stocks}
        else:
            st.warning("🚧 自選股票功能開發中...")
            watchlist = {"2330": "台積電"}
        
        st.markdown("---")
        
        # 事件篩選
        st.subheader("📊 事件篩選")
        show_price = st.checkbox("價格異動", True)
        show_volume = st.checkbox("成交量異常", True) 
        show_technical = st.checkbox("技術突破", True)
        
        st.markdown("---")
        
        # 重要性篩選
        st.subheader("🎯 重要性")
        show_high = st.checkbox("🔴 高重要性", True)
        show_medium = st.checkbox("🟡 中重要性", True)
        show_low = st.checkbox("⚪ 低重要性", False)
    
    # 主要內容區
    col1, col2 = st.columns([2, 1])
    
    with col2:
        st.subheader("📊 掃描統計")
        
        if st.button("🔄 立即掃描", type="primary"):
            st.session_state.events = scan_watchlist_events(watchlist)
            st.session_state.scan_time = datetime.now()
    
    with col1:
        # 顯示事件列表
        if hasattr(st.session_state, 'events') and st.session_state.events:
            st.subheader(f"📈 發現 {len(st.session_state.events)} 個事件")
            
            # 過濾事件
            filtered_events = []
            for event in st.session_state.events:
                # 事件類型過濾
                if (event['type'] in ['price_move'] and not show_price) or \
                   (event['type'] in ['volume_surge', 'volume_low'] and not show_volume) or \
                   (event['type'] in ['ma20_breakout', 'ma20_breakdown'] and not show_technical):
                    continue
                
                # 重要性過濾
                if (event['severity'] == 'high' and not show_high) or \
                   (event['severity'] == 'medium' and not show_medium) or \
                   (event['severity'] == 'low' and not show_low):
                    continue
                
                filtered_events.append(event)
            
            # 顯示過濾後的事件
            for event in filtered_events:
                severity_class = f"event-{event['severity']}"
                
                st.markdown(f"""
                <div class="event-card {severity_class}">
                    <h4>{event['title']}</h4>
                    <p>{event['description']}</p>
                    <small>🕐 {event['timestamp'].strftime('%Y-%m-%d')} | 重要性: {event['severity'].upper()}</small>
                </div>
                """, unsafe_allow_html=True)
            
            if not filtered_events:
                st.info("🔍 沒有符合篩選條件的事件")
                
        else:
            st.info("👆 點擊「立即掃描」開始偵測事件")
            
            # 顯示示例事件
            st.subheader("📋 事件類型說明")
            
            example_events = [
                {
                    'title': '📈 台積電大幅上漲',
                    'description': '股價上漲 4.2%，收盤 1,915',
                    'type': 'price_move',
                    'severity': 'high'
                },
                {
                    'title': '🔥 聯發科爆量交易',
                    'description': '成交量 25.3M，為近日均量的 2.8 倍',
                    'type': 'volume_surge',
                    'severity': 'medium'
                },
                {
                    'title': '📈 廣達突破MA20',
                    'description': '股價 245，突破20日均線 240',
                    'type': 'ma20_breakout',
                    'severity': 'high'
                }
            ]
            
            for event in example_events:
                severity_class = f"event-{event['severity']}"
                st.markdown(f"""
                <div class="event-card {severity_class}">
                    <h4>{event['title']} <span style="color: #9CA3AF;">(示例)</span></h4>
                    <p>{event['description']}</p>
                    <small>類型: {event['type']} | 重要性: {event['severity'].upper()}</small>
                </div>
                """, unsafe_allow_html=True)
    
    with col2:
        # 統計信息
        if hasattr(st.session_state, 'events') and st.session_state.events:
            events = st.session_state.events
            
            st.metric("總事件數", len(events))
            
            # 按重要性統計
            high_count = sum(1 for e in events if e['severity'] == 'high')
            medium_count = sum(1 for e in events if e['severity'] == 'medium')
            low_count = sum(1 for e in events if e['severity'] == 'low')
            
            st.markdown("**重要性分布**")
            st.markdown(f"🔴 高: {high_count}")
            st.markdown(f"🟡 中: {medium_count}")
            st.markdown(f"⚪低: {low_count}")
            
            # 按類型統計
            type_count = {}
            for event in events:
                event_type = event['type']
                type_count[event_type] = type_count.get(event_type, 0) + 1
            
            if type_count:
                st.markdown("**事件類型**")
                type_labels = {
                    'price_move': '💹 價格異動',
                    'volume_surge': '🔥 爆量',
                    'volume_low': '📉 量縮',
                    'ma20_breakout': '📈 技術突破',
                    'ma20_breakdown': '📉 技術破底'
                }
                
                for event_type, count in type_count.items():
                    label = type_labels.get(event_type, event_type)
                    st.markdown(f"{label}: {count}")
            
            # 最後掃描時間
            if hasattr(st.session_state, 'scan_time'):
                st.markdown("---")
                st.caption(f"上次掃描: {st.session_state.scan_time.strftime('%H:%M:%S')}")
        
        else:
            st.info("等待掃描結果...")

# ===== 主程式 =====
def main():
    # 初始化 session state
    if 'events' not in st.session_state:
        st.session_state.events = []
    
    # 頁面導航
    with st.sidebar:
        st.markdown("## 🎯 台股分析平台 v3.0")
        page = st.radio(
            "選擇分析類型",
            ["📈 股票技術分析", "🎯 選擇權法人分析", "🚨 即時事件流"],
            index=2  # 預設選中事件流
        )
        
        st.markdown("---")
    
    # 根據選擇顯示頁面
    if page == "📈 股票技術分析":
        stock_analysis_page()
    elif page == "🎯 選擇權法人分析":
        option_analysis_page()
    elif page == "🚨 即時事件流":
        event_stream_page()
    
    # Footer
    st.markdown("---")
    st.caption(f"📊 數據來源: FinMind | 最後更新: {datetime.now().strftime('%Y-%m-%d %H:%M')}")

if __name__ == "__main__":
    main()