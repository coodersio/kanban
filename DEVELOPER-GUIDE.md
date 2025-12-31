# KanBan 周报系统 - 完整开发者文档

> **项目名称:** KanBan Weekly Report System
> **当前版本:** v3.1
> **文档类型:** 完整开发者指南
> **更新日期:** 2025-12-30
> **面向对象:** 后续开发人员、系统运维人员

> ⚠️ **安全警告**
>
> 本文档中的数据库凭证、密码等敏感信息均为示例值，仅用于开发环境。
>
> **生产环境部署前务必修改以下内容：**
> - 数据库用户名和密码
> - 默认管理员密码 (admin123)
> - SESSION_SECRET 环境变量
> - 所有示例凭证

---

## 📋 目录

- [1. 项目概述](#1-项目概述)
- [2. 技术架构](#2-技术架构)
- [3. 快速开始](#3-快速开始)
- [4. 数据库设计](#4-数据库设计)
- [5. 权限系统](#5-权限系统)
- [6. API设计](#6-api设计)
- [7. 前端架构](#7-前端架构)
- [8. 核心功能实现](#8-核心功能实现)
- [9. 部署指南](#9-部署指南)
- [10. 常见问题](#10-常见问题)

---

## 1. 项目概述

### 1.1 业务背景

**解决的问题:**
- ❌ 传统方式：每周手动填写Excel周报，部门经理手动汇总
- ❌ 痛点：上百个项目难以管理和追踪
- ✅ 解决方案：在线协作、自动汇总、可视化看板

**核心功能:**
```
├── 项目管理 - 管理软件项目基本信息
├── 迭代管理 - 按周管理Sprint(迭代)
├── Story管理 - 管理功能需求(关键节点)
├── Task管理 - 管理具体任务
├── 看板视图 - 拖拽式任务管理
├── 列表视图 - 表格式批量编辑
├── 仪表板 - 实时数据统计
├── 权限控制 - 基于角色的访问控制(RBAC)
└── Excel导出 - 自动生成周报
```

### 1.2 核心设计理念: 流转模型(Flow Model)

**关键特性:** Story和Task的ID在迭代间不变，通过快照表管理状态

```
传统模式(❌):
Sprint 1: Task ID=1 (状态: 进行中)
Sprint 2: Task ID=100 (新建，复制自Task 1)
=> 问题: ID变化，追踪困难

流转模式(✅):
Sprint 1: Task ID=1 (状态: 进行中)
Sprint 2: Task ID=1 (同一个Task，通过sprint_tasks快照表记录新状态)
=> 优势: ID稳定，跨迭代追踪简单
```

**实现机制:**
```
引用表(Reference Tables):
- projects, stories, tasks
- 存储实体的全局属性(title, description)
- ID永久不变

快照表(Snapshot Tables):
- sprint_projects, sprint_stories, sprint_tasks
- 存储实体在特定迭代的状态(status, progress, assigned_to)
- 通过外键关联引用表
```

---

## 2. 技术架构

### 2.1 技术栈

**前端:**
```json
{
  "框架": "React 19 + TypeScript + Vite",
  "UI库": "shadcn/ui (基于 Radix UI + Tailwind CSS)",
  "路由": "React Router 7",
  "拖拽": "@dnd-kit",
  "日期": "date-fns (中文locale)",
  "HTTP": "fetch API",
  "开发端口": "3003"
}
```

**后端:**
```json
{
  "运行时": "Node.js 20+",
  "框架": "Express 4 + TypeScript",
  "数据库": "PostgreSQL 16",
  "数据库客户端": "pg",
  "认证": "express-session (会话管理)",
  "密码": "bcrypt (哈希加密)",
  "Excel": "exceljs",
  "开发端口": "4004"
}
```

**数据库:**
```
PostgreSQL 16.x
- 外键约束 + 级联删除
- 唯一约束防止重复
- 索引优化查询性能
- 事务保证数据一致性
```

### 2.2 项目结构

```
KanBan/
├── frontend/                    # 前端项目
│   ├── src/
│   │   ├── components/          # 可复用组件
│   │   │   └── ui/              # shadcn/ui组件
│   │   ├── pages/               # 页面组件
│   │   │   ├── Dashboard.tsx    # 仪表板
│   │   │   ├── Workbench.tsx    # 工作台(看板/列表)
│   │   │   ├── ProjectsPage.tsx # 项目管理
│   │   │   ├── SprintsPage.tsx  # 迭代管理
│   │   │   ├── UsersPage.tsx    # 用户管理
│   │   │   └── components/      # 页面专用组件
│   │   ├── hooks/               # 自定义Hooks
│   │   │   └── usePermissions.ts # 权限Hook
│   │   ├── types/               # TypeScript类型
│   │   └── lib/                 # 工具函数
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                     # 后端项目
│   ├── src/
│   │   ├── db/
│   │   │   └── connection.ts    # 数据库连接池
│   │   ├── middleware/
│   │   │   └── permissions.ts   # 权限中间件
│   │   ├── routes/
│   │   │   ├── auth.ts          # 认证API
│   │   │   ├── users.ts         # 用户管理
│   │   │   ├── projects.ts      # 项目管理
│   │   │   ├── sprints.ts       # 迭代管理
│   │   │   ├── workbench.ts     # 工作台API(核心)
│   │   │   ├── dashboard.ts     # 仪表板统计
│   │   │   └── reports.ts       # Excel导出
│   │   └── index.ts             # 应用入口
│   ├── migrations/              # 数据库迁移SQL
│   ├── package.json
│   └── tsconfig.json
│
├── 方案/                        # 设计文档
│   ├── architecture-design-final.md
│   └── v3.1-er-diagram.svg
│
├── setup.sh                     # 数据库初始化脚本
├── docker-compose.yml           # Docker部署配置
└── DEVELOPER-GUIDE.md           # 本文档
```

---

## 3. 快速开始

### 3.1 环境要求

```bash
Node.js >= 20.x
PostgreSQL >= 16.x
npm >= 10.x
```

### 3.2 本地开发启动

**步骤1: 克隆项目(假设)**
```bash
cd /your/workspace
# (假设你已经有项目代码)
```

**步骤2: 启动数据库**

**选项A - 使用Docker (推荐):**
```bash
docker-compose up -d
# 数据库会运行在 localhost:5432
# 用户名: kanban_user
# 密码: your_password
# 数据库名: kanban_db
```

**选项B - 使用本地PostgreSQL:**
```bash
# 确保PostgreSQL已安装并运行
psql --version  # 确认版本 >= 16

# 创建数据库和用户
./setup.sh
```

**步骤3: 初始化数据库Schema**
```bash
cd backend
npm install
npm run migrate:up

# 会创建所有表并插入初始数据:
# - Admin账户 (username: admin, password: admin123)
# - Backlog迭代 (id: -1)
```

**步骤4: 启动后端**
```bash
cd backend
npm run dev
# 后端运行在 http://localhost:4004
```

**步骤5: 启动前端**
```bash
# 新终端
cd frontend
npm install
npm run dev
# 前端运行在 http://localhost:3003
```

**步骤6: 登录系统**
```
访问: http://localhost:3003
用户名: admin
密码: admin123
```

### 3.3 验证安装

**测试后端:**
```bash
curl http://localhost:4004/health
# 预期返回: {"status":"ok","time":"..."}
```

**测试数据库:**
```bash
psql -U kanban_user -d kanban_db -c "SELECT COUNT(*) FROM users;"
# 预期返回至少1条(admin账户)
```

**测试前端:**
```
打开浏览器访问 http://localhost:3003
应该看到登录页面
```

---

## 4. 数据库设计

### 4.1 核心表关系

```
用户表 (users)
部门表 (departments)
项目类型表 (project_types)
                ↓
        项目表 (projects) ← 引用表(全局属性)
                ↓
        迭代表 (sprints)
                ↓
    sprint_projects ← 快照表(迭代特定状态)
                ↓
        stories ← 引用表(全局属性)
                ↓
    sprint_stories ← 快照表(迭代特定状态)
                ↓
        tasks ← 引用表(全局属性)
                ↓
    sprint_tasks ← 快照表(迭代特定状态)
```

### 4.2 完整表结构

#### 用户表 (users)
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    user_name VARCHAR(50) UNIQUE NOT NULL,      -- 登录用户名
    display_name VARCHAR(100) NOT NULL,         -- 显示名称
    password_hash TEXT NOT NULL,                -- bcrypt加密密码
    role VARCHAR(20) DEFAULT 'developer',       -- admin/developer/external
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 初始admin账户
INSERT INTO users (user_name, display_name, password_hash, role)
VALUES ('admin', '管理员', '$2b$10$...', 'admin');
```

#### 部门表 (departments)
```sql
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 项目类型表 (project_types)
```sql
CREATE TABLE project_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 项目表 (projects) - 引用表
```sql
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    software_name VARCHAR(255) UNIQUE NOT NULL,    -- 项目名称
    department_id INT REFERENCES departments(id),
    type_id INT REFERENCES project_types(id),
    source VARCHAR(255),                           -- 需求来源(v3.1新增)
    priority VARCHAR(50) DEFAULT '中',
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引优化
CREATE INDEX idx_projects_dept ON projects(department_id);
CREATE INDEX idx_projects_type ON projects(type_id);
```

#### 迭代表 (sprints)
```sql
CREATE TABLE sprints (
    id SERIAL PRIMARY KEY,
    sprint_number VARCHAR(50) UNIQUE NOT NULL,     -- 例如: "2025-01"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'planned',          -- planned/current/archived
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CHECK (end_date >= start_date)
);

-- 特殊Backlog迭代
INSERT INTO sprints (id, sprint_number, start_date, end_date, status)
VALUES (-1, 'Backlog', '2000-01-01', '2099-12-31', 'planned');
```

#### 迭代-项目关联表 (sprint_projects) - 快照表
```sql
CREATE TABLE sprint_projects (
    id SERIAL PRIMARY KEY,
    sprint_id INT REFERENCES sprints(id) ON DELETE CASCADE,
    project_id INT REFERENCES projects(id) ON DELETE CASCADE,
    priority INT DEFAULT 1,                        -- 快照字段: 优先级
    notes TEXT,                                    -- 快照字段: 备注
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(sprint_id, project_id)                  -- 防止重复添加
);
```

#### Story表 (stories) - 引用表
```sql
CREATE TABLE stories (
    id SERIAL PRIMARY KEY,
    project_id INT REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,                   -- 引用字段: 标题
    description TEXT,                              -- 引用字段: 描述
    planned_start_date DATE,                       -- 引用字段: 计划开始
    planned_completion_date DATE,                  -- 引用字段: 计划结束
    is_critical BOOLEAN DEFAULT false,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stories_project ON stories(project_id);
```

#### 迭代-Story关联表 (sprint_stories) - 快照表
```sql
CREATE TABLE sprint_stories (
    id SERIAL PRIMARY KEY,
    sprint_id INT REFERENCES sprints(id) ON DELETE CASCADE,
    story_id INT REFERENCES stories(id) ON DELETE CASCADE,
    project_id INT REFERENCES projects(id) ON DELETE CASCADE,

    -- 快照字段(迭代特定状态)
    status VARCHAR(20) DEFAULT 'not_started',      -- not_started/in_progress/completed
    progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    assigned_to INT REFERENCES users(id),          -- 负责人
    notes TEXT,                                    -- 备注
    risk_and_countermeasure TEXT,                  -- 风险及对策

    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(sprint_id, story_id)                    -- 防止重复添加
);

CREATE INDEX idx_sprint_stories_sprint ON sprint_stories(sprint_id);
CREATE INDEX idx_sprint_stories_story ON sprint_stories(story_id);
CREATE INDEX idx_sprint_stories_assigned ON sprint_stories(assigned_to);
```

#### Task表 (tasks) - 引用表
```sql
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    project_id INT REFERENCES projects(id) ON DELETE CASCADE,
    story_id INT REFERENCES stories(id) ON DELETE CASCADE,
    title VARCHAR(500),                            -- 引用字段: 标题
    description TEXT NOT NULL,                     -- 引用字段: 描述(主要)
    priority VARCHAR(10) DEFAULT '中',             -- 高/中/低
    size VARCHAR(20),                              -- Small/Medium/Large
    estimated_hours DECIMAL(5,2),                  -- 预估工时
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_story ON tasks(story_id);
```

#### 迭代-Task关联表 (sprint_tasks) - 快照表
```sql
CREATE TABLE sprint_tasks (
    id SERIAL PRIMARY KEY,
    sprint_id INT REFERENCES sprints(id) ON DELETE CASCADE,
    task_id INT REFERENCES tasks(id) ON DELETE CASCADE,
    story_id INT REFERENCES stories(id) ON DELETE SET NULL,
    project_id INT REFERENCES projects(id) ON DELETE CASCADE,

    -- 快照字段(迭代特定状态)
    status VARCHAR(20) DEFAULT 'not_started',      -- not_started/in_progress/completed
    progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    assigned_to INT REFERENCES users(id),          -- 负责人
    risk_and_countermeasure TEXT,                  -- 风险及对策
    display_order INT DEFAULT 0,                   -- 显示顺序

    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(sprint_id, task_id)                     -- 防止重复添加
);

CREATE INDEX idx_sprint_tasks_sprint ON sprint_tasks(sprint_id);
CREATE INDEX idx_sprint_tasks_task ON sprint_tasks(task_id);
CREATE INDEX idx_sprint_tasks_story ON sprint_tasks(story_id);
CREATE INDEX idx_sprint_tasks_assigned ON sprint_tasks(assigned_to);
```

### 4.3 数据库迁移管理

**迁移文件位置:** `/backend/migrations/`

**命名规范:** `XXX_description.sql` (例: `001_initial_schema.sql`)

**应用迁移:**
```bash
cd backend
npm run migrate:up     # 应用所有未执行的迁移
npm run migrate:down   # 回滚最后一次迁移
```

**手动执行迁移:**
```bash
psql -U kanban_user -d kanban_db -f migrations/001_initial_schema.sql
```

---

## 5. 权限系统

### 5.1 角色定义

系统支持3种用户角色，权限递进:

| 角色 | 代码 | 权限范围 | 使用场景 |
|------|------|---------|---------|
| **管理员** | `admin` | 完全控制 | 部门经理、项目经理 |
| **开发者** | `developer` | 读写数据 | 开发人员、测试人员 |
| **外部成员** | `external` | 只读 | 客户、外部顾问 |

### 5.2 权限清单

#### 核心权限枚举
```typescript
export enum Permission {
    // 用户管理
    VIEW_USERS = 'view_users',
    CREATE_USER = 'create_user',
    EDIT_USER = 'edit_user',
    DELETE_USER = 'delete_user',

    // 项目管理
    VIEW_PROJECTS = 'view_projects',
    CREATE_PROJECT = 'create_project',
    EDIT_PROJECT = 'edit_project',
    DELETE_PROJECT = 'delete_project',

    // Story管理
    VIEW_STORIES = 'view_stories',
    CREATE_STORY = 'create_story',
    EDIT_STORY = 'edit_story',
    DELETE_STORY = 'delete_story',

    // Task管理
    VIEW_TASKS = 'view_tasks',
    CREATE_TASK = 'create_task',
    EDIT_TASK = 'edit_task',
    DELETE_TASK = 'delete_task',
    UPDATE_TASK_STATUS = 'update_task_status',

    // Sprint管理
    VIEW_SPRINTS = 'view_sprints',
    CREATE_SPRINT = 'create_sprint',
    EDIT_SPRINT = 'edit_sprint',
    DELETE_SPRINT = 'delete_sprint',
    ACTIVATE_SPRINT = 'activate_sprint',

    // 报表管理
    EXPORT_SUMMARY_REPORT = 'export_summary_report',
    EXPORT_PERSONAL_REPORT = 'export_personal_report',

    // 设置管理
    VIEW_SETTINGS = 'view_settings',
    EDIT_SETTINGS = 'edit_settings'
}
```

#### 角色-权限映射
```typescript
const rolePermissions: Record<UserRole, Permission[]> = {
    admin: [
        // 拥有所有权限
        Permission.VIEW_USERS,
        Permission.CREATE_USER,
        Permission.EDIT_USER,
        Permission.DELETE_USER,
        Permission.VIEW_PROJECTS,
        Permission.CREATE_PROJECT,
        Permission.EDIT_PROJECT,
        Permission.DELETE_PROJECT,
        Permission.VIEW_STORIES,
        Permission.CREATE_STORY,
        Permission.EDIT_STORY,
        Permission.DELETE_STORY,
        Permission.VIEW_TASKS,
        Permission.CREATE_TASK,
        Permission.EDIT_TASK,
        Permission.DELETE_TASK,
        Permission.UPDATE_TASK_STATUS,
        Permission.VIEW_SPRINTS,
        Permission.CREATE_SPRINT,
        Permission.EDIT_SPRINT,
        Permission.DELETE_SPRINT,
        Permission.ACTIVATE_SPRINT,
        Permission.EXPORT_SUMMARY_REPORT,
        Permission.EXPORT_PERSONAL_REPORT,
        Permission.VIEW_SETTINGS,
        Permission.EDIT_SETTINGS
    ],

    developer: [
        Permission.VIEW_USERS,
        Permission.VIEW_PROJECTS,
        Permission.VIEW_STORIES,
        Permission.CREATE_STORY,
        Permission.EDIT_STORY,
        Permission.VIEW_TASKS,
        Permission.CREATE_TASK,
        Permission.EDIT_TASK,
        Permission.UPDATE_TASK_STATUS,
        Permission.VIEW_SPRINTS,
        Permission.EXPORT_PERSONAL_REPORT,
        Permission.VIEW_SETTINGS
    ],

    external: [
        Permission.VIEW_USERS,
        Permission.VIEW_PROJECTS,
        Permission.VIEW_STORIES,
        Permission.VIEW_TASKS,
        Permission.VIEW_SPRINTS
    ]
};
```

### 5.3 后端权限中间件

**文件:** `/backend/src/middleware/permissions.ts`

```typescript
// 1. 要求用户已登录
export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const user = (req.session as any)?.user;
    if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    next();
}

// 2. 要求特定权限
export function requirePermission(...permissions: Permission[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req.session as any)?.user;
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const userPermissions = rolePermissions[user.role as UserRole] || [];
        const hasPermission = permissions.some(p => userPermissions.includes(p));

        if (!hasPermission) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        next();
    };
}

// 3. 阻止外部用户
export function blockExternal(req: Request, res: Response, next: NextFunction) {
    const user = (req.session as any)?.user;
    if (user.role === UserRole.EXTERNAL) {
        return res.status(403).json({ message: 'Forbidden' });
    }
    next();
}
```

**使用示例:**
```typescript
// backend/src/routes/users.ts
import { requireAuth, requirePermission, Permission } from '../middleware/permissions';

// 所有登录用户可查看
router.get('/', requireAuth, async (req, res) => {
    // ...
});

// 仅管理员可创建
router.post('/', requirePermission(Permission.CREATE_USER), async (req, res) => {
    // ...
});

// 仅管理员可编辑
router.put('/:id', requirePermission(Permission.EDIT_USER), async (req, res) => {
    // ...
});
```

### 5.4 前端权限Hook

**文件:** `/frontend/src/hooks/usePermissions.ts`

```typescript
export function usePermissions() {
    const { user, loading } = useCurrentUser();

    // 检查单个权限
    const hasPermission = (permission: Permission): boolean => {
        if (!user) return false;
        const permissions = rolePermissions[user.role] || [];
        return permissions.includes(permission);
    };

    // 角色检查
    const isAdmin = (): boolean => user?.role === UserRole.ADMIN;
    const isDeveloper = (): boolean => user?.role === UserRole.DEVELOPER;
    const isExternal = (): boolean => user?.role === UserRole.EXTERNAL;
    const canEdit = (): boolean => user?.role !== UserRole.EXTERNAL;

    return {
        user,
        loading,
        hasPermission,
        isAdmin,
        isDeveloper,
        isExternal,
        canEdit
    };
}
```

**使用示例:**
```tsx
import { usePermissions, Permission } from '@/hooks/usePermissions';

function UsersPage() {
    const { hasPermission } = usePermissions();

    return (
        <div>
            {hasPermission(Permission.CREATE_USER) && (
                <Button onClick={handleCreate}>添加用户</Button>
            )}
        </div>
    );
}
```

---

## 6. API设计

### 6.1 认证API

**登录**
```http
POST /api/auth/login
Content-Type: application/json

{
    "username": "admin",
    "password": "admin123"
}

Response 200:
{
    "message": "Login successful",
    "user": {
        "id": 1,
        "userName": "admin",
        "displayName": "管理员",
        "role": "admin"
    }
}
```

**获取当前用户**
```http
GET /api/auth/me
Cookie: connect.sid=...

Response 200:
{
    "user": {
        "id": 1,
        "displayName": "管理员",
        "role": "admin"
    }
}
```

**登出**
```http
POST /api/auth/logout

Response 200:
{
    "message": "Logged out"
}
```

### 6.2 用户管理API

**列出用户**
```http
GET /api/users
权限: requireAuth

Response 200:
[
    {
        "id": 1,
        "user_name": "admin",
        "display_name": "管理员",
        "role": "admin",
        "created_at": "2025-12-30T10:00:00Z"
    }
]
```

**创建用户**
```http
POST /api/users
权限: requirePermission(CREATE_USER)
Content-Type: application/json

{
    "user_name": "zhangsan",
    "display_name": "张三",
    "password": "password123",
    "role": "developer"
}

Response 201:
{
    "id": 2,
    "user_name": "zhangsan",
    "display_name": "张三",
    "role": "developer"
}
```

**更新用户**
```http
PUT /api/users/:id
权限: requirePermission(EDIT_USER)
Content-Type: application/json

{
    "display_name": "张三(更新)",
    "role": "admin",
    "password": "newpassword123"  // 可选
}

Response 200:
{
    "id": 2,
    "user_name": "zhangsan",
    "display_name": "张三(更新)",
    "role": "admin"
}
```

**删除用户**
```http
DELETE /api/users/:id
权限: requirePermission(DELETE_USER)

Response 200:
{
    "message": "User deleted"
}
```

### 6.3 Sprint管理API

**列出Sprint**
```http
GET /api/sprints
权限: requireAuth

Response 200:
[
    {
        "id": 12,
        "name": "2025-01",           // sprint_number映射为name
        "sprint_number": "2025-01",
        "start_date": "2025-01-06",
        "end_date": "2025-01-12",
        "status": "active",          // DB的current映射为active
        "created_at": "2025-01-01T10:00:00Z"
    }
]
```

**创建Sprint**
```http
POST /api/sprints
权限: requirePermission(CREATE_SPRINT)
Content-Type: application/json

{
    "name": "2025-02",
    "start_date": "2025-01-13",
    "end_date": "2025-01-19",
    "projectIds": [1, 2, 3]        // 可选，同时添加项目
}

Response 201:
{
    "id": 13,
    "name": "2025-02",
    "sprint_number": "2025-02",
    "start_date": "2025-01-13",
    "end_date": "2025-01-19",
    "status": "planning"
}
```

**更新Sprint**
```http
PUT /api/sprints/:id
权限: requirePermission(EDIT_SPRINT)
Content-Type: application/json

{
    "name": "2025-02-v2",
    "start_date": "2025-01-13",
    "end_date": "2025-01-19",
    "status": "active"
}

Response 200:
{
    "id": 13,
    "name": "2025-02-v2",
    "status": "active"
}
```

**激活Sprint**
```http
POST /api/sprints/:id/activate
权限: requirePermission(ACTIVATE_SPRINT)

功能: 将目标Sprint设为current，其他current的Sprint自动归档

Response 200:
{
    "id": 13,
    "name": "2025-02",
    "status": "active"
}
```

**关闭Sprint**
```http
POST /api/sprints/:id/close
权限: requirePermission(ACTIVATE_SPRINT)

Response 200:
{
    "id": 13,
    "name": "2025-02",
    "status": "closed"
}
```

### 6.4 工作台API (核心)

**获取Sprint的项目列表**
```http
GET /api/workbench/sprint/:sprintId/projects
权限: requireAuth

Response 200:
[
    {
        "id": 1,
        "software_name": "用户管理系统",
        "department_id": 1,
        "type_id": 1,
        "source": "产品部-张经理",
        "priority": "高"
    }
]
```

**获取看板数据(Story + Task)**
```http
GET /api/workbench/board?sprintId=12&projectId=1&memberId=5
权限: requireAuth

说明:
- sprintId: 必填
- projectId: 必填
- memberId: 可选，0表示全部成员

Response 200:
{
    "stories": [
        {
            "id": 10,
            "project_id": 1,
            "title": "用户认证功能",         // 来自stories表
            "description": "实现登录注册",    // 来自stories表
            "status": "in_progress",          // 来自sprint_stories表
            "progress": 60,                   // 来自sprint_stories表
            "assigned_to": 5,                 // 来自sprint_stories表
            "assigned_to_user": {
                "id": 5,
                "display_name": "张三"
            },
            "snapshot_id": 100,               // sprint_stories.id
            "task_count": 3
        }
    ],
    "tasks": [
        {
            "id": 50,
            "story_id": 10,
            "project_id": 1,
            "title": "前端开发",              // 来自tasks表
            "description": "登录界面UI",      // 来自tasks表
            "status": "in_progress",          // 来自sprint_tasks表
            "progress": 70,                   // 来自sprint_tasks表
            "assigned_to": 5,                 // 来自sprint_tasks表
            "assigned_to_user": {
                "id": 5,
                "display_name": "张三"
            },
            "priority": "高",
            "snapshot_id": 200                // sprint_tasks.id
        }
    ],
    "members": [...]
}
```

**更新Task状态(拖拽)**
```http
POST /api/workbench/task/status
权限: requireAuth + blockExternal
Content-Type: application/json

{
    "sprintId": 12,
    "taskId": 50,
    "status": "completed",
    "storyId": 10,
    "projectId": 1
}

功能: UPSERT sprint_tasks记录(不存在则创建，存在则更新)

Response 200:
{
    "message": "Task status updated"
}
```

**更新Story状态**
```http
POST /api/workbench/story/status
权限: requireAuth + blockExternal
Content-Type: application/json

{
    "sprintId": 12,
    "storyId": 10,
    "status": "completed",
    "projectId": 1
}

Response 200:
{
    "message": "Story status updated"
}
```

**更新Task详细信息**
```http
POST /api/workbench/task/update
权限: requireAuth + blockExternal
Content-Type: application/json

{
    "id": 50,
    "taskId": 50,
    "sprintId": 12,
    "title": "前端开发(更新)",
    "description": "登录界面UI(更新)",
    "status": "completed",
    "priority": "高",
    "estimatedHours": 8,
    "assignedTo": 5,
    "progress": 100,
    "risk_and_countermeasure": "无风险",
    "planned_completion_date": "2025-01-15"
}

功能:
1. 更新tasks表(引用字段)
2. 更新sprint_tasks表(快照字段)

Response 200:
{
    "message": "Task updated"
}
```

**更新Story详细信息**
```http
POST /api/workbench/story/update
权限: requireAuth + blockExternal
Content-Type: application/json

{
    "storyId": 10,
    "sprintId": 12,
    "title": "用户认证功能(更新)",
    "description": "实现登录注册(更新)",
    "status": "completed",
    "progress": 100,
    "assigned_to": 5,
    "notes": "已完成",
    "risk_and_countermeasure": "无风险",
    "planned_start_date": "2025-01-06",
    "planned_completion_date": "2025-01-12",
    "is_critical": true
}

功能:
1. 更新stories表(引用字段)
2. 更新sprint_stories表(快照字段)

Response 200:
{
    "message": "Story updated"
}
```

**分配Task负责人**
```http
POST /api/workbench/task/assign
权限: requireAuth + blockExternal
Content-Type: application/json

{
    "sprintId": 12,
    "taskId": 50,
    "assignedTo": 5,      // 用户ID，null表示未分配
    "storyId": 10,
    "projectId": 1
}

Response 200:
{
    "message": "Task assigned"
}
```

**Task排序(拖拽排序)**
```http
POST /api/workbench/tasks/reorder
权限: requireAuth + blockExternal
Content-Type: application/json

{
    "sprintId": 12,
    "storyId": 10,
    "orders": [
        { "id": 50, "order": 1 },
        { "id": 51, "order": 2 },
        { "id": 52, "order": 3 }
    ]
}

Response 200:
{
    "message": "Tasks reordered"
}
```

**创建新Story**
```http
POST /api/workbench/story/create
权限: requireAuth + blockExternal
Content-Type: application/json

{
    "projectId": 1,
    "sprintId": 12,
    "title": "数据导出功能",
    "description": "支持Excel和PDF导出",
    "plannedStartDate": "2025-01-13",
    "plannedCompletionDate": "2025-01-19",
    "isCritical": false,
    "assignedTo": 5
}

功能:
1. INSERT INTO stories (引用表)
2. INSERT INTO sprint_stories (快照表)

Response 201:
{
    "storyId": 11,
    "snapshotId": 101
}
```

**创建新Task**
```http
POST /api/workbench/task/create
权限: requireAuth + blockExternal
Content-Type: application/json

{
    "projectId": 1,
    "sprintId": 12,
    "storyId": 10,
    "title": "后端开发",
    "description": "API接口开发",
    "priority": "高",
    "size": "Medium",
    "estimatedHours": 16,
    "assignedTo": 5
}

功能:
1. INSERT INTO tasks (引用表)
2. INSERT INTO sprint_tasks (快照表)

Response 201:
{
    "taskId": 53,
    "snapshotId": 203
}
```

**复用Story(将已存在的Story添加到当前Sprint)**
```http
POST /api/workbench/story/reuse
权限: requireAuth + blockExternal
Content-Type: application/json

{
    "sprintId": 12,
    "storyIds": [5, 6, 7],
    "projectId": 1
}

功能:
- 不创建新Story
- 只创建sprint_stories记录(快照)
- 状态重置为not_started，进度为0

Response 201:
{
    "added": 3,
    "skipped": 0
}
```

**复用Task**
```http
POST /api/workbench/task/reuse
权限: requireAuth + blockExternal
Content-Type: application/json

{
    "sprintId": 12,
    "taskIds": [20, 21, 22],
    "storyId": 10,
    "projectId": 1
}

Response 201:
{
    "added": 3,
    "skipped": 0
}
```

### 6.5 Dashboard API

**获取仪表板统计数据**
```http
GET /api/dashboard/stats
权限: requireAuth

Response 200:
{
    "overview": {
        "totalProjects": 12,
        "totalStories": 45,
        "totalTasks": 127,
        "activeSprints": 1,
        "storyCompletionRate": 67,
        "taskCompletionRate": 54
    },
    "taskDistribution": {
        "not_started": 25,
        "in_progress": 15,
        "completed": 87
    },
    "weeklyProgress": [
        {
            "week": "2025-01",
            "startDate": "2025-01-06",
            "endDate": "2025-01-12",
            "completedStories": 8,
            "totalStories": 10,
            "completedTasks": 25,
            "totalTasks": 30,
            "completionRate": 83
        }
    ],
    "myTasks": {
        "total": 15,
        "not_started": 3,
        "in_progress": 7,
        "completed": 5
    },
    "recentActivity": [
        {
            "type": "task",
            "id": 156,
            "title": "完成登录功能",
            "status": "completed",
            "updatedAt": "2025-12-30T10:30:00Z",
            "updatedBy": "张三",
            "projectName": "用户管理系统",
            "storyTitle": "用户认证"
        }
    ],
    "teamPerformance": [
        {
            "userId": 5,
            "userName": "张三",
            "completedTasks": 12,
            "totalTasks": 15,
            "completionRate": 80,
            "avgProgress": 85
        }
    ],
    "projectStatus": [
        {
            "projectId": 1,
            "projectName": "用户管理系统",
            "totalStories": 5,
            "completedStories": 3,
            "totalTasks": 15,
            "completedTasks": 10,
            "completionRate": 67
        }
    ],
    "currentSprintId": 12
}
```

### 6.6 Excel导出API

**导出周报**
```http
POST /api/reports/export
权限:
- 汇总周报: requirePermission(EXPORT_SUMMARY_REPORT)
- 个人周报: requirePermission(EXPORT_PERSONAL_REPORT)
Content-Type: application/json

{
    "sprintId": 12,
    "userId": 5,              // 个人周报必填
    "reportType": "personal"  // "summary" | "personal"
}

Response 200:
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="周报_2025-01_张三.xlsx"

[Excel Binary Data]
```

**Excel报表结构:**
| 列名 | 数据来源 |
|------|---------|
| 软件名称 | projects.software_name |
| 需求来源 | projects.source |
| 需求内容 | stories.title |
| 上周总结 | (空白，手动填写) |
| 本周任务 | tasks.title (当前Sprint) |
| 本周进展 | sprint_tasks.status + progress |
| 本周耗时 | sprint_tasks.estimated_hours |
| 风险及对策 | sprint_tasks.risk_and_countermeasure |
| 下周计划 | tasks.title (下一个Sprint) |
| 完成率 | (已完成Story数/总Story数)*100 |
| 负责人 | users.display_name |

---

## 7. 前端架构

### 7.1 路由结构

```tsx
// src/App.tsx
<Routes>
    <Route path="/login" element={<Login />} />

    <Route element={<DashboardLayout />}>  {/* 带侧边栏的布局 */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/workbench" element={<Workbench />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/sprints" element={<SprintsPage />} />
        <Route path="/users" element={<UsersPage />} />
    </Route>
</Routes>
```

### 7.2 核心组件

**工作台 (Workbench)**
```
Workbench.tsx
├── 顶部: Sprint选择器、项目选择器、成员过滤器、视图切换
├── 左侧: ProjectSidebar (项目列表)
└── 右侧:
    ├── KanbanBoard (看板视图)
    │   ├── Story行
    │   │   └── 3列: 未开始 | 进行中 | 已完成
    │   │       └── TaskCard (可拖拽)
    └── ListView (列表视图)
        └── ListViewStoryRow
            ├── Story信息 (可折叠)
            └── TaskRow[] (可拖拽排序)
```

**看板视图 - 拖拽逻辑**
```tsx
import { DndContext, DragEndEvent } from '@dnd-kit/core';

function KanbanBoard() {
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        // active.id = taskId
        // over.id = "storyId::status" (例: "10::completed")

        const [storyId, newStatus] = over.id.split('::');

        // 更新UI(乐观更新)
        setTasks(prev => prev.map(t =>
            t.id === active.id ? { ...t, status: newStatus } : t
        ));

        // 调用API
        await fetch('/api/workbench/task/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sprintId,
                taskId: active.id,
                status: newStatus,
                storyId,
                projectId
            })
        });
    };

    return (
        <DndContext onDragEnd={handleDragEnd}>
            {/* 看板列和卡片 */}
        </DndContext>
    );
}
```

**列表视图 - 内联编辑**
```tsx
function TaskRow({ task }: { task: Task }) {
    const handleStatusChange = async (newStatus: string) => {
        await fetch('/api/workbench/task/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sprintId,
                taskId: task.id,
                status: newStatus,
                storyId: task.story_id,
                projectId
            })
        });

        // 刷新数据
        onDataChange();
    };

    return (
        <TableRow>
            <TableCell>
                <Select value={task.status} onValueChange={handleStatusChange}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="not_started">未开始</SelectItem>
                        <SelectItem value="in_progress">进行中</SelectItem>
                        <SelectItem value="completed">已完成</SelectItem>
                    </SelectContent>
                </Select>
            </TableCell>
        </TableRow>
    );
}
```

### 7.3 状态管理

**使用React hooks + Context**

```tsx
// 工作台状态管理示例
const [sprints, setSprints] = useState<Sprint[]>([]);
const [selectedSprintId, setSelectedSprintId] = useState<string>('');
const [projects, setProjects] = useState<Project[]>([]);
const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
const [stories, setStories] = useState<Story[]>([]);
const [tasks, setTasks] = useState<Task[]>([]);

// 获取数据
useEffect(() => {
    if (selectedSprintId && selectedProjectId) {
        fetch(`/api/workbench/board?sprintId=${selectedSprintId}&projectId=${selectedProjectId}`)
            .then(res => res.json())
            .then(data => {
                setStories(data.stories);
                setTasks(data.tasks);
            });
    }
}, [selectedSprintId, selectedProjectId]);
```

### 7.4 类型定义

**文件:** `/frontend/src/types/index.ts`

```typescript
export interface User {
    id: number;
    user_name: string;
    display_name: string;
    role: 'admin' | 'developer' | 'external';
    created_at: string;
}

export interface Sprint {
    id: number;
    name: string;                    // UI显示名(实际是sprint_number)
    sprint_number: string;
    start_date: string;
    end_date: string;
    status: 'planning' | 'active' | 'closed';  // UI状态(DB是planned/current/archived)
}

export interface Project {
    id: number;
    software_name: string;
    department_id: number;
    type_id: number;
    source?: string;
    priority: string;
    created_at: string;
}

export interface Story {
    id: number;
    project_id: number;
    title: string;
    description: string;
    planned_start_date?: string;
    planned_completion_date?: string;
    is_critical: boolean;

    // 快照字段
    status: 'not_started' | 'in_progress' | 'completed';
    progress: number;
    assigned_to?: number;
    assigned_to_user?: {
        id: number;
        display_name: string;
    };
    snapshot_id: number;              // sprint_stories.id
    task_count: number;
}

export interface Task {
    id: number;
    story_id?: number;
    project_id: number;
    title?: string;
    description: string;
    priority: string;
    size?: string;
    estimated_hours?: number;

    // 快照字段
    status: 'not_started' | 'in_progress' | 'completed';
    progress: number;
    assigned_to?: number;
    assigned_to_user?: {
        id: number;
        display_name: string;
    };
    risk_and_countermeasure?: string;
    display_order: number;
    snapshot_id: number;              // sprint_tasks.id
}
```

---

## 8. 核心功能实现

### 8.1 流转模型 - Story/Task复用

**场景:** 将已存在的Story从Backlog添加到新Sprint

**前端流程:**
```tsx
// 1. 搜索可添加的Story
const [availableStories, setAvailableStories] = useState<Story[]>([]);

const fetchAvailableStories = async () => {
    const res = await fetch(`/api/workbench/stories/available?projectId=${projectId}&sprintId=${sprintId}`);
    const stories = await res.json();
    setAvailableStories(stories);
};

// 2. 用户选择Story
const [selectedStoryIds, setSelectedStoryIds] = useState<number[]>([]);

// 3. 调用复用API
const handleReuseStories = async () => {
    await fetch('/api/workbench/story/reuse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sprintId,
            storyIds: selectedStoryIds,
            projectId
        })
    });

    // 刷新看板
    fetchBoardData();
};
```

**后端实现:**
```typescript
// backend/src/routes/workbench.ts
router.post('/story/reuse', requireAuth, blockExternal, async (req, res) => {
    const { sprintId, storyIds, projectId } = req.body;

    let added = 0;
    let skipped = 0;

    for (const storyId of storyIds) {
        // 检查是否已存在
        const existing = await pool.query(
            'SELECT id FROM sprint_stories WHERE sprint_id = $1 AND story_id = $2',
            [sprintId, storyId]
        );

        if (existing.rows.length > 0) {
            skipped++;
            continue;
        }

        // 创建快照(不创建新Story)
        await pool.query(
            `INSERT INTO sprint_stories
             (sprint_id, story_id, project_id, status, progress)
             VALUES ($1, $2, $3, 'not_started', 0)`,
            [sprintId, storyId, projectId]
        );

        added++;
    }

    res.json({ added, skipped });
});
```

**SQL查询可添加的Story:**
```sql
-- 查询projectId=1且不在sprintId=12的所有Story
SELECT s.*
FROM stories s
WHERE s.project_id = 1
  AND s.id NOT IN (
      SELECT story_id
      FROM sprint_stories
      WHERE sprint_id = 12
  )
