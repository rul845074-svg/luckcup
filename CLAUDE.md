# LuckCup 运营系统 - 项目指南

## 必读：部署契约（生产环境基线）

以下是腾讯云正式版的固定配置，**任何涉及这些项的改动必须先跟用户确认，不得自行修改**。

| 项目 | 值 | 说明 |
|------|-----|------|
| 线上地址 | `https://lcup.cn/#/income` | 注意 `#` 号，说明是 HashRouter |
| 前端路由 | `HashRouter` | 不是 BrowserRouter，因为 COS 静态托管不支持 history fallback |
| 前端托管 | 腾讯云 COS | 只托管静态文件（HTML/JS/CSS），不做任何 API 代理 |
| 后端部署 | 腾讯云 SCF（Serverless Cloud Function） | 通过自定义域名 `api.lcup.cn` 访问，API 网关已下线不再使用 |
| 后端域名 | `https://api.lcup.cn` | SCF 控制台绑定的自定义域名，路径映射 `/*` → `default/luckcup-api/$DEFAULT` |
| SCF 函数 URL | `https://1407262666-dpfeex1z10.ap-shanghai.tencentscf.com` | 仅供测试，生产环境用 `api.lcup.cn` |
| 前端 API 地址 | `VITE_API_URL=https://api.lcup.cn`  | 已写入 `luckcup-web/.env.production`，构建时自动读取。禁止依赖 `'/api'` fallback |
| 数据库 | 腾讯云 MySQL | SCF 通过环境变量获取连接信息 |
| SCF 环境变量 | `JWT_SECRET`、数据库连接信息等 | 在腾讯云 SCF 控制台配置，不在代码里 |
| GitHub 仓库 | `https://github.com/rul845074-svg/luckcup` | `main` 分支为正式版 |

### 生产构建步骤

```bash
# 前端构建（.env.production 已配好 VITE_API_URL，直接构建即可）
cd luckcup-web
npm run build
# 产物在 dist/ 目录，上传到腾讯云 COS（index.html + assets/ 目录）

# 后端打包
cd luckcup-api
zip -r luckcup-api.zip . -x "node_modules/.cache/*"
# 上传到腾讯云 SCF
```

### COS 域名解析注意事项

COS 有两个端点，**DNS 指向和 COS 控制台绑定的源站类型必须一致**，否则返回 403：
- **普通端点** `luckcup-web-1407262666.cos.ap-shanghai.myqcloud.com` — 对应 COS 控制台"默认源站"类型，不会把 `/` 映射到 `index.html`
- **静态网站端点** `luckcup-web-1407262666.cos-website.ap-shanghai.myqcloud.com` — 对应 COS 控制台"静态网站源站"类型，会自动把 `/` 映射到 `index.html`

当前配置：
- DNSPod 的 `@` 和 `www` 记录 CNAME 到 `-website` 端点
- COS 控制台自定义域名的源站类型选择"静态网站源站"
- 两端必须匹配，否则 COS 拒绝请求

### DNSPod 记录说明

| 主机记录 | 类型 | 指向 | 用途 |
|---------|------|------|------|
| `@` | CNAME | `luckcup-web-1407262666.cos-website.ap-shanghai.myqcloud.com` | 前端（COS 静态网站） |
| `www` | CNAME | 同上 | 同上 |
| `api` | CNAME | `1407262666.ap-shanghai.tencentscf.com` | 后端（SCF 云函数） |
| `_dnsauth` | TXT | 验证值 | SSL 证书验证，不要动 |

## 必读：协作规则

1. **先看文档再动手** — 项目的学习文档在 `学习/` 目录，需求/架构/进度文档都在里面，改代码前先读
2. **不改部署架构** — 路由模式、API 地址来源、COS/SCF 职责边界，未经用户同意不得修改
3. **不做过度工程** — 这是一个加盟店老板自用的小工具，不需要高并发防御、断线恢复、审核工作流等企业级功能
4. **一次只做一件事** — 不要同时推进功能开发、数据导入、线上排障，容易互相干扰
5. **代码提交前确认** — 改了什么、为什么改、需不需要重新打包部署，都要跟用户说清楚
6. **仓库代码 = 线上版本** — 提交到 main 的代码必须与线上实际运行的版本一致

## 项目概况

