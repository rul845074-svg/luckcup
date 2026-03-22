# LuckCup V1 开发实施计划

> 本文档是交给开发者（或 Claude Code）的"施工图纸"。按阶段顺序执行，每个任务都有明确的输入、步骤和验收标准。

---

## 项目概要

- **项目**：LuckCup 单店运营系统 V1
- **目标用户**：加盟商老板（电脑小白，仅用手机）
- **核心功能**：每日收入录入、随时支出记录、月度总览、盈亏分析（含动态盈亏平衡点）、基础设置
- **技术栈**：React + Tailwind CSS（前端）→ Node.js + Express（后端）→ PostgreSQL / Supabase（数据库）
- **部署**：Vercel（前端）+ Railway（后端）+ Supabase（数据库+认证）

---

## 阶段总览

| 阶段 | 内容 | 预计任务数 |
|------|------|-----------|
| 阶段 1 | Supabase 项目初始化 + 数据库建表 | 4 个任务 |
| 阶段 2 | 后端 API 开发 | 6 个任务 |
| 阶段 3 | 前端页面开发 | 7 个任务 |
| 阶段 4 | 前后端联调 | 3 个任务 |
| 阶段 5 | 部署上线 | 4 个任务 |

---

## 阶段 1：Supabase 项目初始化 + 数据库建表

### 任务 1.1：创建 Supabase 项目

**步骤**：
1. 前往 https://supabase.com 注册账号
2. 创建新项目，命名为 `luckcup`
3. 记录项目的 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY`（后续前后端都要用）

**验收**：Supabase 控制台能正常访问，能看到空数据库

---

### 任务 1.2：创建数据库表

**执行方式**：在 Supabase 控制台的 SQL Editor 中执行以下建表语句

```sql
-- 1. 店铺表
CREATE TABLE shops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 店铺设置表
CREATE TABLE shop_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL UNIQUE REFERENCES shops(id) ON DELETE CASCADE,
  fixed_rent DECIMAL(10,2) DEFAULT 0,
  platforms JSONB DEFAULT '["美团团购","美团外卖","淘宝闪购","抖音团购","小程序","收银机"]',
  expense_categories JSONB DEFAULT '["普货","周边货物","工资","房租","水电","突发支出"]',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 每日收入表
CREATE TABLE daily_income (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  platform VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(shop_id, date, platform)
);

-- 4. 支出表
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  category VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  note VARCHAR(200) NOT NULL,
  is_auto BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引（加速查询）
CREATE INDEX idx_daily_income_shop_date ON daily_income(shop_id, date);
CREATE INDEX idx_expenses_shop_date ON expenses(shop_id, date);
```

**验收**：在 Supabase 的 Table Editor 中能看到 4 张表，字段和类型正确

---

### 任务 1.3：配置行级安全策略（RLS）

**说明**：确保每个用户只能访问自己店铺的数据

```sql
-- 启用 RLS
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- shops：用户只能看自己的店铺
CREATE POLICY "用户只能访问自己的店铺" ON shops
  FOR ALL USING (owner_id = auth.uid());

-- shop_settings：通过 shop_id 关联到 owner_id
CREATE POLICY "用户只能访问自己店铺的设置" ON shop_settings
  FOR ALL USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));

-- daily_income：通过 shop_id 关联
CREATE POLICY "用户只能访问自己店铺的收入" ON daily_income
  FOR ALL USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));

-- expenses：通过 shop_id 关联
CREATE POLICY "用户只能访问自己店铺的支出" ON expenses
  FOR ALL USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));