ORDER BY s.created_at DESC;
```

### 8.2 双表更新 - 引用字段 vs 快照字段

**场景:** 用户在Story详情中编辑信息

**逻辑判断:**
- `title`, `description`, `planned_date` → 更新 `stories` 表(影响所有迭代)
- `status`, `progress`, `assigned_to` → 更新 `sprint_stories` 表(只影响当前迭代)

**后端实现:**
```typescript
router.post('/story/update', requireAuth, blockExternal, async (req, res) => {
    const {
        storyId,
        sprintId,
        title,                      // 引用字段
        description,                // 引用字段
        planned_completion_date,    // 引用字段
        status,                     // 快照字段
        progress,                   // 快照字段
        assigned_to                 // 快照字段
    } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. 更新引用表(全局属性)
        await client.query(
            `UPDATE stories
             SET title = $1, description = $2, planned_completion_date = $3, updated_at = NOW()
             WHERE id = $4`,
            [title, description, planned_completion_date, storyId]
        );

        // 2. 更新快照表(迭代特定状态)
        await client.query(
            `UPDATE sprint_stories
             SET status = $1, progress = $2, assigned_to = $3, updated_at = NOW()
             WHERE sprint_id = $4 AND story_id = $5`,
            [status, progress, assigned_to, sprintId, storyId]
        );

        await client.query('COMMIT');
        res.json({ message: 'Story updated' });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ message: 'Error updating story' });
    } finally {
        client.release();
    }
});
```

### 8.3 Sprint状态映射

**问题:** UI使用的状态值与数据库不同

**映射关系:**
| UI状态 | 数据库状态 |
|--------|-----------|
| `planning` | `planned` |
| `active` | `current` |
| `closed` | `archived` |

**后端实现:**
```typescript
// backend/src/routes/sprints.ts
const toDbStatus = (status: string) => {
    switch (status) {
        case 'active': return 'current';
        case 'closed': return 'archived';
        default: return 'planned';
    }
};

