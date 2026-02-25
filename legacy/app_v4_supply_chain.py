#!/usr/bin/env python3
"""
📊 台股分析 Dashboard v4.0 - 產業鏈連動版
功能：股票技術分析 + 選擇權法人分析 + 產業鏈連動追蹤
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
    page_title="台股分析平台 v4.0",
    page_icon="🔗",
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
    .chain-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 1rem;
        border-radius: 8px;
        margin: 0.5rem 0;
    }
    .supply-chain-pcb { background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%); }
    .supply-chain-ai { background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%); }
    .supply-chain-copper { background: linear-gradient(135deg, #FFE066 0%, #FF6B35 100%); }
    .supply-chain-memory { background: linear-gradient(135deg, #A8E6CF 0%, #7FCDCD 100%); }
    .supply-chain-apple { background: linear-gradient(135deg, #FFD93D 0%, #6BCF7F 100%); }
</style>
""", unsafe_allow_html=True)

# ===== API 設定 =====
FINMIND_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJkYXRlIjoiMjAyNi0wMi0wNCAxOTozNjo0NiIsInVzZXJfaWQiOiJtb29kNTE2OCIsImVtYWlsIjoibW9vZDUxNjhAZ21haWwuY29tIiwiaXAiOiI1OS4xMTUuMTUzLjE1NyJ9.ZmNWlruCZRKWNqja9Wz3tAyxHMf9JZK-7XK8MQ3Ej0w"

# ===== 產業鏈定義 =====
SUPPLY_CHAINS = {
    'PCB': {
        'name': '🔴 PCB 印刷電路板',
        'upstream': ['日本住友化學', '東麗', 'Panasonic', 'CCL材料'],
        'taiwan_stocks': {
            '2383': '台光電',
            '3037': '欣興', 
            '4958': '臻鼎',
            '3189': '景碩',
            '1449': '佳和',
            '8021': '尖點',
            '6285': '啟碁'
        },
        'monitoring_keys': ['PCB材料漲價', 'ABF載板', 'HDI需求', '5G基站'],
        'description': 'AI伺服器、5G設備帶動高階PCB需求，材料成本是關鍵變數'
    },
    
    'AI_SERVER': {
        'name': '🔵 AI 伺服器',
        'upstream': ['NVIDIA', 'AMD', 'Intel', 'Broadcom'],
        'taiwan_stocks': {
            '2330': '台積電',
            '2382': '廣達',
            '6669': '緯穎',
            '2376': '技嘉',
            '3711': '日月光投控',
            '2317': '鴻海'
        },
        'monitoring_keys': ['NVIDIA財報', 'GPU需求', 'AI晶片', '資料中心'],
        'description': 'NVIDIA領軍AI革命，台廠受惠程度取決於供應鏈地位'
    },
    
    'COPPER': {
        'name': '🟡 銅價連動',
        'upstream': ['智利Escondida', '祕魯Cerro Verde', 'LME銅價'],
        'taiwan_stocks': {
            '4989': '榮科',
            '1605': '華新',
            '2009': '第一銅',
            '1802': '台玻',
            '8046': '南電',
            '2383': '台光電'
        },
        'monitoring_keys': ['銅礦事故', '中國需求', '綠能投資', '電動車'],
        'description': '綠能+電動車推動銅需求，供應中斷是價格催化劑'
    },
    
    'MEMORY': {
        'name': '🟣 記憶體',
        'upstream': ['三星', 'SK海力士', 'Micron', 'DRAM價格'],
        'taiwan_stocks': {
            '2408': '南亞科',
            '2344': '華邦電',
            '2337': '旺宏',
            '3711': '日月光投控',
            '2449': '京元電'
        },
        'monitoring_keys': ['DRAM合約價', 'AI記憶體', '伺服器需求', '韓廠產能'],
        'description': 'AI帶動HBM需求，記憶體進入新景氣循環'
    },
    
    'APPLE': {
        'name': '🟢 蘋果供應鏈',
        'upstream': ['Apple財報', 'iPhone銷量', '新品發布'],
        'taiwan_stocks': {
            '2317': '鴻海',
            '4938': '和碩',
            '2474': '可成',
            '3008': '大立光',
            '2408': '南亞科',
            '6239': '力成'
        },
        'monitoring_keys': ['iPhone出貨', '蘋果財報', '新品週期', '中國需求'],
        'description': '蘋果創新週期決定供應鏈榮枯，中國市場是關鍵變數'
    }
}

