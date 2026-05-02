# A股海面波浪 - 观澜

基于真实 A 股行情数据的板块资金流向可视化工具。将市场主线的资金演进用潮汐波浪的方式展示，一眼看出谁在吸水、谁在退潮。

![screenshot](screenshot.png)

## 技术栈

- **前端**: React 18 + TypeScript + Vite + Tailwind CSS + ECharts
- **数据源**: iFinD / akshare（A 股实时行情）
- **定时更新**: GitHub Actions + Python
- **部署**: Vercel / 自有服务器

---

## 快速开始

### 1. 克隆仓库

```bash
git clone <your-repo-url>
cd guanlan-stock-waves
```

### 2. 安装依赖

```bash
npm install
```

### 3. 开发预览

```bash
npm run dev
```

### 4. 构建生产包

```bash
npm run build
```

构建产物在 `dist/` 目录。

---

## 数据源配置

本项目支持**两种数据源模式**，可自由切换：

### 模式 A: 静态 JSON（默认）

前端直接从 `public/data/sector_fund_data.json` 加载数据。适合：
- 快速体验，无需后端
- 通过 GitHub Actions 定时更新 JSON

### 模式 B: 后端 API

前端从自建后端 API 获取实时数据。适合：
- 需要实时刷新
- 有自己的服务器/VPS

配置方式：

```bash
# 创建环境变量文件
cp .env.example .env.local

# 编辑 .env.local，填入后端地址
VITE_API_URL=http://localhost:3001/api/sectors
```

---

## 数据自动更新（三种方案）

### 方案一: GitHub Actions + akshare（推荐，零成本）

已配置在 `.github/workflows/update-data.yml`，每天 A 股收盘后自动运行：

1. **Fork 本仓库** 到你的 GitHub 账号
2. **无需任何额外配置**，workflow 已内置
3. 每天 16:00 (UTC+8) 自动：
   - 通过 akshare 获取当日行情
   - 计算板块资金流向
   - 更新 `public/data/sector_fund_data.json`
   - 自动 commit 并 push
4. 如果你用 **Vercel** 部署，Vercel 检测到代码变更会自动重新构建

**手动触发**: 进入 GitHub 仓库 → Actions → Update Sector Data → Run workflow

### 方案二: 本地定时脚本 + iFinD（数据最准确）

适用于有 iFinD 账号的本地环境：

```bash
# 1. 安装 Python 依赖
pip install akshare

# 2. 检查是否需要更新
python scripts/update_data.py --check

# 3. 执行更新
python scripts/update_data.py

# 4. 提交并推送（触发 Vercel 自动部署）
git add public/data/sector_fund_data.json
git commit -m "update: $(date +%Y-%m-%d) sector data"
git push
```

添加到 crontab（macOS/Linux 每天自动运行）：

```bash
crontab -e
# 添加以下行（每天 16:30 运行）
30 16 * * 1-5 cd /path/to/guanlan && python scripts/update_data.py && git add public/data/sector_fund_data.json && git commit -m "auto-update sector data" && git push
```

### 方案三: Node.js 后端服务（最灵活）

适用于有自己的服务器/VPS：

```bash
cd server
npm install
npm run dev
```

后端服务：
- 端口: `3001`
- 接口: `GET /api/sectors` 返回所有板块数据
- 定时任务: 每个交易日 16:00 自动运行数据更新脚本
- CORS: 默认允许所有域名，生产环境请设置 `CORS_ORIGIN`

前端配置：

```bash
# 根目录创建 .env.local
echo "VITE_API_URL=http://your-server:3001/api/sectors" > .env.local
npm run build
```

---

## 部署到 Vercel

### 1. 推送代码到 GitHub

```bash
git init
git add .
git commit -m "init"
git branch -M main
git remote add origin https://github.com/YOUR_NAME/guanlan-stock-waves.git
git push -u origin main
```

### 2. Vercel 导入

1. 访问 [vercel.com](https://vercel.com)，用 GitHub 登录
2. New Project → 导入 `guanlan-stock-waves`
3. Framework Preset: 选 **Vite**
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Deploy

### 3. 自动更新

如果你启用了**方案一**（GitHub Actions），Vercel 会自动在每次数据更新后重新构建部署，全程自动化。

### 4. 自定义域名（可选）

Vercel 项目设置 → Domains → 添加你自己的域名。

---

## 板块配置

板块列表和代表股在 `src/types/sector.ts` 中配置：

```typescript
export const SECTOR_CONFIGS = [
  { name: 'CPO/光模块', color: '#00F0FF', glowColor: 'rgba(0, 240, 255, 0.4)' },
  { name: 'AI算力', color: '#FF9500', glowColor: 'rgba(255, 149, 0, 0.4)' },
  // ...
];
```

代表股票映射在 `scripts/update_data.py` 中的 `SECTOR_CONFIG` 字典中维护。

**修改板块列表**：
1. 编辑 `src/types/sector.ts` 修改名称和颜色
2. 编辑 `scripts/update_data.py` 修改代表股
3. 重新构建部署

---

## 项目结构

```
guanlan-stock-waves/
├── .github/workflows/          # GitHub Actions 定时任务
│   └── update-data.yml
├── public/
│   └── data/
│       └── sector_fund_data.json   # 板块资金数据（会被脚本更新）
├── scripts/
│   └── update_data.py        # Python 数据更新脚本
├── server/                     # Node.js 后端服务（可选）
│   ├── index.ts
│   ├── package.json
│   └── tsconfig.json
├── src/
│   ├── hooks/
│   │   └── useSectorData.ts  # 数据加载 Hook
│   ├── sections/
│   │   ├── OceanWaveChart.tsx    # 核心图表组件
│   │   ├── TagSelector.tsx       # 顶部标签栏
│   │   └── TimeToggle.tsx        # 日/周/月切换
│   ├── types/
│   │   └── sector.ts         # 板块类型定义
│   ├── App.tsx
│   ├── App.css
│   └── index.css
├── .env.example
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 快捷键

| 按键 | 功能 |
|---|---|
| `←` `→` | 左右移动日期 |
| `↑` `↓` | 上下切换选中曲线 |
| 鼠标移动 | 十字线自动吸附最近曲线 |
| 点击标签 | 显示/隐藏对应曲线 |

---

## 数据源说明

- **当前数据**: 基于 iFinD 板块代表股历史行情，通过日平均收益率映射为「主力资金净流入累计值」
- **更新频率**: 每个交易日收盘后自动更新
- **板块数量**: 9 个市场热门概念板块（按最新资金累计值排序）
- **历史范围**: 2026-03-01 至今（持续追加）

---

## License

MIT