const toUiStatus = (status: string) => {
    switch (status) {
        case 'current': return 'active';
        case 'archived': return 'closed';
        default: return 'planning';
    }
};

// 查询时转换
router.get('/', requireAuth, async (req, res) => {
    const result = await pool.query('SELECT * FROM sprints ORDER BY start_date DESC');
    const sprints = result.rows.map(row => ({
        ...row,
        name: row.sprint_number,
        status: toUiStatus(row.status)
    }));
    res.json(sprints);
});

// 更新时转换
router.put('/:id', requirePermission(Permission.EDIT_SPRINT), async (req, res) => {
    const { status } = req.body;
    await pool.query(
        'UPDATE sprints SET status = $1 WHERE id = $2',
        [toDbStatus(status), id]
    );
});
```

### 8.4 Backlog特殊处理

**Backlog迭代:** ID固定为 `-1`

**前端限制:**
```tsx
// SprintsPage.tsx
{sprint.id !== -1 && hasPermission(Permission.EXPORT_SUMMARY_REPORT) && (
    <Button onClick={handleExport}>导出周报</Button>
)}

{sprint.id !== -1 && hasPermission(Permission.ACTIVATE_SPRINT) && (
    <Button onClick={handleActivate}>激活</Button>
)}

{sprint.id !== -1 && hasPermission(Permission.EDIT_SPRINT) && (
    <Button onClick={handleEdit}>编辑</Button>
)}