# ===== 數據函數 =====
@st.cache_data(ttl=300)
def get_stock_data(stock_id, days=10):
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
    return df.sort_values('date').reset_index(drop=True)

def generate_supply_chain_events():
    """生成產業鏈事件（模擬）"""
    # 實際應該從新聞API、價格API等來源取得
    mock_events = [
        {
            'type': 'material_price',
            'chain': 'PCB',
            'title': '🔴 PCB材料價格上漲',
            'description': '日本住友化學宣布CCL材料調漲15%，預期影響台光電、欣興等PCB廠成本',
            'impact_stocks': ['2383', '3037', '4958'],
            'severity': 'high',
            'timestamp': datetime.now() - timedelta(hours=2)
        },
        {
            'type': 'earnings',
            'chain': 'AI_SERVER',
            'title': '🔵 NVIDIA Q4財報超預期',
            'description': 'NVIDIA資料中心營收年增409%，AI需求強勁，利多台積電、廣達',
            'impact_stocks': ['2330', '2382', '6669'],
            'severity': 'high',
            'timestamp': datetime.now() - timedelta(hours=6)
        },
        {
            'type': 'commodity',
            'chain': 'COPPER',
            'title': '🟡 LME銅價創年內新高',
            'description': '印尼Grasberg銅礦停工維修，LME銅價大漲5.8%，榮科、華新受惠',
            'impact_stocks': ['4989', '1605', '2009'],
            'severity': 'medium',
            'timestamp': datetime.now() - timedelta(hours=4)
        },
        {
            'type': 'industry_news',
            'chain': 'MEMORY',
            'title': '🟣 DRAM合約價止跌回升',
            'description': 'AI伺服器拉貨力道轉強，DDR5合約價月增3%，南亞科、華邦電利多',
            'impact_stocks': ['2408', '2344'],
            'severity': 'medium',
            'timestamp': datetime.now() - timedelta(hours=8)
        },
        {
            'type': 'product_cycle',
            'chain': 'APPLE',
            'title': '🟢 蘋果春季發表會預告',
            'description': 'Apple預告3月發表新品，外傳iPad Pro將搭載M4晶片，鴻海、和碩備貨',
            'impact_stocks': ['2317', '4938'],
            'severity': 'low',
            'timestamp': datetime.now() - timedelta(hours=12)
        }
    ]
    
    return sorted(mock_events, key=lambda x: x['timestamp'], reverse=True)

def analyze_supply_chain_performance(chain_name, days=5):
    """分析產業鏈表現"""
    chain = SUPPLY_CHAINS.get(chain_name)
    if not chain:
        return None
    
    performance = []
    total_change = 0
    stock_count = 0
    
    for stock_id, stock_name in chain['taiwan_stocks'].items():
        df = get_stock_data(stock_id, days)
        if df is not None and len(df) >= 2:
            latest = df.iloc[-1]
            first = df.iloc[0]
            change_pct = (latest['close'] - first['close']) / first['close'] * 100
            
            performance.append({
                'stock_id': stock_id,
                'stock_name': stock_name,
                'change_pct': change_pct,
                'latest_price': latest['close']
            })
            
            total_change += change_pct
            stock_count += 1
    
    avg_performance = total_change / stock_count if stock_count > 0 else 0
    
    return {
        'chain_name': chain_name,
        'avg_performance': avg_performance,
        'stock_performance': sorted(performance, key=lambda x: x['change_pct'], reverse=True),
        'status': '強勢' if avg_performance > 2 else '弱勢' if avg_performance < -2 else '持平'
    }

