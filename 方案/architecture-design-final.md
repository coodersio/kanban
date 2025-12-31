# 周报系统架构设计文档 v3.1

> **文档版本：** 3.1 (流转模型 + RBAC权限系统)
> **创建日期：** 2024-12-29
> **最后更新：** 2025-12-30
> **状态：** 生产环境运行中
> **v3.1新增功能：** 权限管理系统、Dashboard仪表板、Excel导出增强、Projects表source字段
> **详细更新说明：** 参见 [v3.1-updates.md](./v3.1-updates.md)

---

## 📋 目录

1. [概述](#1-概述)
2. [技术栈](#2-技术栈)
3. [核心设计理念](#3-核心设计理念)
4. [数据库架构设计](#4-数据库架构设计)
5. [引用字段 vs 快照字段](#5-引用字段-vs-快照字段)
6. [业务流程与逻辑](#6-业务流程与逻辑)
7. [核心功能设计](#7-核心功能设计)
8. [API 设计](#8-api-设计)
9. [总结](#9-总结)

---

## 1. 概述

### 1.1 业务背景

**传统工作方式的痛点：**
- 每周五手动填写 Excel 周报
- 部门经理手动汇总所有 Excel
- 上百个项目，难以管理和追踪

**系统目标：**
- ✅ 在线协作填写周报
- ✅ 自动汇总导出
- ✅ 便捷的迭代和任务管理
- ✅ 支持快速复用已有 Story/Task

### 1.2 v3.0 核心业务模型

```
简洁的三层架构：
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
项目 (Project)
  └─ 计划 (Story)  ⭐ ID 在迭代间不变（流转）
       └─ 任务 (Task)  ⭐ ID 在迭代间不变（流转）

迭代 (Sprint)
  └─ 通过 sprint_projects 表关联 Project
       └─ 通过 sprint_stories 表关联 Story
            └─ 通过 sprint_tasks 表关联 Task
```

**关键规则：**

| 实体 | ID 策略 | 迭代关系 | 跨迭代机制 |
|------|---------|---------|-----------|
| **项目** | **全局唯一，不变** | 多对多（可在多个迭代） | **通过 sprint_projects 加入迭代** |
| **Story** | **全局唯一，不变** | 多对多（可在多个迭代） | **搜索选择加入新迭代** |
| **Task** | **全局唯一，不变** | 多对多（可在多个迭代） | **搜索选择加入新迭代** |

### 1.3 v3.0 架构特点

**P1. 流转模型（Flow Model）** ⭐
```
Story ID = 1 在所有迭代中都是 1
  ↓
通过搜索选择，添加到 sprint_stories（新迭代）
  ↓
优势：ID 稳定 + 跨迭代追踪简单 + 数据一致性强
```

**P2. 双表设计模式**

| 表类型 | 用途 | 示例 | 字段类型 |
|--------|------|------|---------|
| **引用表** | 存储实体全局属性 | `stories`, `tasks` | title, description, planned_date |
| **快照表** | 存储迭代特定状态 | `sprint_stories`, `sprint_tasks` | status, progress |

---

## 2. 技术栈

### 2.1 前端技术

| 技术 | 版本 | 用途 |
|------|------|------|
| **React** | 18.x | UI 框架，构建交互式用户界面 |
| **TypeScript** | 5.x | 类型安全，提升代码质量 |
| **React** | 18.x | UI 框架，构建交互式用户界面 |
| **TypeScript** | 5.x | 类型安全，提升代码质量 |
| **Tailwind CSS** | 3.x | 实用优先的 CSS 框架，构建现代设计 |
| **shadcn/ui** | Latest | 基于 Radix UI 的高质量组件集合，提供极佳的可定制性和现代感 |
| **Framer Motion** | 10.x | 强大的动画库，实现微交互和流畅转场 |
| **React Router** | 6.x | 前端路由管理 |
| **Axios** | 1.x | HTTP 客户端，API 请求 |
| **Vite** | 5.x | 构建工具，快速开发体验 |

**前端目录结构：**
```
frontend/
├── src/
│   ├── components/     # 可复用组件
│   ├── pages/          # 页面组件
│   ├── services/       # API 服务层
│   ├── types/          # TypeScript 类型定义
│   ├── utils/          # 工具函数
│   └── App.tsx         # 应用入口
├── package.json
└── vite.config.ts
```

### 2.2 后端技术

| 技术 | 版本 | 用途 |
|------|------|------|
| **Node.js** | 20.x | JavaScript 运行时 |
| **Express** | 4.x | Web 应用框架 |
| **TypeScript** | 5.x | 类型安全的后端开发 |
| **PostgreSQL** | 16.x | 关系型数据库 |
| **pg** | 8.x | PostgreSQL 客户端 |
| **express-session** | 1.x | 会话管理 |
| **ts-node-dev** | 2.x | 开发环境热重载 |

**后端目录结构：**
```
backend/
├── src/
│   ├── db/
│   │   └── connection.ts    # 数据库连接
│   ├── middleware/
│   │   └── auth.ts          # 认证中间件
│   ├── routes/
│   │   ├── dashboard.ts     # 仪表盘路由
│   │   ├── projects.ts      # 项目路由
│   │   ├── sprints.ts       # 迭代路由
│   │   ├── stories.ts       # Story 路由
│   │   └── tasks.ts         # 任务路由
│   └── index.ts             # 应用入口
├── migrations/              # 数据库迁移脚本
├── package.json
└── tsconfig.json
```

### 2.3 数据库

**PostgreSQL 16.x**

**特性使用：**
- ✅ 外键约束（Foreign Keys）
- ✅ 级联删除（ON DELETE CASCADE）
- ✅ 唯一约束（UNIQUE）
- ✅ 检查约束（CHECK）
- ✅ 索引优化（B-tree indexes）
- ✅ 事务支持（ACID）

### 2.4 部署方案

**Docker 容器化部署**

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: weekly_report
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/weekly_report
      SESSION_SECRET: your-secret-key
    ports:
      - "4000:4000"
    depends_on:
      - postgres

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
```

**部署优势：**
- 🐳 一键启动所有服务
- 📦 环境一致性（开发/生产）
- 🔄 快速回滚和扩展
- 🔒 服务隔离和安全

### 2.5 开发工具

| 工具 | 用途 |
|------|------|
| **Git** | 版本控制 |
| **VS Code** | 代码编辑器 |
| **Postman** | API 测试 |
| **pgAdmin** | PostgreSQL 管理工具 |
| **ESLint** | 代码质量检查 |
| **Prettier** | 代码格式化 |

---

## 3. 核心设计理念

### 3.1 流转模型（Flow Model）

v3.0 采用**流转模型**作为核心架构，实体（Story/Task）的 ID 在所有迭代中保持不变，通过关联表管理实体在不同迭代中的状态快照。

**核心原则：**

| 维度 | 设计方案 | 说明 |
|------|---------|------|
| **ID 策略** | 全局唯一，跨迭代不变 | Story #1 在所有迭代中都是 #1 |
| **状态管理** | 双表模式（引用表 + 快照表）| 全局属性和迭代状态分离存储 |
| **历史追踪** | 通过 sprint_stories/sprint_tasks 表 | 同一 ID 在不同迭代的状态变化 |
| **数据一致性** | 单一数据源（Single Source of Truth）| 引用字段只存储一次，所有迭代共享 |
| **添加机制** | 搜索选择创建关联记录 | 不创建新实体，只创建新快照 |

### 3.2 设计理念详解

**理念 1：符合业务实际**

在真实工作场景中，一个计划或任务往往需要跨越多个迭代才能完成：

```
Sprint 53 (Week 01): Task "前端开发" - 完成度 30%
                         ↓ 延续到下周
Sprint 54 (Week 02): Task "前端开发" - 完成度 60% (同一个任务)
                         ↓ 继续推进
Sprint 55 (Week 03): Task "前端开发" - 完成度 100% (完成)
```

流转模型直接反映这一现实：**同一个任务**在不同迭代中持续推进，而非每周创建"新任务"。

**理念 2：数据一致性保证**

采用单一数据源（Single Source of Truth）原则：

- **引用字段**（title, description）只在 `stories` 表存储一次
- 修改 Story 标题后，所有迭代中的显示自动同步
- 避免数据冗余和不一致问题

**理念 3：简化查询和追踪**

跨迭代历史查询非常直观：

```sql
-- 查询某个任务的完整历史
SELECT sp.sprint_number, st.progress, st.updated_at
FROM sprint_tasks st
JOIN sprints sp ON st.sprint_id = sp.id
WHERE st.task_id = 1
ORDER BY sp.start_date;
```

无需复杂的递归查询或链式追踪。

**理念 4：符合用户心智模型**

用户的自然理解是：
- ✅ "这个任务继续在下周做"
- ✅ "这个计划进度更新了"
- ❌ 而不是："创建一个新任务，标记为上周任务的延续"

流转模型与用户的直觉认知一致，降低理解成本。

---

## 4. 数据库架构设计

### 4.1 核心表结构

#### 4.1.0 用户表 (users)

**作用：** 存储系统用户信息

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'developer'
    CHECK (role IN ('admin', 'developer', 'external')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

**角色说明：**
- `admin` (管理员): 拥有全部权限，可管理项目、用户、迭代等
- `developer` (研发): 可创建和修改任务、Story，参与项目开发
- `external` (外部): 只读权限，用于外部相关方查看进度

#### 4.1.1 部门表 (departments)

**作用：** 存储部门信息

```sql
CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_departments_name ON departments(name);
```

#### 4.1.2 项目类型表 (project_types)

**作用：** 存储项目类型分类

```sql
CREATE TABLE project_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_project_types_name ON project_types(name);
```

**示例数据：**
- Web 应用
- 移动应用
- 桌面应用
- 后端服务
- 数据分析
- DevOps 工具

#### 4.1.3 项目表 (projects)

**作用：** 存储项目基本信息（引用字段）

```sql
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  software_name VARCHAR(255) NOT NULL,  -- 项目名称
  project_type_id INTEGER REFERENCES project_types(id),
  department_id INTEGER REFERENCES departments(id),
  is_critical BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_projects_type ON projects(project_type_id);
CREATE INDEX idx_projects_department ON projects(department_id);
```

**关键字段：**
- `project_type_id`: 项目类型分类
- `department_id`: 所属部门
- `is_critical`: 是否关键项目

**说明：**
- 项目是否活跃由 `sprint_projects` 表决定（是否在当前迭代中）
- 不需要全局 `status` 字段，避免状态不一致

#### 4.1.4 迭代表 (sprints)

**作用：** 定义时间周期（通常为一周）

```sql
CREATE TABLE sprints (
  id SERIAL PRIMARY KEY,
  sprint_number VARCHAR(10) UNIQUE NOT NULL,  -- '2025-53'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'planned'
    CHECK (status IN ('planned', 'current', 'archived')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sprints_status ON sprints(status);
CREATE INDEX idx_sprints_start_date ON sprints(start_date);
```

**周期编号规则：** ISO 8601 周编号 `YYYY-WW`

**状态说明：**
- `planned`: 计划中的迭代（未来迭代，已创建但未开始）
- `current`: 当前迭代（正在进行中，同一时间只有一个）
- `archived`: 已归档迭代（历史迭代，已结束）

**关键约束：**
- 系统中同一时间只能有一个 `status = 'current'` 的迭代
- 使用应用层或触发器保证该约束

#### 4.1.5 迭代项目表 (sprint_projects) ⭐ 快照表

**作用：** 管理每个迭代包含哪些项目（多对多关联）

```sql
CREATE TABLE sprint_projects (
  id SERIAL PRIMARY KEY,
  sprint_id INTEGER NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- 【快照字段】迭代特定
  priority INTEGER DEFAULT 0,           -- 该迭代中的优先级
  notes TEXT,                           -- 该迭代的项目备注

  -- 元数据
  added_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(sprint_id, project_id)        -- 同一项目在同一迭代只能加入一次
);

CREATE INDEX idx_sprint_projects_sprint ON sprint_projects(sprint_id);
CREATE INDEX idx_sprint_projects_project ON sprint_projects(project_id);
```

**关键特性：**
- **多对多关联**：一个迭代可以包含多个项目，一个项目可以出现在多个迭代中
- **级联删除**：删除迭代或项目时，自动删除关联记录
- **唯一约束**：防止同一项目在同一迭代中重复添加

**业务意义：**
- 明确表达"这个迭代要做哪些项目"
- 查询当前迭代的项目列表：`SELECT * FROM sprint_projects WHERE sprint_id = (SELECT id FROM sprints WHERE status = 'current')`
- 项目是否活跃由是否存在于当前迭代的 `sprint_projects` 中决定

**快照字段用途：**
- `priority`: 不同迭代中，同一项目的优先级可能不同
- `notes`: 记录该项目在本迭代的特殊说明

#### 4.1.6 Story 表 (stories) ⭐ 引用表

**作用：** 存储 Story 的全局属性（引用字段）

```sql
CREATE TABLE stories (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id),

  -- 【引用字段】全局共享，所有迭代看到的都一样
  title VARCHAR(500) NOT NULL,
  description TEXT,
  planned_start_date DATE,
  planned_end_date DATE,
  is_critical BOOLEAN DEFAULT FALSE,

  -- 元数据
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_stories_project ON stories(project_id);
```

**注意：** `stories` 表中**没有** `status`, `progress` 等字段！这些是快照字段，存储在 `sprint_stories` 中。

#### 4.1.7 Story 快照表 (sprint_stories) ⭐ 快照表

**作用：** 存储 Story 在每个迭代中的状态（快照字段）

```sql
CREATE TABLE sprint_stories (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sprint_id INTEGER NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,

  -- 【快照字段】迭代特定，每个迭代可能不同
  status VARCHAR(20) DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'completed', 'on_hold')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  assigned_to INTEGER REFERENCES users(id),
  notes TEXT,

  -- 元数据
  added_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(sprint_id, story_id)  -- 同一 Story 在同一迭代只能加入一次
);

CREATE INDEX idx_sprint_stories_project ON sprint_stories(project_id);
CREATE INDEX idx_sprint_stories_sprint ON sprint_stories(sprint_id);
CREATE INDEX idx_sprint_stories_story ON sprint_stories(story_id);
CREATE INDEX idx_sprint_stories_status ON sprint_stories(status);
```

**关键字段：**
- `project_id`: 冗余字段，方便按项目查询和统计

**关键约束：**
- `UNIQUE(sprint_id, story_id)`: 防止重复加入
- 外键级联删除：删除 Sprint/Project 自动删除关联记录

**数据一致性约束：**
- `sprint_stories` 中的 `project_id` 应该在 `sprint_projects` 中存在
- 可以通过外键或触发器保证：添加 Story 到迭代时，自动添加项目到 `sprint_projects`（如果不存在）

#### 4.1.8 任务表 (tasks) ⭐ 引用表

**作用：** 存储 Task 的全局属性（引用字段）

```sql
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  story_id INTEGER REFERENCES stories(id) ON DELETE SET NULL,

  -- 【引用字段】全局共享
  title VARCHAR(200),
  description TEXT NOT NULL,

  -- 元数据
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_story_id ON tasks(story_id);
```

**说明：**
- `story_id` 可为 NULL（独立任务，不属于任何 Story）
- `description` 是任务的主要内容描述
- 负责人信息存储在 sprint_tasks 快照表中

#### 4.1.9 任务快照表 (sprint_tasks) ⭐ 快照表

**作用：** 存储 Task 在每个迭代中的状态（快照字段）

```sql
CREATE TABLE sprint_tasks (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sprint_id INTEGER NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  story_id INTEGER REFERENCES stories(id) ON DELETE SET NULL,

  -- 【快照字段】迭代特定
  status VARCHAR(20) DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'completed', 'on_hold')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  assigned_to INTEGER REFERENCES users(id),
  risk_and_countermeasure TEXT,
  notes TEXT,

  -- 元数据
  added_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(sprint_id, task_id)
);

CREATE INDEX idx_sprint_tasks_project ON sprint_tasks(project_id);
CREATE INDEX idx_sprint_tasks_sprint ON sprint_tasks(sprint_id);
CREATE INDEX idx_sprint_tasks_task ON sprint_tasks(task_id);
CREATE INDEX idx_sprint_tasks_story ON sprint_tasks(story_id);
CREATE INDEX idx_sprint_tasks_status ON sprint_tasks(status);
```

**关键字段：**
- `project_id`: 冗余字段，方便按项目查询和统计
- `story_id`: 冗余字段，方便按 Story 查询任务

### 4.2 ER 关系图（文本描述）

```
┌──────────────┐
│    Users     │
├──────────────┤
│ id           │
│ name         │
│ email        │
│ role ⭐      │  -- admin | developer | external
└──────────────┘

┌──────────────┐          ┌──────────────┐
│ Departments  │          │Project Types │
├──────────────┤          ├──────────────┤
│ id           │          │ id           │
│ name         │          │ name         │
└──────┬───────┘          └──────┬───────┘
       │                         │
       │    ┌────────────────────┘
       │    │
┌──────▼────▼────┐          ┌───────────────┐
│  Projects      │          │   Sprints     │
│ (项目/引用表)   │          │  (迭代)       │
├────────────────┤          ├───────────────┤
│ id             │          │ id            │
│ name           │          │ sprint_number │
│ department_id  │          │ start_date    │
│ type_id (FK)   │          │ end_date      │
│ is_critical ⭐ │          │ status ⭐     │
└──────┬─────────┘          └───────┬───────┘
       │                            │
       │                   ┌────────▼──────────────┐
       │                   │  sprint_projects      │
       │                   │ (项目快照表) ⭐        │
       │                   ├───────────────────────┤
       │                   │ sprint_id (FK)        │
       └───────────────────┤ project_id (FK)       │
                           │ priority      ⭐      │
                           │ notes         ⭐      │
                           └───────┬───────────────┘
                                   │
┌──────────────────────┐           │
│   Stories            │◄──────────┼─────────┐
│  (计划/引用表)        │           │         │
├──────────────────────┤           │         │
│ id                   │           │         │
│ project_id (FK)      │           │         │
│ title       ⭐       │           │         │
│ description ⭐       │           │         │
│ planned_date ⭐      │           │         │
│ is_critical ⭐       │           │         │
└──────┬───────────────┘           │         │
       │                           │         │
       │               ┌───────────▼─────────▼────┐
       │               │  sprint_stories          │
       │               │ (Story快照表)             │
       │               ├──────────────────────────┤
       │               │ project_id (FK)          │
       │               │ sprint_id (FK)           │
       └───────────────┤ story_id (FK)            │
                       │ status       ⭐          │
                       │ progress     ⭐          │
                       │ assigned_to (FK)→Users⭐ │
                       └──────────────────────────┘

┌─────────────────────┐
│  tasks              │
│ (任务/引用表)        │
├─────────────────────┤
│ id                  │
│ project_id (FK)     │
│ story_id (FK)       │
│ title        ⭐     │
│ description  ⭐     │
└──────┬──────────────┘
       │                       ┌──────────────────────┐
       │                       │  sprint_tasks        │
       │                       │ (Task快照表)          │
       │                       ├──────────────────────┤
       │                       │ project_id (FK)      │
       │                       │ sprint_id (FK)       │
       └───────────────────────┤ task_id (FK)         │
                               │ story_id (FK)        │
                               │ status            ⭐ │
                               │ progress          ⭐ │
                               │ assigned_to (FK)→Users⭐│
                               └──────────────────────┘

⭐ = 关键字段
(FK) = 外键

架构层次（自上而下）：
  Sprints (迭代)
    ↓
  sprint_projects (迭代包含哪些项目)
    ↓
  sprint_stories (迭代中项目的Story)
    ↓
  sprint_tasks (迭代中Story的Task)
```

---

## 5. 引用字段 vs 快照字段

### 5.1 字段分类原则

| 字段类型 | 定义 | 存储位置 | 更新频率 | 示例 |
|---------|------|---------|---------|------|
| **引用字段** | 实体的固有属性，跨迭代不变 | 引用表 (stories, tasks) | 低 | title, description |
| **快照字段** | 实体在特定迭代的状态 | 快照表 (sprint_stories, sprint_tasks) | 高 | status, progress |

### 5.2 Story 字段分类

#### 引用字段（全局）- 存储在 `stories` 表

```typescript
interface StoryReference {
  id: number;
  project_id: number;

  // 这些字段在所有迭代中都一样
  title: string;                    // 计划标题
  description: string;              // 计划描述
  planned_start_date?: Date;        // 计划开始日期
  planned_end_date?: Date;          // 计划结束日期
  is_critical: boolean;             // 是否关键计划

  created_by: number;
  created_at: Date;
  updated_at: Date;
}
```

#### 快照字段（迭代特定）- 存储在 `sprint_stories` 表

```typescript
interface StorySnapshot {
  id: number;
  sprint_id: number;                // 所属迭代
  story_id: number;                 // 关联的 Story

  // 这些字段在不同迭代中可能不同
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
  progress: number;                 // 0-100
  assigned_to?: number;             // 负责人
  notes?: string;                   // 迭代备注

  added_at: Date;
  updated_at: Date;
}
```

### 5.3 Task 字段分类

#### 引用字段（全局）- 存储在 `tasks` 表

```typescript
interface TaskReference {
  id: number;
  project_id: number;
  story_id?: number;                // 可选，可能是独立任务

  // 全局属性
  title?: string;                   // 任务标题（可选）
  description: string;              // 任务描述（主要内容）

  created_at: Date;
  updated_at: Date;
}
```

#### 快照字段（迭代特定）- 存储在 `sprint_tasks` 表

```typescript
interface TaskSnapshot {
  id: number;
  project_id: number;               // 冗余字段
  sprint_id: number;
  task_id: number;
  story_id?: number;                // 冗余字段，可能为空

  // 迭代特定状态
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
  progress: number;                 // 0-100
  assigned_to?: number;             // 本迭代负责人
  risk_and_countermeasure?: string; // 风险与对策
  notes?: string;                   // 备注

  added_at: Date;
  updated_at: Date;
}
```

### 5.4 更新策略

**更新引用字段（全局）：**
```sql
-- 更新 Story 标题（影响所有迭代）
UPDATE stories
SET title = '新标题', updated_at = NOW()
WHERE id = 1;
```

**更新快照字段（迭代特定）：**
```sql
-- 只更新第 53 周的 Story 状态
UPDATE sprint_stories
SET status = 'in_progress', updated_at = NOW()
WHERE story_id = 1 AND sprint_id = 53;
```

---

## 6. 业务流程与逻辑

### 6.1 迭代生命周期管理

#### 6.1.1 迭代状态转换

```
┌─────────┐    创建迭代    ┌─────────┐   开始迭代   ┌─────────┐   结束迭代   ┌──────────┐
│  不存在  │ ────────────> │ planned │ ──────────> │ current │ ──────────> │ archived │
└─────────┘                └─────────┘              └─────────┘              └──────────┘
                              计划中                   当前迭代                   已归档
```

**状态说明：**
- `planned`: 未来迭代，已创建但未开始
- `current`: 当前正在进行的迭代（同一时间只有一个）
- `archived`: 已结束的历史迭代

**关键约束：**
- 系统中同一时间只能有一个 `status = 'current'` 的迭代
- 当新迭代变为 current 时，必须将旧迭代设为 archived

#### 6.1.2 创建新迭代流程

**业务场景：每周五创建下周迭代**

```sql
-- 步骤 1: 创建新迭代
INSERT INTO sprints (sprint_number, start_date, end_date, status)
VALUES ('2025-02', '2025-01-06', '2025-01-12', 'planned')
RETURNING id;  -- 返回 sprint_id = 54

-- 步骤 2: 用户手动选择开始新迭代时，更新状态
BEGIN;

-- 将旧迭代归档
UPDATE sprints
SET status = 'archived'
WHERE status = 'current';

-- 激活新迭代
UPDATE sprints
SET status = 'current'
WHERE id = 54;

COMMIT;
```

激活迭代的本质就是修改状态，这样用户方便快速的切换当当前迭代，默认打开工作台就是当前的迭代。

### 6.2 迭代规划核心逻辑 ⭐

#### 6.2.1 迭代规划的本质

**核心理解：每个迭代 = 重新做计划**

```
不是：上周的工作自动延续到本周
而是：每周团队重新规划本周要做什么

就像每周的计划会议：
- 管理员：本周我们做哪些项目？
- 团队成员：每个项目做哪些 Story？
- 成员：每个 Story 做哪些 Task？

每次都是重新规划，不是自动延续
```

#### 6.2.2 完整规划流程示例

**Week 01 (Sprint 53) - 上周工作**
```
项目 A
├─ Story #1 "用户认证" (已完成 100%)
│   ├─ Task #1 "后端API" (已完成)
│   └─ Task #2 "前端开发" (已完成)
├─ Story #2 "数据导出" (进行中 60%)
│   ├─ Task #3 "导出功能" (已完成)
│   └─ Task #4 "Excel格式" (进行中 50%)
└─ Story #3 "性能优化" (未开始 0%)
    └─ Task #5 "数据库优化" (未开始)
```

**Week 02 (Sprint 54) - 本周规划（周五或周一）**

**步骤 1：管理员创建新迭代**
```
操作：创建迭代，选择要做的项目
- 默认显示上周项目（项目A）方便快速勾选
- 可以添加新项目（项目B）
- 可以移除不需要的项目

结果：sprint_projects 记录创建
```

**步骤 2：团队规划 Story**
```
成员思考：本周项目A要做哪些 Story？

选择1：继续做 Story #2 "数据导出"（已存在）
  操作：搜索找到 Story #2 → 添加到本周
  结果：INSERT INTO sprint_stories (sprint_id=54, story_id=2, status='not_started', progress=0)
  说明：重新开始，进度从 0 开始

选择2：做 Story #3 "性能优化"（已存在）
  操作：搜索找到 Story #3 → 添加到本周

选择3：创建新 Story #4 "报表功能"（新建）
  操作：创建新 Story → 同时添加到本周
  结果：INSERT INTO stories + INSERT INTO sprint_stories

本周计划：Story #2, #3, #4
```

**步骤 3：成员添加 Task**
```
成员思考：Story #2 本周要做哪些任务？

选择1：继续做 Task #4 "Excel格式"（已存在）
  操作：搜索找到 Task #4 → 添加到本周
  结果：INSERT INTO sprint_tasks (sprint_id=54, task_id=4, status='not_started', progress=0)

选择2：创建新 Task #6 "PDF格式"（新建）
  操作：创建新 Task → 同时添加到本周

本周 Story #2 的任务：Task #4, #6
```

**最终 Week 02 (Sprint 54) 的计划：**
```
项目 A
├─ Story #2 "数据导出" (本周重新开始)
│   ├─ Task #4 "Excel格式" (重新开始)
│   └─ Task #6 "PDF格式" (新建)
├─ Story #3 "性能优化"
│   └─ Task #5 "数据库优化"
└─ Story #4 "报表功能" (新建)
    └─ (待添加子任务)
```

**关键点：**
- ✅ Story/Task 的 ID 保持不变（同一个实体）
- ✅ 进度重新开始（不继承上周）
- ✅ 可以选择任何 Story/Task（不管上周是否完成）
- ✅ 团队自己判断要做什么，系统不强制

#### 6.2.3 两种添加方式的区别

**方式 1：添加已存在的 Story/Task**

```
┌─────────────────────────────────────┐
│ 场景：复用已有的 Story               │
├─────────────────────────────────────┤
│ 1. 用户点击"添加 Story"              │
│ 2. 搜索框输入关键词                  │
│ 3. 列表显示该项目的所有 Story:       │
│    □ Story #5 "用户认证"             │
│    □ Story #7 "数据导出"             │
│    □ Story #9 "性能优化"             │
│                                     │
│ 4. 勾选 Story #7                    │
│ 5. 点击"添加"                       │
├─────────────────────────────────────┤
│ 执行:                               │
│ INSERT INTO sprint_stories          │
│ (sprint_id, story_id, ...)          │
│                                     │
│ 更新: 1 张表 (快照表)               │
└─────────────────────────────────────┘
```

**方式 2：创建新的 Story/Task**

```
┌─────────────────────────────────────┐
│ 场景：创建全新的 Story               │
├─────────────────────────────────────┤
│ 1. 用户点击"创建新 Story"            │
│ 2. 填写表单:                        │
│    - 标题: "报表功能"                │
│    - 描述: "..."                    │
│    - 计划日期: ...                  │
│                                     │
│ 3. 点击"创建并添加"                 │
├─────────────────────────────────────┤
│ 执行:                               │
│ 1. INSERT INTO stories (...)        │
│    RETURNING id; -- story_id = 10   │
│                                     │
│ 2. INSERT INTO sprint_stories       │
│    (sprint_id, story_id=10, ...)    │
│                                     │
│ 更新: 2 张表 (引用表 + 快照表)      │
└─────────────────────────────────────┘
```

**SQL 示例：**

```sql
-- 方式 1：添加已存在的 Story
-- API: POST /api/sprint_stories
{
  sprint_id: 54,
  story_id: 7,  -- 已存在的 Story
  status: 'not_started',
  progress: 0,
  assigned_to: 10
}

-- 执行：
INSERT INTO sprint_stories
(sprint_id, story_id, project_id, status, progress, assigned_to)
VALUES (54, 7, 1, 'not_started', 0, 10);

-- 方式 2：创建新 Story 并添加
-- API: POST /api/stories
{
  project_id: 1,
  title: "报表功能",
  description: "...",
  current_sprint_id: 54,  -- 同时添加到该迭代
  status: 'not_started',
  progress: 0
}

-- 执行（事务）：
BEGIN;
  INSERT INTO stories (project_id, title, description, ...)
  VALUES (1, '报表功能', '...', ...)
  RETURNING id;  -- 返回 story_id = 10

  INSERT INTO sprint_stories (sprint_id, story_id, project_id, ...)
  VALUES (54, 10, 1, ...);
COMMIT;
```

### 6.3 日常工作流程

#### 6.3.1 每日任务更新流程

```
用户登录系统
    ↓
选择当前迭代（status = 'current'）
    ↓
查看分配给自己的任务
    ↓
更新任务进度
  - 更新 sprint_tasks.status
  - 更新 sprint_tasks.progress
  - 填写 sprint_tasks.notes
  - 填写 sprint_tasks.risk_and_countermeasure
    ↓
系统自动计算 Story 进度
  - 基于所有 Task 的 progress 平均值
  - 更新 sprint_stories.progress
```

#### 6.3.2 周报数据导出流程

```
周一到周五
    ↓
成员持续更新任务进度
  - 更新 sprint_tasks.status
  - 更新 sprint_tasks.progress
  - 填写 sprint_tasks.notes
  - 填写 sprint_tasks.risk_and_countermeasure
    ↓
每周五下午
    ↓
管理员导出 Excel 周报
  API: GET /api/reports/weekly?sprint_id=54
    ↓
系统自动汇总当前迭代数据
  - 按部门汇总：各部门的项目进度
  - 按项目汇总：各项目的 Story 和 Task 完成情况
  - 按人员汇总：各成员的任务完成情况
  - 本周总结：基于 sprint_tasks 的完成状态
  - 下周计划：基于下一个迭代（planned 状态）的数据
    ↓
导出 Excel 文件
  - 无需手动填写，数据已在系统中
  - 无需提交操作，实时统计
```

### 6.4 权限控制逻辑

#### 6.4.1 角色权限矩阵

| 操作 | Admin | Developer | External |
|------|-------|-----------|----------|
| **迭代管理** | | | |
| 创建迭代 | ✅ | ❌ | ❌ |
| 开始/结束迭代 | ✅ | ❌ | ❌ |
| 删除迭代 | ✅ | ❌ | ❌ |
| **项目管理** | | | |
| 创建项目 | ✅ | ❌ | ❌ |
| 编辑项目 | ✅ | ❌ | ❌ |
| 归档项目 | ✅ | ❌ | ❌ |
| **Story 管理** | | | |
| 创建 Story | ✅ | ✅ | ❌ |
| 编辑 Story | ✅ | ✅ (自己创建的) | ❌ |
| 删除 Story | ✅ | ✅ (自己创建的) | ❌ |
| 更新 Story 状态 | ✅ | ✅ | ❌ |
| **Task 管理** | | | |
| 创建 Task | ✅ | ✅ | ❌ |
| 编辑 Task | ✅ | ✅ (自己的) | ❌ |
| 更新进度 | ✅ | ✅ (自己的) | ❌ |
| 删除 Task | ✅ | ✅ (自己的) | ❌ |
| **查看权限** | | | |
| 查看所有项目 | ✅ | ✅ | ✅ |
| 查看历史迭代 | ✅ | ✅ | ✅ |
| 导出报表 | ✅ | ❌ | ❌ |

#### 6.4.2 数据可见性规则

**Developer 用户：**
- 只能看到自己负责的任务（`sprint_tasks.assigned_to = 当前用户ID`）
- 可以看到自己参与的 Story
- 可以看到自己部门的项目

**External 用户：**
- 只读模式，查看所有公开数据
- 不能修改任何数据
- 不能看到风险和对策信息

### 6.5 数据一致性保证

#### 6.5.1 Story 进度自动计算

**触发时机：** 当 Task 进度更新时

```sql
-- 计算 Story 在某个迭代中的进度
UPDATE sprint_stories
SET progress = (
  SELECT COALESCE(AVG(st.progress), 0)::INT
  FROM sprint_tasks st
  WHERE st.story_id = sprint_stories.story_id
    AND st.sprint_id = sprint_stories.sprint_id
),
updated_at = NOW()
WHERE story_id = $1 AND sprint_id = $2;
```

#### 6.5.2 迭代切换事务保证

```sql
-- 迭代切换必须在事务中完成
BEGIN;

-- 1. 归档旧迭代
UPDATE sprints SET status = 'archived'
WHERE status = 'current';

-- 2. 激活新迭代
UPDATE sprints SET status = 'current'
WHERE id = $new_sprint_id;

-- 3. 验证约束
SELECT COUNT(*) FROM sprints WHERE status = 'current';
-- 必须等于 1，否则 ROLLBACK

COMMIT;
```

### 6.6 前端交互逻辑 ⭐

#### 6.6.1 页面加载流程

**Board 页面（工作台）初始化：**

```
1. 页面加载
   ↓
2. 获取当前迭代
   API: GET /api/sprints?status=current
   响应: { id: 54, sprint_number: '2025-02', status: 'current', ... }
   ↓
3. 存储到状态: currentSprintId = 54
   ↓
4. 并行加载数据（3个API同时调用）
   ├─ GET /api/sprint_projects?sprint_id=54  → 获取该迭代的项目列表
   ├─ GET /api/sprint_stories?sprint_id=54   → 获取该迭代的Story列表
   └─ GET /api/sprint_tasks?sprint_id=54     → 获取该迭代的Task列表
   ↓
5. 数据加载完成，渲染工作台
   - 按项目分组显示
   - 每个项目显示其 Story
   - 每个 Story 显示其 Task
   - 显示进度条
```

**数据结构示例：**

```typescript
// 前端状态管理
interface BoardState {
  currentSprint: Sprint | null;        // 当前迭代
  sprintProjects: SprintProject[];     // 迭代项目快照列表
  stories: Story[];                     // Story快照列表（含引用字段）
  tasks: Task[];                        // Task快照列表（含引用字段）
  users: User[];                        // 用户列表
  loading: boolean;
}

// Story 数据（混合了引用字段和快照字段）
interface Story {
  // 引用字段（来自 stories 表）
  id: number;
  project_id: number;
  title: string;
  description: string;
  planned_end_date: string;
  is_critical: boolean;

  // 快照字段（来自 sprint_stories 表）
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
  progress: number;
  assigned_to: number;

  // 统计字段
  total_tasks: number;
}
```

#### 6.6.2 创建 Story 交互流程

```
用户点击"新建计划"按钮
   ↓
显示 StoryDrawer 表单
   ├─ 引用字段区域
   │  ├─ 项目选择（必填）
   │  ├─ 标题（必填）
   │  ├─ 描述
   │  ├─ 计划开始日期
   │  ├─ 计划结束日期
   │  └─ 是否关键
   │
   └─ 迭代快照字段区域（灰色背景）
      ├─ 状态（默认：未开始）
      ├─ 进度（Slider，默认：0%）
      └─ 负责人
   ↓
用户填写并提交
   ↓
前端发送 POST 请求
   API: POST /api/stories
   Body: {
     // 引用字段
     project_id: 1,
     title: "用户认证",
     description: "...",
     planned_end_date: "2025-12-31",
     is_critical: false,

     // 迭代信息
     current_sprint_id: 54,  // 加入当前迭代

     // 快照字段初始值
     status: "not_started",
     progress: 0,
     assigned_to: 10
   }
   ↓
后端事务处理
   1. INSERT INTO stories (...) RETURNING id
   2. INSERT INTO sprint_stories (sprint_id, story_id, ...)
   ↓
响应成功 → 前端刷新列表
```

#### 6.6.3 更新 Story 交互流程

**场景 1：更新引用字段（标题、描述等）**

```
用户点击编辑 Story
   ↓
StoryDrawer 加载数据
   - 引用字段：从 Story 对象获取
   - 快照字段：从 Story 对象获取（已混合）
   ↓
用户修改标题 "用户认证" → "用户认证 v2"
   ↓
前端发送 PUT 请求
   API: PUT /api/stories/100
   Body: {
     title: "用户认证 v2",
     description: "更新后的描述"
   }
   ↓
后端更新 stories 表
   → 影响所有迭代（标题在历史迭代中也会显示新值）
```

**场景 2：更新快照字段（状态、进度）**

```
用户修改状态：未开始 → 进行中
用户修改进度：0% → 30%
   ↓
前端发送 PUT 请求
   API: PUT /api/stories/100/sprint-status
   Body: {
     sprint_id: 54,          // 当前迭代ID
     status: "in_progress",
     progress: 30,
     assigned_to: 10
   }
   ↓
后端更新 sprint_stories 表
   → 只影响当前迭代（历史迭代的状态不变）
```

**场景 3：同时更新引用和快照字段**

```typescript
// 前端逻辑
async function handleStorySubmit(values) {
  if (editingStory) {
    // 编辑模式：分离引用字段和快照字段
    const { status, progress, assigned_to, ...referenceFields } = values;

    // 1. 更新引用字段
    if (Object.keys(referenceFields).length > 0) {
      await storyAPI.update(editingStory.id, referenceFields);
    }

    // 2. 更新快照字段
    if (status !== undefined || progress !== undefined || assigned_to !== undefined) {
      await storyAPI.updateSprintStatus(editingStory.id, {
        sprint_id: currentSprintId,
        status,
        progress,
        assigned_to
      });
    }
  }
}
```

#### 6.6.4 添加已存在的 Story 交互流程

```
用户点击"添加 Story"按钮
   ↓
显示 Story 搜索对话框
   ┌─────────────────────────────────────┐
   │  添加 Story 到本迭代                 │
   ├─────────────────────────────────────┤
   │  项目: [项目 A  ▼]                   │
   │  搜索: [____________]  🔍           │
   ├─────────────────────────────────────┤
   │  可添加的 Story (未在本迭代):        │
   │                                     │
   │  □ Story #5 "用户认证"               │
   │    创建时间: 2024-12-01              │
   │                                     │
   │  □ Story #7 "数据导出"               │
   │    创建时间: 2024-12-15              │
   │                                     │
   │  □ Story #9 "性能优化"               │
   │    创建时间: 2024-12-20              │
   │                                     │
   │     [取消]        [添加选中]         │
   └─────────────────────────────────────┘
   ↓
前端发送请求
   API: GET /api/stories?project_id=1&not_in_sprint_id=54
   ↓
后端查询：该项目的所有 Story，排除已在当前迭代的
   SQL:
   SELECT s.* FROM stories s
   WHERE s.project_id = 1
     AND s.id NOT IN (
       SELECT story_id FROM sprint_stories
       WHERE sprint_id = 54
     )
   ORDER BY s.created_at DESC
   ↓
用户勾选 Story #7 并点击"添加选中"
   ↓
前端发送添加请求
   API: POST /api/sprint_stories
   Body: {
     sprint_id: 54,
     story_id: 7,
     project_id: 1,
     status: 'not_started',
     progress: 0,
     assigned_to: 10
   }
   ↓
后端执行
   INSERT INTO sprint_stories (sprint_id, story_id, project_id, ...)
   VALUES (54, 7, 1, ...)
   ↓
响应成功 → 前端刷新列表
   - Story #7 出现在工作台
   - 进度显示为 0%
   - 状态显示为"未开始"
```

#### 6.6.5 任务进度更新交互

```
用户在看板中点击 Task 卡片
   ↓
显示 TaskDrawer 表单
   - 只读字段：title, description（引用字段）
   - 可编辑快照字段：
     * 完成状态（下拉选择）
     * 完成进度（Slider 0-100%）
     * 负责人
     * 风险与对策
     * 备注
   ↓
用户拖动进度条：30% → 60%
   ↓
onChange 事件触发
   - 实时更新本地状态
   - 显示保存按钮
   ↓
用户点击保存
   ↓
前端发送 PUT 请求
   API: PUT /api/tasks/3/sprint-status
   Body: {
     sprint_id: 54,
     status: "in_progress",
     progress: 60,
     risk_and_countermeasure: "需要更多测试资源"
   }
   ↓
后端更新 sprint_tasks 表
   ↓
后端触发 Story 进度自动计算
   - 计算该 Story 下所有 Task 的平均进度
   - 更新 sprint_stories.progress
   ↓
前端刷新数据
   - Task 卡片显示新进度 (60%)
   - Story 进度条自动更新
```

#### 6.6.6 迭代切换交互

```
管理员点击"开始新迭代"按钮
   ↓
显示确认对话框
   ┌─────────────────────────────────────┐
   │  确认开始新迭代                      │
   ├─────────────────────────────────────┤
   │  当前迭代：2025-01 (Week 01)        │
   │  新迭代：  2025-02 (Week 02)        │
   │                                     │
   │  操作：                             │
   │  - 将当前迭代标记为"已归档"          │
   │  - 激活新迭代                       │
   │                                     │
   │  注意：此操作不可撤销               │
   │                                     │
   │     [取消]        [确认开始]        │
   └─────────────────────────────────────┘
   ↓
用户确认
   ↓
前端发送请求
   API: POST /api/sprints/54/activate
   ↓
后端事务处理
   BEGIN;
   UPDATE sprints SET status='archived' WHERE status='current';
   UPDATE sprints SET status='current' WHERE id=54;
   COMMIT;
   ↓
响应成功
   ↓
前端刷新页面
   - currentSprintId 更新为 54
   - 重新加载所有数据
   - 显示新迭代的看板
```

#### 6.6.7 实时状态更新

**进度条组件：**

```tsx
// 前端组件示例
function StoryCard({ story }: { story: Story }) {
  // 进度颜色逻辑
  const getProgressColor = (progress: number, status: string) => {
    if (status === 'completed') return 'green';
    if (status === 'on_hold') return 'gray';
    if (progress >= 80) return 'blue';
    if (progress >= 50) return 'orange';
    return 'red';
  };

  return (
    <Card>
      <h3>{story.title}</h3>
      <Progress
        percent={story.progress}
        status={story.status}
        strokeColor={getProgressColor(story.progress, story.status)}
      />
      <Tag color={getStatusColor(story.status)}>
        {getStatusText(story.status)}
      </Tag>
      <p>负责人: {story.assigned_to_name}</p>
      <p>任务数: {story.total_tasks}</p>
    </Card>
  );
}
```

### 6.7 异常处理场景

#### 6.6.1 重复导入检测

```sql
-- 导入前检查是否已存在
SELECT COUNT(*) FROM sprint_stories
WHERE sprint_id = $new_sprint_id AND story_id = $story_id;

-- 如果 > 0，提示用户："该 Story 已在当前迭代中，无需重复导入"
```

#### 6.6.2 孤立 Task 处理

**场景：** Story 在新迭代中不存在，但 Task 需要导入

**解决方案：**
1. 先自动导入关联的 Story
2. 再导入 Task
3. 提示用户："已自动导入关联的 Story"

```sql
-- 批量导入时，先导入 Story
INSERT INTO sprint_stories (sprint_id, story_id, project_id, ...)
SELECT DISTINCT sprint_id, story_id, project_id, ...
FROM temp_import_tasks
ON CONFLICT (sprint_id, story_id) DO NOTHING;

-- 再导入 Task
INSERT INTO sprint_tasks (sprint_id, task_id, ...)
SELECT ... FROM temp_import_tasks;
```

---

## 7. 核心功能设计

### 7.1 创建 Story 并加入迭代 ⭐

**流程：**
```
1. 创建 Story 实体（插入 stories 表）
   ├─ 设置引用字段：title, description
   └─ 返回 story_id

2. 加入当前迭代（插入 sprint_stories 表）
   ├─ 设置快照字段：status, progress
   └─ 创建关联：(sprint_id, story_id)
```

**SQL 示例：**
```sql
BEGIN;

-- 步骤 1: 创建 Story 实体
INSERT INTO stories (project_id, title, description, is_critical, created_by)
VALUES (1, '用户认证功能', '实现用户登录注册', false, 10)
RETURNING id;  -- 返回 story_id = 100

-- 步骤 2: 加入当前迭代（ID = 53）
INSERT INTO sprint_stories (sprint_id, story_id, status, progress, assigned_to)
VALUES (53, 100, 'not_started', 0, 10);

COMMIT;
```

### 7.2 添加已存在的 Story/Task ⭐

**业务场景：**
```
数据库中已存在的 Story:
Story #7 "数据导出" (项目A)
└─ Task #10 "Excel格式"
└─ Task #11 "PDF格式"

Sprint 54 规划阶段:
用户搜索项目A的所有 Story → 找到 Story #7 → 添加到本迭代

结果:
Sprint 54 工作台显示:
Story #7 "数据导出" (重新开始，进度 0%)
└─ (暂无任务，需要继续添加)
```

**实现逻辑：**
```sql
-- 步骤 1: 查询可添加的 Story（排除已在本迭代的）
SELECT s.*
FROM stories s
WHERE s.project_id = 1
  AND s.id NOT IN (
    SELECT story_id FROM sprint_stories
    WHERE sprint_id = 54
  )
ORDER BY s.created_at DESC;

-- 步骤 2: 用户选择 Story #7，添加到迭代（创建快照记录）
INSERT INTO sprint_stories (sprint_id, story_id, project_id, status, progress)
VALUES (54, 7, 1, 'not_started', 0);  -- 同一个 story_id

-- 步骤 3: 查询可添加的 Task（该 Story 的所有 Task，排除已在本迭代的）
SELECT t.*
FROM tasks t
WHERE t.story_id = 7
  AND t.id NOT IN (
    SELECT task_id FROM sprint_tasks
    WHERE sprint_id = 54
  )
ORDER BY t.created_at DESC;

-- 步骤 4: 用户选择 Task #10，添加到迭代
INSERT INTO sprint_tasks (sprint_id, task_id, story_id, project_id, status, progress)
VALUES (54, 10, 7, 1, 'not_started', 0);  -- 同一个 task_id
```

**关键点：**
- ✅ **不创建新实体**，只创建新的快照记录
- ✅ Story 和 Task 的 ID 保持不变
- ✅ 进度重新开始（不继承历史进度）
- ✅ 防止重复添加（UNIQUE 约束）

### 7.3 查询 Story 及其快照

**查询指定迭代的 Story（含快照字段）：**
```sql
SELECT DISTINCT
  s.id,
  s.project_id,
  s.title,                    -- 引用字段
  s.description,              -- 引用字段
  s.planned_end_date,         -- 引用字段
  s.is_critical,              -- 引用字段
  ss.status,                  -- 快照字段
  ss.progress,                -- 快照字段
  ss.assigned_to,             -- 快照字段
  u.name as creator_name
FROM stories s
LEFT JOIN users u ON s.created_by = u.id
LEFT JOIN sprint_stories ss ON s.id = ss.story_id AND ss.sprint_id = $1
WHERE s.project_id = $2 AND ss.id IS NOT NULL
ORDER BY s.created_at DESC;
```

**结果示例：**
```json
[
  {
    "id": 1,
    "project_id": 2,
    "title": "用户认证功能",
    "description": "实现登录注册",
    "planned_end_date": "2025-12-31",
    "is_critical": false,
    "status": "in_progress",
    "progress": 60,
    "assigned_to": 10,
    "creator_name": "张三"
  }
]
```

### 7.4 跨迭代历史查询

**查询 Task 的跨迭代历史：**
```sql
SELECT
  sp.sprint_number,
  sp.start_date,
  sp.end_date,
  st.status,
  st.progress,
  st.next_week_plan,
  st.updated_at
FROM sprint_tasks st
JOIN sprints sp ON st.sprint_id = sp.id
WHERE st.task_id = 3
ORDER BY sp.start_date DESC;
```

**结果示例：**
```
sprint_number | status      | progress        | updated_at
--------------|-------------------|-----------------|------------
2025-54       | in_progress       | 80              | 2025-01-03
2025-53       | in_progress       | 60              | 2024-12-27
2025-52       | in_progress       | 30              | 2024-12-20
```

---

## 8. API 设计

### 8.1 Story API

#### 8.1.1 创建 Story

**端点：** `POST /api/stories`

**请求：**
```json
{
  "project_id": 1,
  "title": "用户认证功能",
  "description": "实现登录注册",
  "planned_end_date": "2025-12-31",
  "is_critical": false,
  "current_sprint_id": 53,      // 加入该迭代
  "status": "not_started",      // 快照字段初始值
  "progress": 0,                // 快照字段初始值
  "assigned_to": 10             // 快照字段初始值
}
```

**响应：**
```json
{
  "id": 100,
  "project_id": 1,
  "title": "用户认证功能",
  "description": "实现登录注册",
  "created_at": "2025-12-29T10:00:00Z"
}
```

#### 8.1.2 更新 Story（引用字段）

**端点：** `PUT /api/stories/:id`

**请求：**
```json
{
  "title": "用户认证功能 v2",
  "description": "更新后的描述",
  "planned_end_date": "2026-01-15"
}
```

**说明：** 只更新引用字段，影响所有迭代

#### 8.1.3 更新 Story 快照（迭代特定）

**端点：** `PUT /api/stories/:id/sprint-status`

**请求：**
```json
{
  "sprint_id": 53,
  "status": "in_progress",
  "progress": 60,
  "assigned_to": 10
}
```

**说明：** 只更新指定迭代的快照字段

#### 8.1.4 查询 Story 列表

**端点：** `GET /api/stories?project_id=1&sprint_id=53`

**响应：**
```json
[
  {
    "id": 100,
    "project_id": 1,
    "title": "用户认证功能",
    "description": "实现登录注册",
    "planned_end_date": "2025-12-31",
    "is_critical": false,
    "status": "in_progress",        // 来自 sprint_stories
    "progress": 60,                 // 来自 sprint_stories
    "assigned_to": 10,              // 来自 sprint_stories
    "total_tasks": 3
  }
]
```

### 8.2 Task API

#### 8.2.1 创建 Task

**端点：** `POST /api/tasks`

**请求：**
```json
{
  "project_id": 1,
  "story_id": 100,
  "title": "前端开发",
  "description": "实现登录界面",
  "current_sprint_id": 53,
  "assigned_to": 10,
  "status": "not_started",
  "progress": 0
}
```

#### 8.2.2 更新 Task 快照

**端点：** `PUT /api/tasks/:id/sprint-status`

**请求：**
```json
{
  "sprint_id": 53,
  "status": "in_progress",
  "progress": 60,
  "risk_and_countermeasure": "无风险"
}
```

### 8.3 Sprint Projects API

#### 8.3.1 查询迭代项目列表

**端点：** `GET /api/sprint_projects?sprint_id=54`

**响应：**
```json
[
  {
    "id": 1,
    "sprint_id": 54,
    "project_id": 1,
    "project_name": "项目 A",
    "priority": 1,
    "notes": "本周重点",
    "added_at": "2025-01-06T10:00:00Z"
  },
  {
    "id": 2,
    "sprint_id": 54,
    "project_id": 3,
    "project_name": "项目 B",
    "priority": 2,
    "notes": null,
    "added_at": "2025-01-06T10:05:00Z"
  }
]
```

#### 8.3.2 添加项目到迭代

**端点：** `POST /api/sprint_projects`

**请求：**
```json
{
  "sprint_id": 54,
  "project_id": 1,
  "priority": 1,
  "notes": "本周重点"
}
```

**响应：**
```json
{
  "id": 1,
  "sprint_id": 54,
  "project_id": 1,
  "priority": 1,
  "notes": "本周重点",
  "added_at": "2025-01-06T10:00:00Z"
}
```

#### 8.3.3 添加已存在的 Story 到迭代

**端点：** `POST /api/sprint_stories`

**请求：**
```json
{
  "sprint_id": 54,
  "story_id": 7,
  "project_id": 1,
  "status": "not_started",
  "progress": 0,
  "assigned_to": 10
}
```

**响应：**
```json
{
  "id": 15,
  "sprint_id": 54,
  "story_id": 7,
  "project_id": 1,
  "status": "not_started",
  "progress": 0,
  "assigned_to": 10,
  "added_at": "2025-01-06T10:00:00Z"
}
```

**说明：** 只创建快照记录，不创建新 Story 实体

#### 8.3.4 查询可添加的 Story（搜索）

**端点：** `GET /api/stories/available?project_id=1&sprint_id=54&search=导出`

**说明：** 返回该项目的所有 Story，排除已在本迭代的

**响应：**
```json
[
  {
    "id": 7,
    "project_id": 1,
    "title": "数据导出功能",
    "description": "导出到 Excel/PDF",
    "created_at": "2024-12-15T10:00:00Z",
    "is_critical": false
  },
  {
    "id": 9,
    "project_id": 1,
    "title": "导出优化",
    "description": "提升导出性能",
    "created_at": "2024-12-20T10:00:00Z",
    "is_critical": false
  }
]
```

---

## 9. 总结

### 9.1 v3.0 核心特点

1. **流转模型** - Story/Task ID 跨迭代保持不变
2. **双表设计** - 引用字段与快照字段分离
3. **简洁架构** - 三层结构（项目 → 计划 → 任务）
4. **强一致性** - 单一数据源，避免数据不一致
5. **高性能** - 低存储开销，查询简单高效

### 9.2 架构优势

**技术优势：**
- 🎯 **数据一致性强** - 引用字段单一存储，所有迭代自动同步
- 🚀 **查询性能高** - 直接通过 ID 查询，无需递归或链式追踪
- 💾 **存储成本低** - 避免数据冗余，只存储必要的快照信息
- 🔧 **维护成本低** - 更新逻辑简单，不需要创建新实体

**业务优势：**
- 👥 **符合用户心智** - 任务延续而非重建，直观易懂
- 📊 **历史追踪清晰** - 同一 ID 的跨迭代进度一目了然
- ⚡ **搜索添加高效** - 快速找到并复用已有 Story/Task
- 🔄 **迭代流转自然** - 状态转换流程清晰，易于管理

### 9.3 最佳实践

**开发建议：**
- ✅ 创建实体时同时加入迭代（一次事务完成）
- ✅ 更新引用字段用 `PUT /stories/:id`（影响所有迭代）
- ✅ 更新快照字段用 `PUT /stories/:id/sprint-status`（只影响指定迭代）
- ✅ 添加已存在的 Story/Task 时使用搜索过滤（排除已在本迭代的）
- ✅ 查询时明确指定 `sprint_id` 获取正确的快照状态
- ✅ 每个迭代开始前手动规划项目、Story、Task（团队决策）

**注意事项：**
- ⚠️ 删除实体会级联删除所有快照记录
- ⚠️ 同一迭代中不能重复添加同一实体
- ⚠️ 只能有一个 `status='current'` 的迭代
- ⚠️ 修改引用字段会影响历史迭代的显示

---

**文档版本：** v3.0
**最后更新：** 2025-12-29
**维护者：** 开发团队