{sprint.id !== -1 && hasPermission(Permission.DELETE_SPRINT) && (
    <Button onClick={handleDelete}>删除</Button>
)}
```

**后端保护:**
```typescript
// 删除时检查
router.delete('/:id', requirePermission(Permission.DELETE_SPRINT), async (req, res) => {
    const { id } = req.params;

    if (parseInt(id) === -1) {
        return res.status(400).json({ message: 'Cannot delete Backlog sprint' });
    }

    await pool.query('DELETE FROM sprints WHERE id = $1', [id]);
    res.json({ message: 'Deleted' });
});
```

---

## 9. 部署指南

### 9.1 生产环境要求

```
硬件:
- CPU: 2核+
- 内存: 4GB+
- 硬盘: 20GB+

软件:
- Ubuntu 20.04+ / CentOS 7+
- Docker 20+ (推荐) 或 Node.js 20+ + PostgreSQL 16+
- Nginx (反向代理)
```

### 9.2 使用Docker部署 (推荐)

**步骤1: 准备docker-compose.yml**

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16
    container_name: kanban_postgres
    environment:
      POSTGRES_USER: kanban_user
      POSTGRES_PASSWORD: your_password
      POSTGRES_DB: kanban_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/migrations:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    restart: unless-stopped

  backend:
    build: ./backend
    container_name: kanban_backend
    environment:
      DATABASE_URL: postgresql://kanban_user:your_password@postgres:5432/kanban_db
      SESSION_SECRET: CHANGE_THIS_TO_RANDOM_STRING_IN_PRODUCTION
      NODE_ENV: production
      PORT: 4004
    ports:
      - "4004:4004"
    depends_on:
      - postgres
    restart: unless-stopped

  frontend:
    build: ./frontend
    container_name: kanban_frontend
    ports:
      - "3003:3003"
    depends_on:
      - backend
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    container_name: kanban_nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl  # SSL证书(可选)
    depends_on:
      - frontend
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
```

