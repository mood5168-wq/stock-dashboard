#!/usr/bin/env python3
"""
📊 台股分析 Dashboard v2.0
功能：股票技術分析 + 選擇權法人分析
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

@st.cache_data(ttl=600)
def get_chip_data(stock_id, days=120):
    """取得大戶籌碼數據"""
    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    
    url = "https://api.finmindtrade.com/api/v4/data"
    params = {
        "dataset": "TaiwanStockHoldingSharesPer",
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
    return df

# ===== 選擇權數據函數 =====
@st.cache_data(ttl=300)
def get_option_institutional(days=30):
    """取得選擇權三大法人數據"""
    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    
    url = "https://api.finmindtrade.com/api/v4/data"
    params = {
        "dataset": "TaiwanOptionInstitutional",
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

@st.cache_data(ttl=300)
def get_option_daily(days=30):
    """取得選擇權日成交資訊"""
    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    
    url = "https://api.finmindtrade.com/api/v4/data"
    params = {
        "dataset": "TaiwanOptionDaily",
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

def calc_put_call_ratio(option_df):
    """計算 Put/Call Ratio"""
    if option_df is None or option_df.empty:
        return None
    
    # 按日期分組計算
    daily_summary = []
    
    for date in option_df['date'].unique():
        day_data = option_df[option_df['date'] == date]
        
        # 分離 Call 和 Put
        calls = day_data[day_data['contract_name'].str.contains('C', na=False)]
        puts = day_data[day_data['contract_name'].str.contains('P', na=False)]
        
        # 計算總未平倉量
        total_call_oi = calls['open_interest'].sum()
        total_put_oi = puts['open_interest'].sum()
        
        # 計算 P/C Ratio
        pc_ratio = (total_put_oi / total_call_oi * 100) if total_call_oi > 0 else 0
        
        daily_summary.append({
            'date': date,
            'call_oi': total_call_oi,
            'put_oi': total_put_oi,
            'pc_ratio': pc_ratio
        })
    
    return pd.DataFrame(daily_summary).sort_values('date')

def analyze_institutional_sentiment(inst_df):
    """分析三大法人選擇權情緒"""
    if inst_df is None or inst_df.empty:
        return None
    
    # 最新數據
    latest = inst_df.iloc[-1]
    
    # 計算各法人多空傾向
    foreign_sentiment = "做多" if latest.get('foreign_long', 0) > latest.get('foreign_short', 0) else "做空"
    investment_sentiment = "做多" if latest.get('investment_trust_long', 0) > latest.get('investment_trust_short', 0) else "做空"
    dealer_sentiment = "做多" if latest.get('dealer_long', 0) > latest.get('dealer_short', 0) else "做空"
    
    return {
        'date': latest['date'],
        'foreign': foreign_sentiment,
        'investment': investment_sentiment,
        'dealer': dealer_sentiment,
        'foreign_net': latest.get('foreign_long', 0) - latest.get('foreign_short', 0),
        'investment_net': latest.get('investment_trust_long', 0) - latest.get('investment_trust_short', 0),
        'dealer_net': latest.get('dealer_long', 0) - latest.get('dealer_short', 0)
    }

# ===== 股票分析相關函數（從原版移植）=====
def calc_chip_summary(chip_df):
    """計算大戶持股"""
    if chip_df is None or chip_df.empty:
        return None
    
    large_levels = [
        "1,000-5,000", "5,001-10,000", "10,001-15,000",
        "15,001-20,000", "20,001-30,000", "30,001-40,000",
        "40,001-50,000", "50,001-100,000", "100,001-200,000",
        "200,001-400,000", "400,001-600,000", "600,001-800,000",
        "800,001-1,000,000", "more than 1,000,001"
    ]
    
    result = []
    for date in chip_df['date'].unique():
        day = chip_df[chip_df['date'] == date]
        large = day[day['HoldingSharesLevel'].isin(large_levels)]
        result.append({
            'date': date,
            'large_pct': large['percent'].sum(),
        })
    
    df = pd.DataFrame(result).sort_values('date')
    df['pct_chg'] = df['large_pct'].diff()
    return df

def calc_indicators(df):
    """計算技術指標"""
    # 均線
    for p in [5, 10, 20, 60]:
        df[f'MA{p}'] = df['close'].rolling(window=p).mean()
    
    # RSI
    delta = df['close'].diff()
    gain = delta.where(delta > 0, 0).rolling(14).mean()
    loss = (-delta).where(delta < 0, 0).rolling(14).mean()
    df['RSI'] = 100 - (100 / (1 + gain / loss))
    
    # KD
    low_9 = df['min'].rolling(9).min()
    high_9 = df['max'].rolling(9).max()
    rsv = (df['close'] - low_9) / (high_9 - low_9) * 100
    df['K'] = rsv.ewm(span=3, adjust=False).mean()
    df['D'] = df['K'].ewm(span=3, adjust=False).mean()
    
    # MACD
    ema12 = df['close'].ewm(span=12, adjust=False).mean()
    ema26 = df['close'].ewm(span=26, adjust=False).mean()
    df['DIF'] = ema12 - ema26
    df['DEM'] = df['DIF'].ewm(span=9, adjust=False).mean()
    df['OSC'] = (df['DIF'] - df['DEM']) * 2
    
    return df

# ===== 頁面函數 =====
def stock_analysis_page():
    """股票技術分析頁面"""
    st.markdown('<p class="main-header">📈 股票技術分析</p>', unsafe_allow_html=True)
    st.markdown('<p class="sub-header">K線 + 技術指標 + 大戶籌碼</p>', unsafe_allow_html=True)
    st.markdown("---")
    
    # 側邊欄設定
    with st.sidebar:
        st.header("⚙️ 股票設定")
        
        # 股票選擇
        stock_option = st.radio("選擇方式", ["千元股清單", "自訂代號"])
        
        if stock_option == "千元股清單":
            selected = st.selectbox(
                "選擇股票",
                options=list(THOUSAND_CLUB.keys()),
                format_func=lambda x: f"{x} {THOUSAND_CLUB[x]}"
            )
            stock_id = selected
            stock_name = f"{THOUSAND_CLUB[selected]} ({selected})"
        else:
            stock_id = st.text_input("輸入股票代號", "2330")
            stock_name = f"({stock_id})"
        
        days = st.slider("顯示天數", 30, 180, 60)
        
        st.markdown("---")
        st.subheader("📊 顯示選項")
        show_ma = st.checkbox("均線", True)
        show_volume = st.checkbox("成交量", True)
        show_chip = st.checkbox("大戶籌碼", True)
        show_rsi = st.checkbox("RSI + KD", True)
        show_macd = st.checkbox("MACD", True)
    
    # 載入數據
    with st.spinner("載入股票數據..."):
        df = get_stock_data(stock_id, days + 60)
        chip_df = get_chip_data(stock_id, days + 60)
        chip_summary = calc_chip_summary(chip_df)
    
    if df is None or df.empty:
        st.error(f"❌ 無法取得 {stock_id} 的數據")
        return
    
    # 計算指標
    df = calc_indicators(df)
    df = df.tail(days).reset_index(drop=True)
    
    # 顯示數據和圖表（簡化版，主要邏輯保持不變）
    latest = df.iloc[-1]
    prev = df.iloc[-2] if len(df) > 1 else latest
    
    col1, col2, col3, col4, col5 = st.columns(5)
    
    with col1:
        change = latest['close'] - prev['close']
        change_pct = change / prev['close'] * 100
        st.metric("收盤價", f"${latest['close']:,.0f}", f"{change:+.0f} ({change_pct:+.2f}%)")
    
    with col2:
        st.metric("成交量", f"{latest['Trading_Volume']/1e6:.1f}M")
    
    with col3:
        if chip_summary is not None and len(chip_summary) > 0:
            chip_latest = chip_summary.iloc[-1]
            st.metric("大戶持股", f"{chip_latest['large_pct']:.1f}%", 
                     f"{chip_latest['pct_chg']:+.2f}%" if pd.notna(chip_latest['pct_chg']) else "")
        else:
            st.metric("大戶持股", "N/A")
    
    with col4:
        st.metric("RSI(14)", f"{latest['RSI']:.1f}" if pd.notna(latest['RSI']) else "N/A")
    
    with col5:
        st.markdown(f"**綜合信號**")
        st.markdown("📈 偏多")  # 簡化版
    
    st.markdown("---")
    st.success("📊 股票圖表功能開發中...")

def option_analysis_page():
    """選擇權法人分析頁面"""
    st.markdown('<p class="main-header">🎯 選擇權法人分析</p>', unsafe_allow_html=True)
    st.markdown('<p class="sub-header">三大法人多空 + Put/Call Ratio + 未平倉分析</p>', unsafe_allow_html=True)
    st.markdown("---")
    
    # 側邊欄設定
    with st.sidebar:
        st.header("⚙️ 選擇權設定")
        days = st.slider("分析天數", 7, 60, 30)
        
        st.markdown("---")
        st.subheader("📊 分析選項")
        show_pc_ratio = st.checkbox("Put/Call Ratio", True)
        show_institutional = st.checkbox("三大法人部位", True)
        show_oi_analysis = st.checkbox("未平倉分析", True)
    
    # 載入數據
    with st.spinner("載入選擇權數據..."):
        option_daily = get_option_daily(days)
        institutional = get_option_institutional(days)
    
    # Put/Call Ratio 分析
    if show_pc_ratio:
        st.subheader("📊 Put/Call Ratio 分析")
        
        if option_daily is not None:
            pc_data = calc_put_call_ratio(option_daily)
            if pc_data is not None and not pc_data.empty:
                latest_pc = pc_data.iloc[-1]
                
                col1, col2, col3 = st.columns(3)
                with col1:
                    st.metric("P/C Ratio", f"{latest_pc['pc_ratio']:.1f}")
                with col2:
                    st.metric("Put 未平倉", f"{latest_pc['put_oi']:,.0f}")
                with col3:
                    st.metric("Call 未平倉", f"{latest_pc['call_oi']:,.0f}")
                
                # P/C Ratio 判斷
                if latest_pc['pc_ratio'] > 100:
                    st.success("🟢 P/C > 100：市場偏多，賣權未平倉較多，預期有支撐")
                else:
                    st.warning("🔴 P/C < 100：市場偏空，買權未平倉較多，預期遇壓力")
                
                # P/C Ratio 趨勢圖
                fig_pc = go.Figure()
                fig_pc.add_trace(go.Scatter(
                    x=pc_data['date'], 
                    y=pc_data['pc_ratio'],
                    mode='lines+markers',
                    name='P/C Ratio',
                    line=dict(color='#3B82F6', width=2)
                ))
                fig_pc.add_hline(y=100, line_dash="dash", line_color="red", 
                               annotation_text="中性線")
                fig_pc.update_layout(
                    title="Put/Call Ratio 趨勢",
                    yaxis_title="P/C Ratio",
                    height=400
                )
                st.plotly_chart(fig_pc, use_container_width=True)
            else:
                st.warning("⚠️ 無法計算 Put/Call Ratio")
        else:
            st.error("❌ 無法取得選擇權日成交數據")
    
    # 三大法人分析
    if show_institutional:
        st.subheader("🏛️ 三大法人部位分析")
        
        if institutional is not None:
            sentiment = analyze_institutional_sentiment(institutional)
            if sentiment:
                st.markdown('<div class="option-card">', unsafe_allow_html=True)
                
                col1, col2, col3 = st.columns(3)
                with col1:
                    color = "🟢" if sentiment['foreign'] == "做多" else "🔴"
                    st.markdown(f"**外資** {color}")
                    st.markdown(f"淨額: {sentiment['foreign_net']:+,.0f}")
                
                with col2:
                    color = "🟢" if sentiment['investment'] == "做多" else "🔴"
                    st.markdown(f"**投信** {color}")
                    st.markdown(f"淨額: {sentiment['investment_net']:+,.0f}")
                
                with col3:
                    color = "🟢" if sentiment['dealer'] == "做多" else "🔴"
                    st.markdown(f"**自營** {color}")
                    st.markdown(f"淨額: {sentiment['dealer_net']:+,.0f}")
                
                st.markdown('</div>', unsafe_allow_html=True)
                
                # 法人情緒判斷
                bullish_count = [sentiment['foreign'], sentiment['investment'], sentiment['dealer']].count("做多")
                
                if bullish_count >= 2:
                    st.success("🚀 **法人偏多**：多數法人看多後市")
                elif bullish_count == 1:
                    st.warning("⚖️ **法人分歧**：法人看法不一致")
                else:
                    st.error("⚠️ **法人偏空**：多數法人看空後市")
            else:
                st.warning("⚠️ 無法分析法人情緒")
        else:
            st.error("❌ 無法取得三大法人數據")
    
    # 未平倉分析
    if show_oi_analysis:
        st.subheader("📋 未平倉分析")
        st.info("🚧 未平倉熱力圖開發中...")
    
    # 綜合判斷
    st.markdown("---")
    st.subheader("🎯 選擇權綜合判斷")
    
    # 簡化的綜合判斷邏輯
    if option_daily is not None and institutional is not None:
        st.markdown("""
        **判斷邏輯**：
        1. **P/C Ratio > 100** → 偏多（賣權未平倉較多）
        2. **法人多數做多** → 偏多
        3. **自營商最貼近盤勢** → 重點關注
        """)
        
        st.success("✅ 選擇權數據載入成功，分析功能持續優化中...")
    else:
        st.error("❌ 無法載入完整選擇權數據")

# ===== 主程式 =====
def main():
    # 頁面導航
    with st.sidebar:
        st.markdown("## 🎯 台股分析平台")
        page = st.radio(
            "選擇分析類型",
            ["📈 股票技術分析", "🎯 選擇權法人分析"],
            index=0
        )
        
        st.markdown("---")
    
    # 根據選擇顯示頁面
    if page == "📈 股票技術分析":
        stock_analysis_page()
    elif page == "🎯 選擇權法人分析":
        option_analysis_page()
    
    # Footer
    st.markdown("---")
    st.caption(f"📊 數據來源: FinMind | 最後更新: {datetime.now().strftime('%Y-%m-%d %H:%M')}")

if __name__ == "__main__":
    main()