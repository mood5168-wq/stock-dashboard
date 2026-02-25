#!/usr/bin/env python3
"""
📊 台股技術分析 Dashboard
功能：K線 + 技術指標 + 大戶籌碼 + 千元股排行
UI/UX 優化版
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
    page_title="台股技術分析",
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
    /* 移除強制白色背景，改用半透明深色背景適應 Dark Mode */
    .stMetric > div { 
        background-color: rgba(255, 255, 255, 0.05); 
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px; 
        padding: 10px; 
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


# ===== 數據函數 =====
@st.cache_data(ttl=300)  # 快取 5 分鐘
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


@st.cache_data(ttl=600)  # 快取 10 分鐘
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


# ===== 技術指標 =====
def calc_indicators(df):
    """計算所有技術指標"""
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


def get_signal(df, chip_summary=None):
    """綜合信號判斷"""
    if df is None or len(df) < 60:
        return "數據不足", 0, []
    
    latest = df.iloc[-1]
    scores = []
    
    # 四均線
    try:
        if latest['close'] > latest['MA5'] > latest['MA10'] > latest['MA20'] > latest['MA60']:
            scores.append(("均線", 2, "四均多頭"))
        elif latest['close'] < latest['MA60']:
            scores.append(("均線", -2, "跌破MA60"))
        elif latest['close'] < latest['MA20']:
            scores.append(("均線", -1, "跌破MA20"))
        else:
            scores.append(("均線", 0, "盤整"))
    except:
        scores.append(("均線", 0, "計算中"))
    
    # RSI
    try:
        if latest['RSI'] > 70:
            scores.append(("RSI", -1, f"超買({latest['RSI']:.0f})"))
        elif latest['RSI'] < 30:
            scores.append(("RSI", 1, f"超賣({latest['RSI']:.0f})"))
        elif latest['RSI'] > 50:
            scores.append(("RSI", 0.5, f"偏多({latest['RSI']:.0f})"))
        else:
            scores.append(("RSI", -0.5, f"偏空({latest['RSI']:.0f})"))
    except:
        pass
    
    # KD
    try:
        if latest['K'] > 80:
            scores.append(("KD", -0.5, "超買"))
        elif latest['K'] < 20:
            scores.append(("KD", 0.5, "超賣"))
        elif latest['K'] > latest['D']:
            scores.append(("KD", 0.5, "K>D"))
        else:
            scores.append(("KD", -0.5, "K<D"))
    except:
        pass
    
    # MACD
    try:
        if latest['DIF'] > latest['DEM']:
            scores.append(("MACD", 1, "多頭"))
        else:
            scores.append(("MACD", -1, "空頭"))
    except:
        pass
    
    # 籌碼
    if chip_summary is not None and len(chip_summary) >= 2:
        chg = chip_summary.iloc[-1]['pct_chg']
        if chg > 0.3:
            scores.append(("籌碼", 1, "大戶吸籌"))
        elif chg < -0.3:
            scores.append(("籌碼", -1, "大戶出貨"))
        else:
            scores.append(("籌碼", 0, "持平"))
    
    total = sum(s[1] for s in scores)
    
    if total >= 2.5:
        signal = "🟢 強力買進"
    elif total >= 1:
        signal = "📈 偏多"
    elif total <= -2.5:
        signal = "🔴 建議賣出"
    elif total <= -1:
        signal = "📉 偏空"
    else:
        signal = "➡️ 觀望"
    
    return signal, total, scores


# ===== 圖表 =====
def create_chart(df, chip_summary, stock_name, show_ma=True, show_volume=True, 
                 show_chip=True, show_rsi=True, show_macd=True):
    """建立互動式圖表"""
    
    # 計算需要幾個子圖
    rows = 1  # K線必有
    if show_volume: rows += 1
    if show_chip and chip_summary is not None: rows += 1
    if show_rsi: rows += 1
    if show_macd: rows += 1
    
    row_heights = [0.4]  # K線
    if show_volume: row_heights.append(0.15)
    if show_chip and chip_summary is not None: row_heights.append(0.15)
    if show_rsi: row_heights.append(0.15)
    if show_macd: row_heights.append(0.15)
    
    fig = make_subplots(
        rows=rows, cols=1,
        shared_xaxes=True,
        vertical_spacing=0.03,
        row_heights=row_heights
    )
    
    current_row = 1
    
    # K線
    fig.add_trace(go.Candlestick(
        x=df['date'],
        open=df['open'],
        high=df['max'],
        low=df['min'],
        close=df['close'],
        name='K線',
        increasing_line_color='#EF4444',
        decreasing_line_color='#10B981'
    ), row=current_row, col=1)
    
    # 均線
    if show_ma:
        colors = {'MA5': '#FF6B6B', 'MA10': '#FFA500', 'MA20': '#4ECDC4', 'MA60': '#9B59B6'}
        for ma, color in colors.items():
            if ma in df.columns:
                fig.add_trace(go.Scatter(
                    x=df['date'], y=df[ma],
                    mode='lines', name=ma,
                    line=dict(color=color, width=1.5)
                ), row=current_row, col=1)
    
    current_row += 1
    
    # 成交量
    if show_volume:
        colors = ['#EF4444' if df.iloc[i]['close'] >= df.iloc[i]['open'] else '#10B981' 
                  for i in range(len(df))]
        fig.add_trace(go.Bar(
            x=df['date'],
            y=df['Trading_Volume'] / 1e6,
            name='成交量(M)',
            marker_color=colors,
            opacity=0.7
        ), row=current_row, col=1)
        current_row += 1
    
    # 籌碼
    if show_chip and chip_summary is not None:
        merged = pd.merge(df[['date']], chip_summary, on='date', how='left').ffill()
        fig.add_trace(go.Bar(
            x=merged['date'],
            y=merged['large_pct'],
            name='大戶持股%',
            marker_color='#3B82F6',
            opacity=0.6
        ), row=current_row, col=1)
        current_row += 1
    
    # RSI
    if show_rsi:
        fig.add_trace(go.Scatter(
            x=df['date'], y=df['RSI'],
            mode='lines', name='RSI(14)',
            line=dict(color='#E74C3C', width=1.5)
        ), row=current_row, col=1)
        fig.add_trace(go.Scatter(
            x=df['date'], y=df['K'],
            mode='lines', name='K(9)',
            line=dict(color='#3498DB', width=1)
        ), row=current_row, col=1)
        fig.add_trace(go.Scatter(
            x=df['date'], y=df['D'],
            mode='lines', name='D(9)',
            line=dict(color='#F39C12', width=1)
        ), row=current_row, col=1)
        fig.add_hline(y=80, line_dash="dash", line_color="red", opacity=0.5, row=current_row, col=1)
        fig.add_hline(y=20, line_dash="dash", line_color="green", opacity=0.5, row=current_row, col=1)
        current_row += 1
    
    # MACD
    if show_macd:
        fig.add_trace(go.Scatter(
            x=df['date'], y=df['DIF'],
            mode='lines', name='DIF',
            line=dict(color='#3498DB', width=1.5)
        ), row=current_row, col=1)
        fig.add_trace(go.Scatter(
            x=df['date'], y=df['DEM'],
            mode='lines', name='DEM',
            line=dict(color='#E74C3C', width=1.5)
        ), row=current_row, col=1)
        colors_macd = ['#10B981' if v >= 0 else '#EF4444' for v in df['OSC']]
        fig.add_trace(go.Bar(
            x=df['date'], y=df['OSC'],
            name='MACD柱',
            marker_color=colors_macd,
            opacity=0.6
        ), row=current_row, col=1)
        fig.add_hline(y=0, line_color="gray", opacity=0.5, row=current_row, col=1)
    
    # 樣式
    fig.update_layout(
        title=f'{stock_name} 技術分析',
        height=150 * rows + 200,
        showlegend=True,
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        xaxis_rangeslider_visible=False,
        hovermode='x unified'
    )
    
    fig.update_xaxes(showgrid=True, gridwidth=1, gridcolor='#E5E7EB')
    fig.update_yaxes(showgrid=True, gridwidth=1, gridcolor='#E5E7EB')
    
    return fig


# ===== 主程式 =====
def main():
    # 標題
    st.markdown('<p class="main-header">📈 台股技術分析 Dashboard</p>', unsafe_allow_html=True)
    st.markdown('<p class="sub-header">K線 + 技術指標 + 大戶籌碼 | 獨門配方</p>', unsafe_allow_html=True)
    st.markdown("---")
    
    # 側邊欄
    with st.sidebar:
        st.header("⚙️ 設定")
        
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
        
        # 時間範圍
        days = st.slider("顯示天數", 30, 180, 60)
        
        st.markdown("---")
        st.subheader("📊 顯示選項")
        
        show_ma = st.checkbox("均線 (MA)", True)
        show_volume = st.checkbox("成交量", True)
        show_chip = st.checkbox("大戶籌碼", True)
        show_rsi = st.checkbox("RSI + KD", True)
        show_macd = st.checkbox("MACD", True)
        
        st.markdown("---")
        st.markdown("💡 **提示**：點擊圖例可隱藏/顯示")
    
    # 載入數據
    with st.spinner("載入數據中..."):
        df = get_stock_data(stock_id, days + 60)
        chip_df = get_chip_data(stock_id, days + 60)
        chip_summary = calc_chip_summary(chip_df)
    
    if df is None or df.empty:
        st.error(f"❌ 無法取得 {stock_id} 的數據")
        return
    
    # 計算指標
    df = calc_indicators(df)
    df = df.tail(days).reset_index(drop=True)
    
    # 取得信號
    signal, score, score_details = get_signal(df, chip_summary)
    
    # 顯示關鍵數據
    latest = df.iloc[-1]
    prev = df.iloc[-2] if len(df) > 1 else latest
    
    col1, col2, col3, col4, col5 = st.columns(5)
    
    with col1:
        change = latest['close'] - prev['close']
        change_pct = change / prev['close'] * 100
        st.metric(
            "收盤價",
            f"${latest['close']:,.0f}",
            f"{change:+.0f} ({change_pct:+.2f}%)"
        )
    
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
        color = "green" if score > 0 else "red" if score < 0 else "gray"
        st.markdown(f"**綜合信號**")
        st.markdown(f"<h3 style='color:{color}'>{signal}</h3>", unsafe_allow_html=True)
        st.caption(f"分數: {score:+.1f}")
    
    # 圖表
    st.markdown("---")
    fig = create_chart(df, chip_summary, stock_name, show_ma, show_volume, 
                       show_chip, show_rsi, show_macd)
    st.plotly_chart(fig, use_container_width=True)
    
    # 詳細分析
    with st.expander("📋 詳細分析", expanded=False):
        cols = st.columns(len(score_details) if score_details else 1)
        for i, (name, s, desc) in enumerate(score_details):
            with cols[i]:
                emoji = "🟢" if s > 0 else "🔴" if s < 0 else "⚪"
                st.markdown(f"**{name}**")
                st.markdown(f"{emoji} {desc}")
                st.caption(f"分數: {s:+.1f}")
    
    # 千元股排行
    st.markdown("---")
    st.subheader("🏆 千元股籌碼排行")
    
    if st.button("🔄 掃描籌碼", type="primary"):
        with st.spinner("掃描中... (約需 30 秒)"):
            results = []
            progress = st.progress(0)
            
            for i, (sid, sname) in enumerate(THOUSAND_CLUB.items()):
                try:
                    chip = get_chip_data(sid, 30)
                    chip_sum = calc_chip_summary(chip)
                    if chip_sum is not None and len(chip_sum) >= 2:
                        latest_chip = chip_sum.iloc[-1]
                        results.append({
                            '股票': f"{sname}",
                            '代號': sid,
                            '大戶持股%': f"{latest_chip['large_pct']:.2f}",
                            '週變化%': latest_chip['pct_chg'],
                            '訊號': "🟢 吸籌" if latest_chip['pct_chg'] > 0.3 else "🔴 出貨" if latest_chip['pct_chg'] < -0.3 else "⚪ 持平"
                        })
                except:
                    pass
                progress.progress((i + 1) / len(THOUSAND_CLUB))
            
            if results:
                results_df = pd.DataFrame(results)
                results_df = results_df.sort_values('週變化%', ascending=False)
                results_df['週變化%'] = results_df['週變化%'].apply(lambda x: f"{x:+.2f}" if pd.notna(x) else "N/A")
                st.dataframe(results_df, use_container_width=True, hide_index=True)
            else:
                st.warning("無法取得籌碼數據")
    
    # Footer
    st.markdown("---")
    st.caption(f"📊 數據來源: FinMind | 最後更新: {datetime.now().strftime('%Y-%m-%d %H:%M')}")


if __name__ == "__main__":
    main()