**步骤2: 准备Dockerfile**

**backend/Dockerfile:**
```dockerfile
FROM node:20-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm install --production

# 复制代码
COPY . .

# 编译TypeScript
RUN npm run build

# 暴露端口
EXPOSE 4004

# 启动命令
CMD ["npm", "start"]
```

**frontend/Dockerfile:**
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm install

# 复制代码
COPY . .

# 构建
RUN npm run build

# 生产镜像
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3003
CMD ["nginx", "-g", "daemon off;"]
```

**frontend/nginx.conf:**
```nginx
server {
    listen 3003;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API代理
    location /api {
        proxy_pass http://backend:4004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**步骤3: 启动服务**

```bash
# 1. 构建并启动
docker-compose up -d --build

# 2. 查看日志
docker-compose logs -f

# 3. 检查状态
docker-compose ps

# 4. 访问应用
http://your-server-ip
```

**步骤4: 初始化数据库**

```bash
# 进入backend容器
docker exec -it kanban_backend sh

# 运行迁移
npm run migrate:up

# 退出
exit
```

**步骤5: Nginx反向代理配置**

**nginx.conf:**
```nginx
upstream frontend {
    server localhost:3003;
}

upstream backend {
    server localhost:4004;
}

server {
    listen 80;
    server_name your-domain.com;

    # 前端
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 后端API
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # SSL配置(可选)
    # listen 443 ssl;
    # ssl_certificate /etc/nginx/ssl/cert.pem;
    # ssl_certificate_key /etc/nginx/ssl/key.pem;
}
```

### 9.3 手动部署(不使用Docker)

**步骤1: 安装PostgreSQL**

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql-16 postgresql-contrib

# CentOS/RHEL
sudo yum install postgresql16-server postgresql16-contrib

# 启动服务
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**步骤2: 创建数据库**

```bash
sudo -u postgres psql

CREATE USER kanban_user WITH PASSWORD 'your_password';
CREATE DATABASE kanban_db OWNER kanban_user;
\q
```

**步骤3: 运行初始化脚本**

```bash
cd /path/to/KanBan
./setup.sh
```

**步骤4: 部署后端**

```bash
cd backend

# 安装依赖
npm install

# 编译TypeScript
npm run build

# 使用PM2启动(生产环境)
npm install -g pm2
pm2 start dist/index.js --name kanban-backend

# 或直接运行
npm start
```

**步骤5: 部署前端**

```bash
cd frontend

# 安装依赖
npm install

# 构建
npm run build

# 将dist目录部署到Nginx
sudo cp -r dist/* /var/www/kanban/
```

**步骤6: 配置Nginx**

```bash
sudo nano /etc/nginx/sites-available/kanban

# 粘贴上面的nginx配置

sudo ln -s /etc/nginx/sites-available/kanban /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 9.4 环境变量配置

**backend/.env (生产环境)**
```bash
# 数据库连接
DATABASE_URL=postgresql://kanban_user:your_password@localhost:5432/kanban_db

# 会话密钥(必须更换为随机字符串)
SESSION_SECRET=your-super-secret-random-key-change-this-in-production

# CORS源(生产域名)
CORS_ORIGIN=https://your-domain.com

# Node环境
NODE_ENV=production

# 服务端口
PORT=4004
```

**生成随机SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 9.5 数据库备份

**自动备份脚本:**

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/kanban"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/kanban_db_$TIMESTAMP.sql"

mkdir -p $BACKUP_DIR

# 备份
pg_dump -U kanban_user -h localhost kanban_db > $BACKUP_FILE

# 压缩
gzip $BACKUP_FILE

# 删除7天前的备份
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE.gz"
```

**设置定时任务:**
```bash
crontab -e

# 每天凌晨2点备份
0 2 * * * /path/to/backup.sh
```

**恢复备份:**
```bash
gunzip kanban_db_20250130_020000.sql.gz
psql -U kanban_user -d kanban_db < kanban_db_20250130_020000.sql
```

### 9.6 监控和日志

**PM2监控:**
```bash
# 查看进程
pm2 list

# 查看日志
pm2 logs kanban-backend

# 查看监控
pm2 monit

# 重启
pm2 restart kanban-backend
```

**Nginx日志:**
```bash
# 访问日志
tail -f /var/log/nginx/access.log

# 错误日志
tail -f /var/log/nginx/error.log
```

**PostgreSQL日志:**
```bash
tail -f /var/log/postgresql/postgresql-16-main.log
```

### 9.7 性能优化

**PostgreSQL优化:**
```sql
-- 添加索引(已在Schema中定义)
CREATE INDEX CONCURRENTLY idx_sprint_stories_sprint ON sprint_stories(sprint_id);
CREATE INDEX CONCURRENTLY idx_sprint_tasks_sprint ON sprint_tasks(sprint_id);
CREATE INDEX CONCURRENTLY idx_sprint_tasks_assigned ON sprint_tasks(assigned_to);

-- 定期VACUUM
VACUUM ANALYZE;

-- 配置优化(postgresql.conf)
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 16MB
maintenance_work_mem = 128MB
```

**Nginx缓存:**
```nginx
# 静态资源缓存
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

---

## 10. 常见问题

### 10.1 数据库连接失败

**问题:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**解决:**
```bash
# 1. 检查PostgreSQL是否运行
sudo systemctl status postgresql

# 2. 检查端口监听
sudo netstat -tunlp | grep 5432

# 3. 检查连接配置
psql -U kanban_user -d kanban_db -h localhost

# 4. 检查pg_hba.conf
sudo nano /etc/postgresql/16/main/pg_hba.conf
# 确保有: host    all    all    127.0.0.1/32    md5
```

### 10.2 权限不足

**问题:** 登录后看不到某些按钮

**排查:**
```typescript
// 1. 检查用户角色
SELECT user_name, role FROM users WHERE id = 1;

// 2. 检查权限映射
// frontend/src/hooks/usePermissions.ts
console.log('User role:', user.role);
console.log('Permissions:', rolePermissions[user.role]);
```

### 10.3 迁移失败

**问题:** `npm run migrate:up` 报错

**解决:**
```bash
# 1. 检查迁移表
psql -U kanban_user -d kanban_db
SELECT * FROM schema_migrations;

# 2. 手动运行迁移
psql -U kanban_user -d kanban_db -f migrations/001_initial_schema.sql

# 3. 重置数据库(慎用)
dropdb kanban_db
createdb kanban_db
./setup.sh
```

### 10.4 Session丢失

**问题:** 刷新页面后需要重新登录

**解决:**
```typescript
// 1. 检查SESSION_SECRET是否设置
console.log(process.env.SESSION_SECRET);

// 2. 检查cookie设置
// backend/src/index.ts
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret_key_change_me',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,        // 开发环境设为false
        sameSite: 'lax',      // 开发环境设为lax
        maxAge: 24 * 60 * 60 * 1000
    }
}));
```

### 10.5 CORS错误

**问题:** `Access to fetch at 'http://localhost:4004/api/...' from origin 'http://localhost:3003' has been blocked by CORS`

**解决:**
```typescript
// backend/src/index.ts
app.use(cors({
    origin: 'http://localhost:3003',  // 开发环境
    // origin: 'https://your-domain.com',  // 生产环境
    credentials: true
}));
```

### 10.6 Excel导出失败

**问题:** Excel文件损坏或无法打开

**排查:**
```typescript
// 1. 检查exceljs版本
npm list exceljs

