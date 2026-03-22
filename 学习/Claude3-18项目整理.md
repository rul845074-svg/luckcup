# LuckCup 运营系统 - 工作日志

## 2026-03-18 项目整理与 GitHub 规范化

### 完成的工作

1. **安装开发工具**
   - 安装了 Homebrew（macOS 包管理器），位置：`/opt/homebrew/`
   - 安装了 GitHub CLI（`gh`），位置：`/opt/homebrew/bin/gh`
   - 登录了 GitHub 账号：`rul845074-svg`

2. **项目版本梳理**
   - 对比了本地代码与 GitHub 上两个分支的差异
   - 确认了三个版本的归属：
     - 本地版本 = 腾讯云方案（正在使用）
     - GitHub 分支1 = Vercel + Railway 方案（因国内网络问题弃用）
     - GitHub 分支2 = 混合部署过渡版本

3. **GitHub 仓库整理**
   - 将本地腾讯云版代码推送为 `main` 默认分支
   - 旧分支 `Codex/luckcup-operations-system-TAFs3` → 重命名为 `archive/vercel-railway`
   - 旧分支 `Codex/rebuild-frontend-Cme2Q` → 重命名为 `archive/vercel-hybrid`
   - 删除了旧的难懂分支名
   - 每个分支添加了 `VERSION.md` 版本说明文件，包含部署方式、技术栈、版本对比表

### 当前项目状态

- **线上地址**：https://lcup.cn/#/income
- **GitHub 仓库**：https://github.com/rul845074-svg/luckcup
- **部署平台**：腾讯云（前端 + 后端 SCF）
- **技术栈**：React + Vite + Tailwind CSS（前端）/ Node.js + Express + MySQL（后端）
- **域名**：lcup.cn（已购买并完成审核）

### 分支说明

| 分支 | 用途 | 状态 |
|------|------|------|
| `main` | 腾讯云正式版 | ✅ 在用 |
| `archive/vercel-railway` | Vercel + Railway 方案 | 📦 归档 |
| `archive/vercel-hybrid` | 混合部署过渡版 | 📦 归档 |

### 备注

- 项目采用前后端分离架构（`luckcup-api/` + `luckcup-web/`）
- 目标用户为加盟商老板，仅用手机操作，前端为移动端优先设计
- 最初用 Vercel 部署，因国内网络无法访问，后迁移至腾讯云
