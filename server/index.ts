import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS: 允许前端域名访问（生产环境请替换为实际域名）
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
}));

app.use(express.json());

const DATA_PATH = resolve(process.cwd(), '../public/data/sector_fund_data.json');

function loadData() {
  if (!existsSync(DATA_PATH)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(DATA_PATH, 'utf-8'));
  } catch (e) {
    console.error('Failed to load data:', e);
    return null;
  }
}

// GET /api/sectors - 返回所有板块数据
app.get('/api/sectors', (req, res) => {
  const data = loadData();
  if (!data) {
    return res.status(500).json({ error: 'Data not available' });
  }
  res.json(data);
});

// GET /api/sectors/:name - 返回指定板块数据
app.get('/api/sectors/:name', (req, res) => {
  const data = loadData();
  if (!data) {
    return res.status(500).json({ error: 'Data not available' });
  }
  const sector = data[req.params.name];
  if (!sector) {
    return res.status(404).json({ error: 'Sector not found' });
  }
  res.json(sector);
});

// GET /api/health - 健康检查
app.get('/api/health', (req, res) => {
  const data = loadData();
  const firstSector = data ? Object.keys(data)[0] : null;
  const latestDate = firstSector && data ? data[firstSector].dates.slice(-1)[0] : null;
  res.json({
    status: 'ok',
    dataAvailable: !!data,
    latestDate,
  });
});

// 定时任务：每个交易日 16:00 运行数据更新脚本
// cron 表达式: 秒 分 时 日 月 周 (node-cron 格式)
cron.schedule('0 0 16 * * 1-5', () => {
  console.log(`[${new Date().toISOString()}] Running scheduled data update...`);
  try {
    execSync('python3 scripts/update_data.py', {
      cwd: resolve(process.cwd(), '..'),
      stdio: 'inherit',
    });
    console.log('Data update completed.');
  } catch (e) {
    console.error('Data update failed:', e);
  }
});

app.listen(PORT, () => {
  console.log(`🌊 Guanlan API Server running on http://localhost:${PORT}`);
  console.log(`Endpoints:`);
  console.log(`  GET /api/sectors       - All sectors data`);
  console.log(`  GET /api/sectors/:name - Single sector data`);
  console.log(`  GET /api/health        - Health check`);
});