```

**验收**：在 Supabase 的 Authentication > Policies 中能看到每张表都有对应的策略

---

### 任务 1.4：配置手机号登录

**步骤**：
1. 在 Supabase 控制台 → Authentication → Providers
2. 启用 Phone 登录
3. 配置短信服务商（推荐 Twilio 或国内的阿里云短信）
4. 设置短信模板

**备注**：开发阶段可以先用 Supabase 的测试模式（不真正发短信），上线前再配真实短信服务

**验收**：在 Authentication 设置中 Phone 显示为 Enabled

---

## 阶段 2：后端 API 开发

### 任务 2.1：初始化后端项目

**步骤**：
```bash
mkdir luckcup-api && cd luckcup-api
npm init -y
npm install express cors dotenv @supabase/supabase-js
```

**目录结构**：
```
luckcup-api/
├── server.js              # 入口文件
├── .env                   # 环境变量（SUPABASE_URL, SUPABASE_KEY）
├── middleware/
│   └── auth.js            # Token 验证中间件
├── routes/
│   ├── auth.js            # 认证相关路由
│   ├── income.js          # 收入相关路由
│   ├── expenses.js        # 支出相关路由
│   ├── analysis.js        # 分析相关路由
│   └── settings.js        # 设置相关路由
└── services/
    └── supabase.js        # Supabase 客户端初始化
```

**验收**：`node server.js` 能启动，访问 `http://localhost:3000/health` 返回 `{"status":"ok"}`

---

### 任务 2.2：实现认证中间件 + 认证接口

**auth 中间件逻辑**：
1. 从请求头 `Authorization: Bearer <token>` 中提取 Token
2. 用 Supabase 验证 Token，获取用户信息
3. 将 user 和 shop_id 挂载到 req 上，供后续路由使用

**认证接口**：
- `POST /auth/send-code`：发送手机验证码
- `POST /auth/verify-code`：验证码登录，返回 Token
- `POST /auth/logout`：退出登录

**首次登录自动初始化**：用户第一次登录时，自动创建 shops 和 shop_settings 记录

**验收**：用测试手机号能走通「发送验证码 → 登录 → 拿到 Token → 用 Token 访问受保护接口」的完整流程

---

### 任务 2.3：实现收入接口

**接口列表**：
- `GET /income/daily?date=2026-02-28`：查询某天的 6 个平台收入数据
- `POST /income/daily`：保存/更新某天的收入数据（6 个平台一次性提交）
- `GET /income/monthly?month=2026-02`：查询某月的收入汇总（按平台分组）

**POST /income/daily 请求体示例**：
```json
{
  "date": "2026-02-28",
  "items": [
    { "platform": "美团团购", "amount": 1200 },
    { "platform": "美团外卖", "amount": 2800 },
    { "platform": "淘宝闪购", "amount": 650 },
    { "platform": "抖音团购", "amount": 1500 },
    { "platform": "小程序", "amount": 2200 },
    { "platform": "收银机", "amount": 1800 }
  ]
}
```

**逻辑要点**：使用 UPSERT（有则更新，无则插入），基于 shop_id + date + platform 唯一约束

**验收**：能保存、查询、更新每日收入数据，月度汇总数据正确

---

### 任务 2.4：实现支出接口

**接口列表**：
- `GET /expenses?month=2026-02`：查询某月支出列表
- `POST /expenses`：新增一笔支出
- `PUT /expenses/:id`：修改某笔支出
- `DELETE /expenses/:id`：删除某笔支出

**POST /expenses 请求体示例**：
```json
{
  "date": "2026-02-28",
  "category": "普货",
  "amount": 8500,
  "note": "2月第二批普货"
}
```

**房租自动带入逻辑**：每月1号自动检查，如果当月没有"房租"记录，则自动插入一条（金额读取 shop_settings.fixed_rent，备注为"X月固定房租（自动）"，is_auto = true）

**验收**：能增删改查支出，房租自动带入正常工作

---

### 任务 2.5：实现分析接口

**接口列表**：
- `GET /analysis/monthly-overview?month=2026-02`：月度总览
- `GET /analysis/profit?month=2026-02`：盈亏分析
- `GET /analysis/breakeven?month=2026-02`：盈亏平衡点

**月度总览返回数据**：
```json
{
  "totalIncome": 82000,
  "totalExpense": 65000,
  "balance": 17000,
  "incomeByPlatform": [
    { "platform": "美团外卖", "amount": 28000, "percentage": 34.1 }
  ],
  "expenseByCategory": [
    { "category": "普货", "amount": 35000, "percentage": 53.8 }
  ]
}
```