# ===== 頁面函數 =====
def supply_chain_monitor_page():
    """產業鏈監控頁面"""
    st.markdown('<p class="main-header">🔗 產業鏈連動追蹤</p>', unsafe_allow_html=True)
    st.markdown('<p class="sub-header">PCB材料漲價 → 台光電上漲 | NVIDIA財報 → AI供應鏈連動</p>', unsafe_allow_html=True)
    st.markdown("---")
    
    # 側邊欄設定
    with st.sidebar:
        st.header("⚙️ 監控設定")
        
        # 產業鏈選擇
        selected_chains = st.multiselect(
            "選擇監控產業鏈",
            options=list(SUPPLY_CHAINS.keys()),
            default=['PCB', 'AI_SERVER', 'COPPER'],
            format_func=lambda x: SUPPLY_CHAINS[x]['name']
        )
        
        st.markdown("---")
        
        # 事件類型
        st.subheader("📊 事件類型")
        show_material = st.checkbox("原物料價格", True)
        show_earnings = st.checkbox("財報業績", True) 
        show_industry = st.checkbox("產業消息", True)
        show_product = st.checkbox("產品週期", False)
        
        st.markdown("---")
        
        # 分析設定
        st.subheader("🎯 分析設定")
        analysis_days = st.slider("分析天數", 3, 30, 5)
        
        if st.button("🔄 重新分析", type="primary"):
            st.cache_data.clear()
            st.rerun()
    
    # 主要內容
    tab1, tab2, tab3 = st.tabs(["📊 產業鏈總覽", "🚨 即時事件", "📈 績效分析"])
    
    with tab1:
        st.subheader("🔗 產業鏈總覽")
        
        # 顯示選中的產業鏈
        cols = st.columns(2)
        
        for i, chain_id in enumerate(selected_chains):
            chain = SUPPLY_CHAINS[chain_id]
            col = cols[i % 2]
            
            with col:
                st.markdown(f"""
                <div class="chain-card supply-chain-{chain_id.lower()}">
                    <h4>{chain['name']}</h4>
                    <p><strong>上游關鍵：</strong> {', '.join(chain['upstream'][:2])}...</p>
                    <p><strong>台股受惠：</strong> {len(chain['taiwan_stocks'])} 檔</p>
                    <p><strong>監控重點：</strong> {', '.join(chain['monitoring_keys'][:2])}...</p>
                    <hr style="margin: 0.5rem 0; border-color: rgba(255,255,255,0.3);">
                    <small>{chain['description']}</small>
                </div>
                """, unsafe_allow_html=True)
                
                # 顯示主要成分股
                st.markdown("**主要成分股：**")
                main_stocks = list(chain['taiwan_stocks'].items())[:4]
                for stock_id, stock_name in main_stocks:
                    st.markdown(f"• {stock_name} ({stock_id})")
    
    with tab2:
        st.subheader("🚨 產業鏈即時事件")
        
        events = generate_supply_chain_events()
        
        # 過濾事件
        filtered_events = []
        for event in events:
            if event['chain'] not in selected_chains:
                continue
                
            if (event['type'] == 'material_price' and not show_material) or \
               (event['type'] == 'earnings' and not show_earnings) or \
               (event['type'] in ['commodity', 'industry_news'] and not show_industry) or \
               (event['type'] == 'product_cycle' and not show_product):
                continue
            
            filtered_events.append(event)
        
        if filtered_events:
            for event in filtered_events:
                severity_class = f"event-{event['severity']}"
                chain_info = SUPPLY_CHAINS[event['chain']]
                
                # 影響股票詳情
                impact_details = []
                for stock_id in event['impact_stocks']:
                    if stock_id in chain_info['taiwan_stocks']:
                        stock_name = chain_info['taiwan_stocks'][stock_id]
                        impact_details.append(f"{stock_name}({stock_id})")
                
                impact_text = "、".join(impact_details)
                
                st.markdown(f"""
                <div class="event-card {severity_class}">
                    <h4>{event['title']}</h4>
                    <p>{event['description']}</p>
                    <p><strong>影響個股：</strong> {impact_text}</p>
                    <small>🕐 {event['timestamp'].strftime('%m/%d %H:%M')} | 
                           產業鏈: {chain_info['name']} | 
                           重要性: {event['severity'].upper()}</small>
                </div>
                """, unsafe_allow_html=True)
        else:
            st.info("🔍 沒有符合篩選條件的事件")
    
    with tab3:
        st.subheader("📈 產業鏈績效分析")
        
        if selected_chains:
            # 績效比較
            performance_data = []
            
            for chain_id in selected_chains:
                perf = analyze_supply_chain_performance(chain_id, analysis_days)
                if perf:
                    performance_data.append({
                        '產業鏈': SUPPLY_CHAINS[chain_id]['name'],
                        '平均漲跌幅': f"{perf['avg_performance']:+.2f}%",
                        '狀態': perf['status'],
                        '成分股數': len(perf['stock_performance'])
                    })
            
            if performance_data:
                st.markdown(f"**過去 {analysis_days} 日產業鏈表現**")
                df_perf = pd.DataFrame(performance_data)
                st.dataframe(df_perf, use_container_width=True, hide_index=True)
                
                st.markdown("---")
                
                # 個股明細
                for chain_id in selected_chains:
                    perf = analyze_supply_chain_performance(chain_id, analysis_days)
                    if perf and perf['stock_performance']:
                        st.markdown(f"**{SUPPLY_CHAINS[chain_id]['name']} 個股表現**")
                        
                        cols = st.columns(4)
                        for i, stock in enumerate(perf['stock_performance'][:8]):  # 只顯示前8名
                            col = cols[i % 4]
                            with col:
                                color = "🟢" if stock['change_pct'] > 0 else "🔴"
                                st.metric(
                                    f"{stock['stock_name']}",
                                    f"{stock['latest_price']:.0f}",
                                    f"{stock['change_pct']:+.2f}%"
                                )
                        st.markdown("---")
        else:
            st.warning("請在左側選擇要分析的產業鏈")

