#!/usr/bin/env python3
"""
A股海面波浪 - 板块资金流向数据自动更新脚本
"""

import argparse
import json
import os
import sys
import warnings
from datetime import datetime, timedelta
from typing import Dict, List

warnings.filterwarnings("ignore")

# ============ 板块配置 ============
SECTOR_CONFIG = {
    'CPO/光模块': {
        'stocks': ['300308', '300502', '603083', '301205', '300394'],
        'base_offset': 35.0,
    },
    'AI算力': {
        'stocks': ['301366', '605289', '688227', '300252', '603496'],
        'base_offset': 10.0,
    },
    '机器人': {
        'stocks': ['002164', '003019', '300131', '603109', '300486'],
        'base_offset': 5.0,
    },
    '低空经济': {
        'stocks': ['002176', '688295', '000887', '301366', '002074'],
        'base_offset': 20.0,
    },
    '液冷服务器': {
        'stocks': ['603912', '300565', '002860', '600498', '301128'],
        'base_offset': 18.0,
    },
    '稀土永磁': {
        'stocks': ['603072', '600111', '301141', '600392', '300224'],
        'base_offset': -25.0,
    },
    '锂电/能源金属': {
        'stocks': ['000049', '002074', '002245', '002850', '300014'],
        'base_offset': 15.0,
    },
    '芯片半导体': {
        'stocks': ['002049', '688820', '688729', '300831', '688589'],
        'base_offset': 8.0,
    },
    '商业航天': {
        'stocks': ['002049', '301571', '002278', '688295', '688066'],
        'base_offset': 12.0,
    },
}

DATA_PATH = 'public/data/sector_fund_data.json'
SCALING = 180.0


def log(msg: str):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")
    sys.stdout.flush()


def load_data() -> dict:
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"数据文件不存在: {DATA_PATH}")
    with open(DATA_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_data(data: dict):
    os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)
    with open(DATA_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def get_latest_date(data: dict) -> str:
    first = list(data.keys())[0]
    dates = data[first]['dates']
    if not dates:
        raise ValueError("数据文件中没有日期")
    return dates[-1]


def get_trading_days(start: str, end: str) -> List[str]:
    """获取范围内的交易日（简化：周一到周五）"""
    days = []
    d = datetime.strptime(start, '%Y-%m-%d')
    stop = datetime.strptime(end, '%Y-%m-%d')
    while d <= stop:
        if d.weekday() < 5:
            days.append(d.strftime('%Y-%m-%d'))
        d += timedelta(days=1)
    return days


def fetch_stock_prices_akshare(stocks: List[str], start_date: str, end_date: str) -> Dict[str, Dict[str, float]]:
    """
    使用 akshare 获取股票日K线
    返回: {stock_code: {date_str: close_price}}
    """
    try:
        import akshare as ak
    except ImportError:
        log("❌ 错误: 未安装 akshare")
        return {}

    result: Dict[str, Dict[str, float]] = {}

    for code in stocks:
        try:
            df = ak.stock_zh_a_hist(
                symbol=code,
                period="daily",
                start_date=start_date.replace('-', ''),
                end_date=end_date.replace('-', ''),
                adjust="hfq"
            )
            if df is None or df.empty:
                log(f"  {code}: akshare 返回空数据")
                continue

            prices = {}
            for _, row in df.iterrows():
                raw_date = str(row['日期'])
                date_str = raw_date[:10].replace('/', '-').replace('.', '-')
                prices[date_str] = float(row['收盘'])

            result[code] = prices
            log(f"  {code}: ✅ {len(prices)} 天")
        except Exception as e:
            log(f"  {code}: ❌ {type(e).__name__}: {str(e)[:80]}")

    return result


def update_sector_data(data: dict, stock_prices: Dict[str, Dict[str, float]], missing_dates: List[str]):
    """使用获取到的股票价格，更新各板块的 fund flow"""
    updated_any = False

    for sector_name, cfg in SECTOR_CONFIG.items():
        stocks = cfg['stocks']

        for date in missing_dates:
            # 找前一个交易日
            prev_dt = datetime.strptime(date, '%Y-%m-%d') - timedelta(days=1)
            while prev_dt.weekday() >= 5:
                prev_dt -= timedelta(days=1)
            prev_date = prev_dt.strftime('%Y-%m-%d')

            returns = []
            for code in stocks:
                prices = stock_prices.get(code, {})
                if date in prices and prev_date in prices and prices[prev_date] > 0:
                    ret = (prices[date] - prices[prev_date]) / prices[prev_date]
                    returns.append(ret)

            if returns:
                fund_flow = (sum(returns) / len(returns)) * SCALING
                updated_any = True
            else:
                fund_flow = 0.0
                log(f"  {sector_name} {date}: ⚠️ 无股价数据，设为 0")

            # 追加数据
            data[sector_name]['dates'].append(date)
            data[sector_name]['daily'].append(round(fund_flow, 4))
            new_cum = data[sector_name]['cumulative'][-1] + fund_flow
            data[sector_name]['cumulative'].append(round(new_cum, 4))

            sign = '+' if fund_flow >= 0 else ''
            log(f"  {sector_name} {date}: {sign}{fund_flow:.2f}亿 (累计: {new_cum:.2f}亿)")

    return updated_any


def main():
    parser = argparse.ArgumentParser(description='A股海面波浪数据更新')
    parser.add_argument('--check', action='store_true', help='仅检查是否需要更新')
    parser.add_argument('--dry-run', action='store_true', help='试运行，不保存文件')
    args = parser.parse_args()

    log("=" * 50)
    log("A股海面波浪 - 数据自动更新")
    log("=" * 50)

    try:
        data = load_data()
    except Exception as e:
        log(f"❌ 数据文件读取失败: {e}")
        sys.exit(1)

    latest = get_latest_date(data)
    today = datetime.now().strftime('%Y-%m-%d')

    log(f"📅 历史最新日期: {latest}")
    log(f"📅 当前日期: {today}")

    if latest >= today:
        log("✅ 数据已是最新，无需更新")
        return

    missing = get_trading_days(latest, today)[1:]  # 排除 latest 本身
    if not missing:
        log("ℹ️ 无新增交易日（可能是周末或节假日）")
        return

    log(f"📊 需要补充 {len(missing)} 个交易日: {', '.join(missing)}")

    if args.check:
        log("--check 模式，不执行更新")
        return

    # 获取所有需要下载的股票
    all_stocks = list(set(code for cfg in SECTOR_CONFIG.values() for code in cfg['stocks']))
    fetch_start = (datetime.strptime(latest, '%Y-%m-%d') - timedelta(days=5)).strftime('%Y-%m-%d')
    fetch_end = today

    log(f"🔽 开始获取 {len(all_stocks)} 只股票行情 ({fetch_start} ~ {fetch_end})...")
    stock_prices = fetch_stock_prices_akshare(all_stocks, fetch_start, fetch_end)

    if not stock_prices:
        log("❌ 未能获取任何股票数据")
        sys.exit(1)

    success_count = len(stock_prices)
    fail_count = len(all_stocks) - success_count
    log(f"📈 成功 {success_count} 只，失败 {fail_count} 只")

    # 更新板块数据
    log("🔄 开始计算板块资金流向...")
    updated_any = update_sector_data(data, stock_prices, missing)

    if not updated_any:
        log("ℹ️ 没有任何有效数据更新")
        return

    # 保存
    if args.dry_run:
        log("--dry-run 模式，不保存文件")
    else:
        save_data(data)
        log("💾 数据已保存")
        log(f"🎉 更新完成！最新日期: {today}")


if __name__ == '__main__':
    main()