**盈亏平衡点计算逻辑**：
```
固定成本 = shop_settings.fixed_rent
人力成本 = 当月"工资"类别支出总额（如当月无记录，取上月值）
水电成本 = 当月"水电"类别支出总额（如当月无记录，取上月值）
采购成本 = 近3个月"普货"+"周边货物"类别支出的月均值

盈亏平衡点 = 固定成本 + 人力成本 + 水电成本 + 采购成本
每日平衡点 = 盈亏平衡点 / 当月天数
```

**验收**：返回数据计算正确，边界情况处理妥当（新店无历史数据时给出合理默认值）

---

### 任务 2.6：实现设置接口

**接口列表**：
- `GET /settings`：获取当前店铺设置
- `PUT /settings`：更新设置

**可更新字段**：
- shop name（店铺名称）
- fixed_rent（固定房租）
- platforms（平台列表，JSON 数组）
- expense_categories（支出类别列表，JSON 数组）

**验收**：能读取和更新所有设置项，更新后立即生效

---

## 阶段 3：前端页面开发

### 任务 3.1：初始化前端项目

**步骤**：
```bash
npm create vite@latest luckcup-web -- --template react
cd luckcup-web
npm install tailwindcss @tailwindcss/vite @supabase/supabase-js react-router-dom
```

**配置要点**：
- Tailwind CSS 配置移动端优先
- 设置 API 基础地址（环境变量 VITE_API_URL）
- 创建 services/api.js 封装所有 API 调用
- 配置 React Router 路由

**目录结构**：
```
luckcup-web/
├── src/
│   ├── components/        # 公共组件
│   │   ├── NavBar.jsx     # 底部导航
│   │   ├── PageHeader.jsx # 页面顶部
│   │   ├── Card.jsx       # 卡片容器
│   │   └── AmountInput.jsx # 金额输入框
│   ├── pages/
│   │   ├── LoginPage.jsx      # 登录页
│   │   ├── IncomePage.jsx     # 今日收入
│   │   ├── ExpensePage.jsx    # 记支出
│   │   ├── OverviewPage.jsx   # 月度总览
│   │   ├── AnalysisPage.jsx   # 盈亏分析
│   │   └── SettingsPage.jsx   # 设置
│   ├── services/
│   │   ├── api.js         # API 调用封装
│   │   └── auth.js        # 认证相关
│   ├── App.jsx
│   └── main.jsx
├── .env                   # VITE_API_URL, VITE_SUPABASE_URL, VITE_SUPABASE_KEY
└── index.html
```

**验收**：`npm run dev` 能启动，能看到空白页面，路由切换正常

---

### 任务 3.2：实现登录页

**页面内容**：
- LuckCup Logo / 品牌名
- 手机号输入框
- 获取验证码按钮（60秒倒计时）
- 验证码输入框
- 登录按钮

**逻辑**：登录成功后跳转到"今日收入"页面，首次登录自动创建店铺

**验收**：能用手机号走通登录流程

---

### 任务 3.3：实现"今日收入"页面

**参考原型**：原型设计的第1个标签页

**交互细节**：
- 打开默认显示今天日期，可点击切换日期
- 6 个平台输入框，数字键盘
- 底部实时显示"今日合计"和"本月累计"
- 点击保存后提示成功，如已有数据则为更新

**验收**：能录入、保存、查看、修改每日收入

---

### 任务 3.4：实现"记支出"页面

**参考原型**：原型设计的第2个标签页

**交互细节**：
- 6 个类别大按钮，选中高亮
- 金额输入（数字键盘）
- 备注输入（必填，不填不能保存）
- 保存后清空表单，列表刷新
- 下方展示本月支出记录列表
- 每条记录可左滑删除或点击编辑

**验收**：能新增、查看、编辑、删除支出记录

---

### 任务 3.5：实现"月度总览"页面

**参考原型**：原型设计的第3个标签页

**交互细节**：
- 顶部月份选择器（左右箭头切换月份）
- 结余卡片（绿色盈利/红色亏损）
- 收入构成列表（带占比进度条）
- 支出构成列表（带占比进度条）

**验收**：数据与录入一致，切换月份数据正确变化

---

### 任务 3.6：实现"盈亏分析"页面

**参考原型**：原型设计的第4个标签页

