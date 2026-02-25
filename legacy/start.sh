#!/bin/bash
# 📊 台股技術分析 Dashboard 啟動腳本

cd "$(dirname "$0")"

echo "🚀 啟動台股技術分析 Dashboard..."
echo ""

# 用 uv 執行，自動處理依賴
uv run --with streamlit --with plotly --with pandas --with requests \
    streamlit run app.py \
    --server.port 8501 \
    --server.headless true \
    --browser.gatherUsageStats false
