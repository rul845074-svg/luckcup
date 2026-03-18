# LuckCup 运营系统 - 版本说明

## 当前分支：archive/vercel-hybrid（混合部署方案 - 已归档）

- **状态**：📦 已归档（过渡版本，最终采用纯腾讯云方案）
- **前端部署**：Vercel（配置了 `base: './'` 相对路径，兼容非 Vercel 部署）
- **后端部署**：同时保留了 Railway（`railway.toml`）和腾讯云 SCF（`scf_bootstrap`）两套配置
- **数据库**：Supabase（PostgreSQL 托管服务）
- **后端入口**：`backend/server.js`（标准 Express）
- **特有内容**：PWA 图标（icon-192/512.png）、数据库建表脚本（`database/schema.sql`）

## 项目结构

```
├── backend/              # 后端 API（Node.js + Express + Supabase）
│   ├── server.js         # 入口文件
│   ├── railway.toml      # Railway 部署配置
│   ├── scf_bootstrap     # 腾讯云 SCF 启动脚本
│   └── src/              # 源码（routes, middleware, config）
├── frontend/             # 前端（React + Vite + Tailwind CSS）
│   ├── vercel.json       # Vercel 部署配置
│   ├── public/           # PWA 图标
│   └── src/              # 源码（pages, components, store, utils）
├── database/
│   └── schema.sql        # 数据库建表脚本（Supabase 版）
└── CHANGELOG-2026-03-17.md
```

## 与其他版本的区别

| 对比项 | 本分支（混合方案） | archive/vercel-railway（Vercel方案） | main（腾讯云正式版） |
|--------|-------------------|-------------------------------------|---------------------|
| 前端部署 | Vercel（兼容自托管） | Vercel | 腾讯云 |
| 后端部署 | Railway + 腾讯云 SCF 双配置 | 仅 Railway | 腾讯云 SCF |
| 数据库 | Supabase | Supabase | MySQL |
| PWA 图标 | ✅ 有 | ❌ 无 | ❌ 无 |
| 建表脚本 | ✅ 有（database/schema.sql） | ❌ 无 | ✅ 有（db/init.sql） |
| 定位 | 从 Vercel 向腾讯云迁移的过渡版本 | 最初的纯 Vercel 方案 | 最终采用的正式方案 |

## 所有分支

| 分支名 | 说明 | 状态 |
|--------|------|------|
| `main` | 腾讯云正式版（当前使用） | ✅ 在用 |
| `archive/vercel-railway` | Vercel + Railway 部署方案 | 📦 归档 |
| `archive/vercel-hybrid` | 混合部署方案（本分支） | 📦 归档 |