**交互细节**：
- 盈亏结果大卡片（金额 + 利润率）
- 各平台利润贡献列表
- 盈亏平衡点卡片（各项成本明细 + 月/日最低到账额 + 当前进度）
- V1说明提示（等比例分摊的说明文字）

**验收**：盈亏计算正确，平衡点动态计算正确

---

### 任务 3.7：实现"设置"页面

**参考原型**：原型设计的第5个标签页

**交互细节**：
- 店铺名称：点击进入编辑
- 收入平台管理：列表展示，可增删
- 支出类别管理：列表展示，可增删
- 固定房租：点击编辑金额
- 账号信息：显示手机号（脱敏），退出登录按钮

**验收**：所有设置可正常编辑和保存

---

## 阶段 4：前后端联调

### 任务 4.1：API 对接

**步骤**：
1. 前端 services/api.js 中的所有 mock 数据替换为真实 API 调用
2. 处理 loading 状态（加载中显示骨架屏或转圈）
3. 处理错误状态（网络异常、服务器错误的友好提示）

**验收**：所有页面使用真实数据，无 mock 数据残留

---

### 任务 4.2：登录态管理

**步骤**：
1. Token 持久化存储（使用 Supabase 的 session 管理）
2. 未登录自动跳转登录页
3. Token 过期自动刷新或跳转登录页
4. 退出登录清除本地状态

**验收**：关闭浏览器再打开仍保持登录状态，Token 过期能正确处理

---

### 任务 4.3：端到端测试

**测试流程**：
1. 新用户首次登录 → 自动创建店铺和默认设置
2. 设置页面修改店铺名和房租 → 保存成功
3. 今日收入填写 6 个平台数据 → 保存 → 再次打开数据仍在
4. 记支出新增 3 笔不同类别 → 列表显示正确
5. 月度总览查看 → 收支数据一致
6. 盈亏分析查看 → 盈亏和平衡点计算正确
7. 切换月份 → 历史数据正常展示
8. 退出登录 → 重新登录 → 数据正常

**验收**：以上 8 个场景全部通过

---

## 阶段 5：部署上线

### 任务 5.1：后端部署到 Railway

**步骤**：
1. 将 luckcup-api 代码推送到 GitHub
2. 在 Railway 创建项目，关联 GitHub 仓库
3. 设置环境变量（SUPABASE_URL, SUPABASE_SERVICE_KEY, PORT）
4. 部署后记录后端地址（如 api-luckcup.railway.app）

**验收**：能通过公网地址访问后端 API

---

### 任务 5.2：前端部署到 Vercel

**步骤**：
1. 将 luckcup-web 代码推送到 GitHub
2. 在 Vercel 导入项目
3. 设置环境变量（VITE_API_URL 指向 Railway 地址）
4. 部署后记录前端地址（如 luckcup.vercel.app）

**验收**：手机浏览器打开前端地址能正常使用

---

### 任务 5.3：配置 PWA

**步骤**：
1. 添加 manifest.json（应用名称、图标、主题色）
2. 添加 Service Worker（基础缓存）
3. 测试"添加到主屏幕"功能

**验收**：iPhone/Android 都能添加到主屏幕，打开后没有浏览器地址栏

---

### 任务 5.4：配置真实短信服务

**步骤**：
1. 注册短信服务商账号（推荐阿里云短信）
2. 申请短信签名和模板
3. 在 Supabase 中配置短信服务商
4. 测试真实手机号登录

**验收**：真实手机号能收到验证码并登录

---

## 交付给 Claude Code 的使用说明

将以下文档一起发送给 Claude Code：

1. **LuckCup_V1_需求规格说明书.docx** — 告诉它"做什么"
2. **LuckCup_V1_架构设计文档.docx** — 告诉它"用什么技术做"
3. **本文档（开发实施计划）** — 告诉它"按什么步骤做"
4. **LuckCup_V1_原型设计.jsx** — 告诉它"长什么样"

建议的开发指令格式：
```
请按照《开发实施计划》的阶段 X 任务 X.X 开始开发。
参考需求规格说明书和架构设计文档中的相关内容。
前端样式参考原型设计文件。
```

---

*文档版本：V1.0 | 日期：2026年2月28日*
