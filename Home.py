#!/usr/bin/env python3
"""
📊 台股分析平台 - 首頁
"""
import streamlit as st

st.set_page_config(
    page_title="台股分析平台",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

st.markdown("""
# 📊 台股分析平台

歡迎使用！請從左側選單選擇功能：

---

### 📈 技術分析
K線圖 + 均線 + RSI/KD/MACD + 大戶籌碼

### 📊 選擇權分析  
法人選擇權佈局 + Put/Call Ratio

### 🚨 即時事件流
價格異動、爆量、技術突破即時偵測

### 🔗 產業鏈追蹤
PCB/AI/記憶體/蘋果供應鏈連動分析

---

💡 **提示**：點擊左側 `>` 展開選單
""")

st.markdown("---")
st.caption("📊 數據來源: FinMind | 台股分析平台 v4.0")
