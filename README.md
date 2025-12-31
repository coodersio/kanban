# KanBan Weekly Report System

一个基于Sprint迭代管理的看板系统，用于替代传统的Excel周报。
npm --prefix frontend run dev
## 技术栈

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL 16.x

## 快速开始

### 1. 数据库初始化

```bash
# 使用Docker（推荐）
docker-compose up -d

# 或使用本地PostgreSQL
./setup.sh
```

`setup.sh` 脚本会自动创建：
- 数据库用户 `kanban_user`
- 数据库 `kanban_db`
- 管理员账户（用户名: `admin`, 密码: `admin123` ⚠️ **请立即修改**）
- Backlog迭代（id: -1）

### 2. 后端启动

```bash
cd backend
npm install
npm run build
npm run migrate:up all  # 运行所有数据库迁移
npm run dev             # 启动开发服务器
```

### 3. 前端启动

```bash
cd frontend
npm install
npm run dev
```

访问: http://localhost:3003

## 默认账户

⚠️ **安全警告**: 以下为开发环境默认凭证，生产环境请务必修改！

- **用户名**: `admin`
- **密码**: `admin123` （**请在首次登录后立即修改**）
- **角色**: 系统管理员

## 数据库连接

默认连接字符串（请根据实际配置修改）：
```
postgresql://kanban_user:your_password@localhost:5432/kanban_db
```

## 常用命令

### 后端
```bash
npm run dev          # 开发模式（热重载）
npm run build        # 编译TypeScript
npm start            # 生产模式
npm run migrate:up   # 应用数据库迁移
npm run seed         # 初始化数据（admin账户 + backlog迭代）
```

### 前端
```bash
npm run dev          # 启动Vite开发服务器
npm run build        # 构建生产版本
npm run lint         # 运行ESLint检查
```

## 项目结构

```
KanBan/
├── backend/         # Express后端
│   ├── src/
│   │   ├── routes/  # API路由
│   │   ├── scripts/ # 工具脚本
│   │   └── db/      # 数据库连接
│   └── migrations/  # 数据库迁移脚本
├── frontend/        # React前端
│   ├── src/
│   │   ├── pages/   # 页面组件
│   │   ├── components/ # UI组件
│   │   └── types.ts # TypeScript类型定义
└── setup.sh         # 数据库初始化脚本
```

## 核心功能

- Sprint迭代管理
- Story（用户故事）管理
- Task（任务）管理
- 看板视图 / 列表视图切换
- 拖拽排序和状态变更
- 权限管理（Admin / Developer / External）
- 周报导出（Excel）

## 文档

- [架构设计文档](./方案/architecture-design-final.md)
- [Claude Code指南](./CLAUDE.md)
- [数据库初始化指南](./backend/INIT.md)
- [周报实现文档](./weekly-report-implementation.md)

## License

ISC
