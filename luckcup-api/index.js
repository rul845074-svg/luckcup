'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');

const authRoutes = require('./routes/auth');
const incomeRoutes = require('./routes/income');
const expensesRoutes = require('./routes/expenses');
const analysisRoutes = require('./routes/analysis');
const settingsRoutes = require('./routes/settings');

const app = express();

// ===== 中间件 =====
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json());

// ===== 路由 =====
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
});

app.use('/auth', authRoutes);
app.use('/income', incomeRoutes);
app.use('/expenses', expensesRoutes);
app.use('/analysis', analysisRoutes);
app.use('/settings', settingsRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: `路径 ${req.path} 不存在` });
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('[unhandled error]', err);
  res.status(500).json({ error: '服务器内部错误' });
});

// ===== 腾讯云 SCF 导出 =====
// 腾讯云函数调用格式：index.main_handler
// serverless-http 会自动适配腾讯云 API 网关触发器的事件格式
const handler = serverless(app);
exports.main_handler = handler;

// ===== 本地开发：直接 node index.js 启动 =====
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`\nLuckCup API 本地运行中：http://localhost:${PORT}`);
    console.log('健康检查：http://localhost:' + PORT + '/health\n');
  });
}
