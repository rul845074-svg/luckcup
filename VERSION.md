# LuckCup 运营系统 - 版本说明

## 当前分支：archive/vercel-railway（Vercel 方案 - 已归档）

- **状态**：📦 已归档（国内网络无法访问 Vercel，已弃用）
- **前端部署**：Vercel
- **后端部署**：Railway
- **数据库**：Supabase（PostgreSQL 托管服务）
- **后端入口**：`backend/server.js`（标准 Express，无 serverless 适配）

## 项目结构

```
├── backend/              # 后端 API（Node.js + Express + Supabase）
│   ├── server.js         # 入口文件
│   ├── railway.toml      # Railway 部署配置
│   └── src/              # 源码（routes, middleware, config）
├── frontend/             # 前端（React + Vite + Tailwind CSS）
│   ├── vercel.json       # Vercel 部署配置
│   └── src/              # 源码（pages, components, store, utils）
```

## 与其他版本的区别

| 对比项 | 本分支（Vercel方案） | main 分支（腾讯云正式版） |
|--------|---------------------|-------------------------|
| 前端部署 | Vercel | 腾讯云 |
| 后端部署 | Railway | 腾讯云 SCF |
| 数据库 | Supabase | MySQL |
| 后端入口 | `server.js`（普通 Express） | `index.js`（serverless-http 适配） |
| 目录结构 | `backend/` + `frontend/` | `luckcup-api/` + `luckcup-web/` |
| 弃用原因 | 国内用户无法访问 Vercel | — |

## 所有分支

| 分支名 | 说明 | 状态 |
|--------|------|------|
| `main` | 腾讯云正式版（当前使用） | ✅ 在用 |
| `archive/vercel-railway` | Vercel + Railway 部署方案（本分支） | 📦 归档 |
| `archive/vercel-hybrid` | 混合部署方案（Vercel 前端 + 腾讯云/Railway 后端） | 📦 归档 |
