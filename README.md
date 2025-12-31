# KanBan 周报系统

基于Sprint迭代管理的看板系统，用于替代传统的Excel周报。

**技术栈:** React 19 + TypeScript + Vite + Node.js + Express + PostgreSQL 16

---

## 🚀 本地开发

### 1. 环境要求

- **Node.js:** 20+
- **PostgreSQL:** 16+

**安装 PostgreSQL (Windows):**
```powershell
# 1. 下载 PostgreSQL 16: https://www.postgresql.org/download/windows/
# 2. 运行安装程序，按照向导完成安装
# 3. 安装过程中设置 postgres 用户密码
# 4. 默认端口: 5432
```

### 2. 数据库初始化

```bash
# 运行初始化脚本（自动创建数据库、用户和初始数据）
./setup.sh
```

初始化脚本会自动创建：
- 数据库用户 `kanban_user`
- 数据库 `kanban_db`
- 管理员账户（用户名: `admin`, 密码: `admin123`）
- Backlog迭代（id: -1）

### 3. 启动后端

```bash
cd backend
npm install
npm run migrate:up    # 运行数据库迁移
npm run dev           # 启动开发服务器（端口 4004）
```

### 4. 启动前端

```bash
cd frontend
npm install
npm run dev           # 启动开发服务器（端口 3003）
```

### 5. 访问应用

```
浏览器打开: http://localhost:3003

默认账户:
  用户名: admin
  密码: admin123

⚠️  首次登录后请立即修改默认密码
```

---

## 📦 生产部署

### 快速部署（推荐）

```bash
# 1. 上传代码到服务器 /opt/kanban

# 2. 进入部署目录
cd /opt/kanban/deploy

# 3. 执行一键部署脚本
./deploy.sh

# 4. 访问应用
# 浏览器打开: http://服务器IP:3003
```

**详细部署文档:** [deploy/README.md](./deploy/README.md)

---

## 📁 项目结构

```
KanBan/
├── backend/              # 后端 (Express + TypeScript)
│   ├── src/
│   │   ├── routes/      # API路由
│   │   ├── db/          # 数据库连接
│   │   └── index.ts     # 入口文件
│   └── migrations/      # 数据库迁移
│
├── frontend/            # 前端 (React + TypeScript + Vite)
│   ├── src/
│   │   ├── pages/       # 页面组件
│   │   ├── components/  # UI组件
│   │   └── types.ts     # 类型定义
│   └── vite.config.ts
│
├── deploy/              # 部署文件
│   ├── deploy.sh        # 一键部署脚本
│   ├── stop.sh          # 停止服务脚本
│   └── README.md        # 部署文档
│
├── 方案/                # 架构设计文档
├── setup.sh             # 本地数据库初始化脚本
└── README.md            # 本文档
```

---

## 🛠️ 常用命令

### 后端
```bash
npm run dev          # 开发模式（热重载）
npm run build        # 编译TypeScript
npm start            # 生产模式
npm run migrate:up   # 运行数据库迁移
npm run migrate:down # 回滚数据库迁移
npm run seed         # 初始化数据（admin账户 + backlog迭代）
```

### 前端
```bash
npm run dev          # 启动Vite开发服务器
npm run build        # 构建生产版本
npm run preview      # 预览生产构建
npm run lint         # 运行ESLint检查
```

---

## 📚 核心功能

- ✅ Sprint迭代管理
- ✅ Story（用户故事）管理
- ✅ Task（任务）管理
- ✅ 看板视图（拖拽操作）
- ✅ 列表视图（批量编辑）
- ✅ 权限管理（Admin / Developer / External）
- ✅ 团队周报导出（Excel）
- ✅ 个人周报导出（Excel）

---

## 🔑 数据库配置

**默认连接信息:**
```
数据库: kanban_db
用户名: kanban_user
密码: kanban_password (由setup.sh生成)
端口: 5432
```

**修改配置:**
- 本地开发：修改 `backend/src/db/index.ts`
- 生产部署：设置环境变量 `DATABASE_URL`

---

## 📖 文档

- **用户手册:** [docs/用户操作手册.md](./docs/用户操作手册.md) - 5分钟快速上手 ⭐
- **快速参考:** [docs/快速参考.md](./docs/快速参考.md) - 常用操作速查
- **开发指南:** [DEVELOPER-GUIDE.md](./DEVELOPER-GUIDE.md) - 完整的开发者文档
- **部署指南:** [deploy/README.md](./deploy/README.md) - 生产环境部署
- **架构设计:** [方案/architecture-design-final.md](./方案/architecture-design-final.md) - 系统架构设计
- **Claude使用:** [CLAUDE.md](./CLAUDE.md) - Claude Code使用指南

---

## ⚠️ 安全提示

**生产环境部署前请务必：**
- 修改默认管理员密码 (`admin/admin123`)
- 修改数据库密码
- 配置防火墙（只开放必要端口：3003, 22）
- 定期备份数据库
- 使用HTTPS（可选）

---

## 📄 License

ISC