def main():
    """主程式"""
    # 初始化
    if 'events' not in st.session_state:
        st.session_state.events = []
    
    # 頁面導航
    with st.sidebar:
        st.markdown("## 🔗 台股產業鏈分析平台")
        st.markdown("**v4.0 連動追蹤版**")
        
        page = st.radio(
            "選擇功能",
            ["🔗 產業鏈監控", "📈 股票技術分析", "🎯 選擇權分析"],
            index=0  # 預設產業鏈監控
        )
        
        st.markdown("---")
        
        # 快速統計
        st.markdown("**📊 監控統計**")
        st.markdown(f"• 產業鏈數量：{len(SUPPLY_CHAINS)}")
        st.markdown(f"• 追蹤股票：{sum(len(chain['taiwan_stocks']) for chain in SUPPLY_CHAINS.values())} 檔")
        st.markdown(f"• 上游來源：{sum(len(chain['upstream']) for chain in SUPPLY_CHAINS.values())} 個")
    
    # 根據選擇顯示頁面
    if page == "🔗 產業鏈監控":
        supply_chain_monitor_page()
    elif page == "📈 股票技術分析":
        st.success("📊 股票技術分析功能整合中...")
    elif page == "🎯 選擇權分析":
        st.success("🎯 選擇權分析功能整合中...")
    
    # Footer
    st.markdown("---")
    st.caption(f"🔗 產業鏈數據整合：{len(SUPPLY_CHAINS)} 個主要產業鏈 | "
               f"📊 最後更新：{datetime.now().strftime('%Y-%m-%d %H:%M')}")

if __name__ == "__main__":
    main()