# LuckCup 运营系统 — 2026-03-17 修改报告

## 概览

今日共提交 **8 次 commit**，涉及 **14 个文件**，主要完成了前端部署适配、认证方式修改、后端云函数部署配置、以及分析页面崩溃修复。

---

## 一、前端静态托管适配（COS）

**问题**：前端构建产物使用绝对路径 `/assets/...`，部署到腾讯云 COS 静态托管后资源加载 404；同时 BrowserRouter 需要服务端 fallback，COS 不支持。

**修改内容**：

| 文件 | 改动 |
|------|------|
| `frontend/vite.config.js` | `base` 设置为 `'./'`，资源使用相对路径 |
| `frontend/src/main.jsx` | `BrowserRouter` → `HashRouter`，兼容纯静态托管 |
| `frontend/public/icon-192.png` | 新增 PWA 占位图标 |
| `frontend/public/icon-512.png` | 新增 PWA 占位图标 |

---

## 二、认证方式改为手机号登录

**问题**：Supabase 项目配置的是手机号认证，但代码使用的是 email 方式，导致注册/登录失败。

**修改内容**：

| 文件 | 改动 |
|------|------|
| `frontend/src/pages/LoginPage.jsx` | email 输入框 → 手机号输入框 |
| `frontend/src/pages/RegisterPage.jsx` | email → 手机号，增加格式校验（1开头11位） |
| `frontend/src/pages/SettingsPage.jsx` | 用户信息展示 email → phone |
| `backend/src/routes/auth.js` | `signInWithPassword` / `createUser` 改用 phone（E.164 格式 +86） |
| `backend/src/routes/settings.js` | 返回 phone 字段替代 email |

---

## 三、后端腾讯云 SCF 部署配置

**修改内容**：

| 文件 | 改动 |
|------|------|
| `backend/scf_bootstrap` | 新增 SCF Web Function 启动脚本，设置 `PORT=9000` 并启动 `server.js` |
| `backend/package-lock.json` | 新增，确保 SCF 环境可复现构建 |
| `frontend/package-lock.json` | 新增，锁定前端依赖版本 |

---

## 四、分析页面崩溃修复（月度总览 & 盈亏分析）

**问题**：打开「月度总览」和「盈亏分析」页面时，控制台报错：

1. `TypeError: Cannot read properties of undefined (reading 'length')` — 数组字段为 `undefined`
2. `TypeError: Cannot read properties of undefined (reading 'toFixed')` — 数值字段为 `undefined`

**根因**：API 返回的数据中 `platformBreakdown`、`categoryBreakdown`、`platformContributions` 等数组字段，以及 `profit`、`totalIncome`、`totalExpense`、`costBreakdown` 等数值/对象字段可能为 `undefined`，前端直接调用 `.length` / `.toFixed()` 导致页面白屏。

**修改内容**：

| 文件 | 改动 |
|------|------|
| `frontend/src/pages/OverviewPage.jsx` | API 返回时默认 `platformBreakdown: []`、`categoryBreakdown: []`；所有 `.toFixed()` 加 `?? 0` 保护；`item.amount`、`item.percentage` 加空值守卫 |
| `frontend/src/pages/ProfitPage.jsx` | API 返回时默认 `platformContributions: []`；`profit.profit`、`totalIncome`、`totalExpense`、`profitRate` 加 `?? 0`；平台贡献列表 `item.income`、`item.profit` 加空值守卫；breakeven 区域所有数值加 `?? 0`，`costBreakdown` 加 `?.` 可选链 |

**共两轮修复**：第一轮修复了数组 `.length` 和 breakeven 区块；第二轮根据线上新报错补全了 profit 区块所有 `.toFixed()` 调用。

---

## 五、部署操作

- 前端构建产物已两次上传至腾讯云 COS（`luckcup-web-1407262666`，ap-shanghai）
- 每次上传前清空桶内旧文件，正确设置 Content-Type 和 Cache-Control
- 上传脚本（含密钥）执行后立即删除，未留存于代码仓库

---

## 修改文件汇总

```
frontend/src/main.jsx                  (HashRouter 适配)
frontend/vite.config.js                (相对路径)
frontend/public/icon-192.png           (新增)
frontend/public/icon-512.png           (新增)
frontend/src/pages/LoginPage.jsx       (手机号登录)
frontend/src/pages/RegisterPage.jsx    (手机号注册)
frontend/src/pages/SettingsPage.jsx    (显示手机号)
frontend/src/pages/OverviewPage.jsx    (空值保护)
frontend/src/pages/ProfitPage.jsx      (空值保护)
backend/src/routes/auth.js             (手机号认证)
backend/src/routes/settings.js         (返回手机号)
backend/scf_bootstrap                  (新增)
backend/package-lock.json              (新增)
frontend/package-lock.json             (新增)
```

---

## Commit 记录

| Hash | 说明 |
|------|------|
| `eeed19d` | Add package-lock.json for reproducible builds |
| `a76c66d` | chore: clean up cos-nodejs-sdk-v5 after COS upload |
| `7836819` | fix: COS static hosting compatibility |
| `e1c6b85` | fix: switch auth from email to phone number |
| `bc09db1` | chore: add scf_bootstrap for Tencent Cloud SCF deployment |
| `153a0cc` | chore: add backend package-lock.json for reproducible builds |
| `01c03b7` | fix: add defensive null checks to prevent crash on analysis pages |
| `2036ef0` | fix: add null guards for all .toFixed() calls on analysis pages |