// 2. 检查响应头
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="..."

// 3. 检查数据格式
console.log('Sprint data:', sprint);
console.log('Tasks:', tasks);
```

### 10.7 拖拽不工作

**问题:** 看板视图无法拖拽Task

**解决:**
```bash
# 1. 检查@dnd-kit安装
npm list @dnd-kit/core @dnd-kit/sortable

# 2. 检查ID格式
console.log('Droppable ID:', dropId);  // 应该是 "storyId::status"
console.log('Draggable ID:', taskId);  // 应该是数字
```

### 10.8 TypeScript导入错误

**问题:** `The requested module does not provide an export named 'X'`

**解决:**
```typescript
// ❌ 错误
import { Task } from "@/types";

// ✅ 正确 (使用import type)
import type { Task } from "@/types";

// 或
import { type Task } from "@/types";
```

**原因:** `tsconfig.json` 中设置了 `verbatimModuleSyntax: true`

---

## 附录

### A. 数据库完整Schema

参见: `/backend/migrations/001_initial_schema.sql`

### B. API完整清单

| 端点 | 方法 | 权限 | 功能 |
|------|------|------|------|
| `/api/auth/login` | POST | 公开 | 登录 |
| `/api/auth/me` | GET | 认证 | 获取当前用户 |
| `/api/auth/logout` | POST | 认证 | 登出 |
| `/api/users` | GET | 认证 | 列出用户 |
| `/api/users` | POST | CREATE_USER | 创建用户 |
| `/api/users/:id` | PUT | EDIT_USER | 更新用户 |
| `/api/users/:id` | DELETE | DELETE_USER | 删除用户 |
| `/api/sprints` | GET | 认证 | 列出Sprint |
| `/api/sprints` | POST | CREATE_SPRINT | 创建Sprint |
| `/api/sprints/:id` | PUT | EDIT_SPRINT | 更新Sprint |
| `/api/sprints/:id` | DELETE | DELETE_SPRINT | 删除Sprint |
| `/api/sprints/:id/activate` | POST | ACTIVATE_SPRINT | 激活Sprint |
| `/api/sprints/:id/close` | POST | ACTIVATE_SPRINT | 关闭Sprint |
| `/api/workbench/sprint/:sprintId/projects` | GET | 认证 | 获取Sprint项目列表 |
| `/api/workbench/board` | GET | 认证 | 获取看板数据 |
| `/api/workbench/task/status` | POST | 认证+非外部 | 更新Task状态 |
| `/api/workbench/story/status` | POST | 认证+非外部 | 更新Story状态 |
| `/api/workbench/task/update` | POST | 认证+非外部 | 更新Task详情 |
| `/api/workbench/story/update` | POST | 认证+非外部 | 更新Story详情 |
| `/api/workbench/task/create` | POST | 认证+非外部 | 创建Task |
| `/api/workbench/story/create` | POST | 认证+非外部 | 创建Story |
| `/api/workbench/task/reuse` | POST | 认证+非外部 | 复用Task |
| `/api/workbench/story/reuse` | POST | 认证+非外部 | 复用Story |
| `/api/workbench/tasks/reorder` | POST | 认证+非外部 | Task排序 |
| `/api/dashboard/stats` | GET | 认证 | 仪表板统计 |
| `/api/reports/export` | POST | EXPORT_* | Excel导出 |

### C. 开发工具推荐

```
IDE:
- VS Code + 扩展:
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features
  - PostgreSQL (cweijan.vscode-postgresql-client2)
  - Docker

数据库管理:
- pgAdmin 4
- DBeaver
- TablePlus

API测试:
- Postman
- Thunder Client (VS Code扩展)
- curl

Git工具:
- GitKraken
- SourceTree
```

### D. 联系方式

```
项目地址: /Users/johnson/Documents/KanBan
文档位置: /Users/johnson/Documents/KanBan/DEVELOPER-GUIDE.md
```

---

**文档结束**

如有问题，请查看日志文件或联系原开发团队。
