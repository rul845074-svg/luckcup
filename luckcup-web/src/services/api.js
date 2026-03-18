/**
 * API 服务层
 * 当前阶段：后端未接入时使用 mock 数据
 * 联调阶段：将 USE_MOCK 改为 false，填写 VITE_API_URL 后自动切换为真实请求
 */

const USE_MOCK = false;
const BASE_URL = import.meta.env.VITE_API_URL || '/api';

// ===== 请求工具 =====

async function request(method, path, body) {
  const token = localStorage.getItem('lc_token');
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

const get = (path) => request('GET', path);
const post = (path, body) => request('POST', path, body);
const put = (path, body) => request('PUT', path, body);
const del = (path) => request('DELETE', path);

// ===== Mock 数据 =====

const MOCK_DAILY = {
  '美团团购': 1200, '美团外卖': 2800, '淘宝闪购': 650,
  '抖音团购': 1500, '小程序': 2200, '收银机': 1800,
};

const MOCK_EXPENSES = [
  { id: '1', category: '普货', amount: 8500, note: '2月第一批普货', date: '2026-02-15', is_auto: false },
  { id: '2', category: '水电', amount: 3200, note: '2月水电费', date: '2026-02-18', is_auto: false },
  { id: '3', category: '周边货物', amount: 450, note: '小零食补货', date: '2026-02-20', is_auto: false },
  { id: '4', category: '突发支出', amount: 280, note: '换水龙头', date: '2026-02-22', is_auto: false },
];

// ===== Auth =====

export const authApi = {
  register: (phone, password, shopName) =>
    USE_MOCK
      ? Promise.resolve({ token: 'mock_token', shopId: 'mock_shop', shopName: shopName || 'LuckCup 我的店铺' })
      : post('/auth/register', { phone, password, shopName }),

  login: (phone, password) =>
    USE_MOCK
      ? Promise.resolve({ token: 'mock_token', shopId: 'mock_shop', shopName: 'LuckCup 我的店铺' })
      : post('/auth/login', { phone, password }),
};

// ===== 收入 =====

export const incomeApi = {
  getDaily: (date) =>
    USE_MOCK
      ? Promise.resolve({
          date,
          items: Object.entries(MOCK_DAILY).map(([platform, amount]) => ({ platform, amount })),
          monthlyTotal: 82000,
        })
      : get(`/income/daily?date=${date}`),

  saveDaily: (date, items) =>
    USE_MOCK
      ? Promise.resolve({ success: true })
      : post('/income/daily', { date, items }),

  getMonthly: (month) =>
    USE_MOCK
      ? Promise.resolve({
          month,
          totalIncome: 82000,
          byPlatform: [
            { platform: '美团外卖', amount: 28000, percentage: 34.1 },
            { platform: '小程序', amount: 20000, percentage: 24.4 },
            { platform: '收银机', amount: 15000, percentage: 18.3 },
            { platform: '美团团购', amount: 10000, percentage: 12.2 },
            { platform: '抖音团购', amount: 6000, percentage: 7.3 },
            { platform: '淘宝闪购', amount: 3000, percentage: 3.7 },
          ],
        })
      : get(`/income/monthly?month=${month}`),
};

// ===== 支出 =====

export const expensesApi = {
  getList: (month) =>
    USE_MOCK
      ? Promise.resolve({ month, expenses: MOCK_EXPENSES })
      : get(`/expenses?month=${month}`),

  add: (data) =>
    USE_MOCK
      ? Promise.resolve({ success: true, id: Date.now().toString() })
      : post('/expenses', data),

  update: (id, data) =>
    USE_MOCK
      ? Promise.resolve({ success: true })
      : put(`/expenses/${id}`, data),

  remove: (id) =>
    USE_MOCK
      ? Promise.resolve({ success: true })
      : del(`/expenses/${id}`),
};

// ===== 分析 =====

export const analysisApi = {
  getOverview: (month) =>
    USE_MOCK
      ? Promise.resolve({
          month,
          totalIncome: 82000,
          totalExpense: 65000,
          balance: 17000,
          incomeByPlatform: [
            { platform: '美团外卖', amount: 28000, percentage: 34.1 },
            { platform: '小程序', amount: 20000, percentage: 24.4 },
            { platform: '收银机', amount: 15000, percentage: 18.3 },
            { platform: '美团团购', amount: 10000, percentage: 12.2 },
            { platform: '抖音团购', amount: 6000, percentage: 7.3 },
            { platform: '淘宝闪购', amount: 3000, percentage: 3.7 },
          ],
          expenseByCategory: [
            { category: '普货', amount: 35000, percentage: 53.8 },
            { category: '工资', amount: 15000, percentage: 23.1 },
            { category: '房租', amount: 8000, percentage: 12.3 },
            { category: '水电', amount: 3500, percentage: 5.4 },
            { category: '周边货物', amount: 2500, percentage: 3.8 },
            { category: '突发支出', amount: 1000, percentage: 1.5 },
          ],
        })
      : get(`/analysis/monthly-overview?month=${month}`),

  getBreakeven: (month) =>
    USE_MOCK
      ? Promise.resolve({
          month,
          fixedRent: 8000,
          salary: 15000,
          utility: 3500,
          purchaseCost: 37500,
          breakevenTotal: 64000,
          dailyBreakeven: 2286,
          currentIncome: 82000,
          surplus: 18000,
        })
      : get(`/analysis/breakeven?month=${month}`),

  getProfit: (month) =>
    USE_MOCK
      ? Promise.resolve({ month, totalIncome: 82000, totalExpense: 65000, balance: 17000, profitRate: 20.7 })
      : get(`/analysis/profit?month=${month}`),
};

// ===== 设置 =====

export const settingsApi = {
  get: () =>
    USE_MOCK
      ? Promise.resolve({
          shopId: 'mock_shop',
          shopName: 'LuckCup 万达店',
          fixedRent: 8000,
          platforms: ['美团团购', '美团外卖', '淘宝闪购', '抖音团购', '小程序', '收银机'],
          expenseCategories: ['普货', '周边货物', '工资', '房租', '水电', '突发支出'],
        })
      : get('/settings'),

  update: (data) =>
    USE_MOCK
      ? Promise.resolve({ success: true })
      : put('/settings', data),
};
