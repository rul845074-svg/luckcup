# LuckCup 运营系统 - 版本说明

## 当前分支：main（腾讯云正式版）

- **状态**：正式使用中
- **线上地址**：https://lcup.cn/#/income
- **前端部署**：腾讯云
- **后端部署**：腾讯云 SCF（Serverless Cloud Function）
- **数据库**：MySQL
- **后端入口**：`luckcup-api/index.js`（通过 `serverless-http` 适配腾讯云）

## 项目结构

```
├── luckcup-api/          # 后端 API（Node.js + Express + MySQL）
├── luckcup-web/          # 前端（React + Vite + Tailwind CSS）
├── LuckCup_V1_需求规格说明书.docx
├── LuckCup_V1_架构设计文档.docx
├── LuckCup_V1_开发实施计划.md
├── LuckCup_V1_原型设计.jsx
└── ...其他文档
```

## 其他分支

| 分支名 | 说明 | 状态 |
|--------|------|------|
| `main` | 腾讯云正式版（当前使用） | ✅ 在用 |
| `archive/vercel-railway` | Vercel + Railway 部署方案 | 📦 归档（国内网络无法访问 Vercel） |
| `archive/vercel-hybrid` | 混合部署方案（Vercel 前端 + 腾讯云/Railway 后端） | 📦 归档（过渡版本） |