- 目标用户：蜜雪冰城加盟商老板，仅用手机操作
- 前端：移动端优先，React + Vite + Tailwind CSS
- 后端：Node.js + Express + MySQL
- 架构：前后端分离（`luckcup-api/` + `luckcup-web/`）
- 域名：lcup.cn（已购买并完成审核）

### 分支说明

| 分支 | 用途 | 状态 |
|------|------|------|
| `main` | 腾讯云正式版 | 在用 |
| `archive/vercel-railway` | Vercel + Railway 方案 | 归档 |
| `archive/vercel-hybrid` | 混合部署过渡版 | 归档 |

---

# 工作日志

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
   - 旧分支 `claude/luckcup-operations-system-TAFs3` → 重命名为 `archive/vercel-railway`
   - 旧分支 `claude/rebuild-frontend-Cme2Q` → 重命名为 `archive/vercel-hybrid`
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


## 2026-03-20 线上排障与状态更新

### 完成的工作

1. **历史导入排障**
   - 定位 `expenses.PRIMARY` 重复主键报错来自导入 SQL 不具备幂等性
   - 将历史导入脚本中 `expenses` 与 `backend_entries` 改为 `INSERT IGNORE`
   - 将历史导入 SQL 拆分为 `daily_income / expenses / backend_entries` 三段，便于腾讯云 DMS 分段执行
   - 确认 `purchase_items_import.sql` 已执行

2. **登录问题排障**
   - 确认手机号 `16696109340` 已注册且账号结构完整
   - 定位线上 `/auth/login` 返回 `500` 的原因是腾讯云 SCF 缺少 `JWT_SECRET`
   - 补齐环境变量后，账号已可正常登录

3. **数据归属排查**
   - 确认当前可登录账号对应的 `shop_id` 与历史导入数据所属 `shop_id` 不一致
   - 解释了“登录成功但没有数据”的原因
   - 当前决定为：账号先不改绑，历史数据先不迁移

4. **后端健壮性修复**
   - 调整数据库断线重试逻辑，仅自动重试读查询
   - 为新增支出接口增加“插入成功但响应丢失”场景的恢复处理

5. **2026-02 单月补导与台账能力**
   - 确认 `.numbers` 版 `2月收入` 存在解析异常，改为使用 `核对清单2026-2月.xlsx`
   - 新增 `scripts/import_month_from_xlsx.py` 与 `scripts/import_month_from_csv.py`
   - 生成 `scripts/output/month_import_2026_02.sql`
   - 新增收入页“本月收入明细”接口与展示
   - 新增分析页“导出本月台账 CSV”
   - 新增 `scripts/build_ledger_review_workbook.py` 与 `scripts/build_ledger_update_sql.py`
   - 支持“系统导出台账 → 表格审核 → 生成回写 SQL”的闭环
   - 默认支出类别补充 `活动 / 物业 / 其他`
- 最新前端 `dist` 与后端上传包已重新生成

### 今日补充结论

- 今日最终重新确认的腾讯云正式版架构基线为：
  - 前端路由：`HashRouter`
  - API 地址：显式 `VITE_API_URL = SCF/API 网关地址`
  - COS 职责：只负责静态文件托管
- 说明：
  - 线上入口按 `https://lcup.cn/#/income` 理解
  - 生产前端不能再依赖 `'/api'` fallback
  - COS 不承担 `/api` 代理职责

### 今日反思

- 今天的排障中，代码修复和部署架构排查被混在了一起，导致反复上传前后端
- 后续凡是涉及路由模式、API 地址、COS 与 SCF 职责边界的调整，必须先确认正式基线，再执行修改
- 优先做“基线确认 -> 偏移检查 -> 最小修正”，不再边改边试

### 当前状态

- 线上账号可登录
- `backend_entries` 与 `purchase_items` 表已存在
- `historical_import.sql` 已执行过
- `purchase_items_import.sql` 已执行
- `migrate-v2.sql` 已执行
- 当前登录账号暂时看不到历史导入数据
- 2026-02 单月补导 SQL 已生成
- 月度收入明细与台账导出功能已在本地完成
- 生产打包配置仍需按正式基线重新校准 `VITE_API_URL`

### 下一步建议

- 先把腾讯云正式版部署契约补成固定文档
- 对照当前前端打包方式检查 `VITE_API_URL` 的实际来源
- 再决定是否需要重新生成前端包
- 决定是否将历史数据迁移到当前账号店铺下
- 如需批量审类或改类目，先导出台账 CSV 再生成审核工作簿
