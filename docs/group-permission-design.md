# 小组权限隔离实现设计

## 背景

当前系统是单团队模型：用户、项目、迭代、周报、搜索和统计默认在同一个数据空间里运行。

新的需求是让多组人员共用同一套项目看板，但每个小组只能管理自己组的人、项目、迭代和报表。系统管理员仍然能查看和管理全部小组。项目暂时不允许跨小组共享。

这不是前端隐藏菜单能解决的问题，必须在数据库和后端接口层做数据隔离。

## 目标

- 系统管理员能查看和管理全部小组数据。
- 每个小组有小组管理员。
- 小组管理员只能管理本组成员、本组项目、本组迭代。
- 普通成员只能访问本组项目、迭代和相关工作数据。
- 外部成员继续保持更低权限，并受小组边界约束。
- 周报、参与统计、全局搜索都按小组隔离。
- 项目不允许跨小组共享。
- 存量数据必须保留，迁移后默认归入一个“默认小组”。

## 结论

需要调整数据库。

原因是现有表没有任何小组归属字段，后端无法可靠判断某个用户、项目或迭代属于哪个小组。如果只做前端过滤，用户仍然可以通过接口访问其他组的数据。

这次调整可以做到向后兼容，前提是迁移采用“先加字段、回填默认小组、再逐步加约束”的方式，而不是直接破坏现有表结构。

## 推荐模型

新增表：

```sql
CREATE TABLE groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

核心表新增字段：

```sql
ALTER TABLE users ADD COLUMN group_id INTEGER REFERENCES groups(id);
ALTER TABLE projects ADD COLUMN group_id INTEGER REFERENCES groups(id);
ALTER TABLE sprints ADD COLUMN group_id INTEGER REFERENCES groups(id);
```

角色扩展：

```text
admin        系统管理员
group_admin  小组管理员
developer    小组成员
external     外部成员
```

第一版不建议给 `stories`、`tasks`、`sprint_projects`、`sprint_stories`、`sprint_tasks` 都加 `group_id`。这些表可以通过 `project_id` 或 `sprint_id` 追溯到小组。这样改动面更小，数据冗余更少。

后续如果查询性能有压力，再给快照表加冗余 `group_id` 和索引。

## 迭代是否按小组独立

建议每个小组维护自己的迭代。

现有 `sprints.status = current` 是全局当前迭代语义。如果迭代继续全局共用，A 组激活 W20 会影响 B 组。创建迭代时还会默认关联项目，全局迭代会导致不同组项目混在一个 Sprint 下。

调整后：

- A 组可以有自己的 W20。
- B 组也可以有自己的 W20。
- A 组激活 W20 不影响 B 组当前迭代。
- 创建迭代时只能关联本组项目。

需要把 `sprints.sprint_number` 从全局唯一改为小组内唯一：

```sql
-- 旧约束：sprint_number 全局唯一
-- 新约束：同一 group_id 下 sprint_number 唯一
UNIQUE(group_id, sprint_number)
```

注意：`sprints.id = -1` 的 Backlog 需要特殊处理。建议每个小组各有一个 Backlog，或保留全局 Backlog 但所有业务查询排除/特殊判断。更一致的方案是每组一个 Backlog。

## 向后兼容迁移方案

当前迁移脚本 `/Users/johnson/Documents/AI-Projects/KanBan/backend/src/scripts/migrate.ts` 不记录已执行版本，且部分旧迁移不是幂等的。因此这次迁移 SQL 必须写成幂等形式，不能依赖 `npm run migrate:up all` 无脑重放。

推荐分三步上线。

### 第一步：兼容性加表加字段

新增默认小组：

```sql
INSERT INTO groups (name)
SELECT '默认小组'
WHERE NOT EXISTS (SELECT 1 FROM groups WHERE name = '默认小组');
```

回填旧数据：

```sql
UPDATE users
SET group_id = (SELECT id FROM groups WHERE name = '默认小组')
WHERE group_id IS NULL;

UPDATE projects
SET group_id = (SELECT id FROM groups WHERE name = '默认小组')
WHERE group_id IS NULL;

UPDATE sprints
SET group_id = (SELECT id FROM groups WHERE name = '默认小组')
WHERE group_id IS NULL;
```

这一步不会删除旧数据，也不会改变现有 `id`。历史项目、历史迭代、历史任务仍然保留。

### 第二步：代码支持小组过滤

后端代码上线后，所有新建用户、项目、迭代都自动写入 `group_id`。

如果当前用户是系统管理员：

- 可以不带小组过滤查看全部。
- 创建用户、项目、迭代时可以选择小组。

如果当前用户是小组管理员或普通成员：

- 所有查询都默认加 `group_id = currentUser.group_id`。
- 创建项目、迭代时强制使用当前用户的 `group_id`。
- 不允许传入其他小组的 `group_id`。

### 第三步：加 NOT NULL 和唯一约束

等确认所有旧数据都有 `group_id`，再加硬约束：

```sql
ALTER TABLE users ALTER COLUMN group_id SET NOT NULL;
ALTER TABLE projects ALTER COLUMN group_id SET NOT NULL;
ALTER TABLE sprints ALTER COLUMN group_id SET NOT NULL;
```

调整迭代唯一约束：

```sql
ALTER TABLE sprints DROP CONSTRAINT IF EXISTS sprints_sprint_number_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sprints_group_number
ON sprints(group_id, sprint_number);
```

这一步之前必须先检查是否存在同一个小组内重复的 `sprint_number`。

## 后端改动清单

### 认证和 session

文件：

- `/Users/johnson/Documents/AI-Projects/KanBan/backend/src/routes/auth.ts`

登录后 session 需要带上：

```ts
{
  id,
  username,
  displayName,
  role,
  groupId,
  groupName
}
```

否则后端接口无法基于 session 做小组过滤。

### 权限中间件

文件：

- `/Users/johnson/Documents/AI-Projects/KanBan/backend/src/middleware/permissions.ts`

需要新增：

- `UserRole.GROUP_ADMIN`
- `isSystemAdmin(user)`
- `isGroupScoped(user)`
- `getUserGroupId(req)`
- `requireSameGroupForUser(targetUserId)`
- `requireSameGroupForProject(projectId)`
- `requireSameGroupForSprint(sprintId)`

`group_admin` 权限建议接近 admin，但限制在本组内：

- 可管理本组用户
- 可管理本组项目
- 可创建/编辑/激活/关闭本组迭代
- 可导出本组团队周报

### 小组管理接口

新增文件：

- `/Users/johnson/Documents/AI-Projects/KanBan/backend/src/routes/groups.ts`

建议接口：

- `GET /api/groups`
- `POST /api/groups`
- `PUT /api/groups/:id`
- `DELETE /api/groups/:id`

只有系统管理员可以创建、编辑、删除小组。小组删除需要检查是否仍有关联用户、项目或迭代。

### 用户接口

文件：

- `/Users/johnson/Documents/AI-Projects/KanBan/backend/src/routes/users.ts`

改动：

- `GET /api/users`
  - admin 返回全部用户
  - group_admin/developer/external 返回本组用户，external 可按现有规则进一步限制
- `POST /api/users`
  - admin 可以指定 `group_id`
  - group_admin 强制创建到自己组
  - developer/external 不允许创建
- `PUT /api/users/:id`
  - group_admin 只能修改本组用户
  - group_admin 不能把别人升为 admin
  - admin 可跨组调整
- `DELETE /api/users/:id`
  - group_admin 只能删除本组用户
  - 删除前需要保留现有引用风险判断

前端用户类型也要加 `group_id` 和 `group_name`。

### 项目接口

文件：

- `/Users/johnson/Documents/AI-Projects/KanBan/backend/src/routes/projects.ts`

改动：

- 所有项目列表查询按 `projects.group_id` 过滤。
- 创建项目时写入 `group_id`。
- 编辑/删除项目时校验项目属于当前用户可管理小组。
- 查询项目关键节点和删除影响时也要校验项目小组。

项目暂时不跨组共享，因此 `projects.group_id` 是项目归属的唯一来源。

### 迭代接口

文件：

- `/Users/johnson/Documents/AI-Projects/KanBan/backend/src/routes/sprints.ts`

改动：

- `GET /api/sprints`
  - admin 可看全部，前端可按小组筛选
  - group_admin/developer/external 只看本组
- `POST /api/sprints`
  - 写入 `group_id`
  - `projectIds` 必须全部属于同一个小组
- `PUT /api/sprints/:id`
  - 校验 sprint 属于可管理小组
- `activate`
  - 只归档同组当前迭代
  - 不能再执行全局 `UPDATE sprints SET status = 'archived' WHERE status = 'current'`
- `close`
  - 只关闭当前小组的迭代

### 工作台接口

文件：

- `/Users/johnson/Documents/AI-Projects/KanBan/backend/src/routes/workbench.ts`

需要过滤/校验：

- `/sprint/:sprintId/projects`
  - 校验 sprint 属于当前小组
- `/projects/available`
  - 只返回当前小组项目
- `/sprint/projects`
  - 校验 sprint 和 project 属于同一小组
- `/board`
  - 校验 sprint 和 project 属于当前小组
- 创建 Story/Task、复用 Story/Task、删除、移动、排序
  - 都需要校验 `project_id` 和 `sprint_id` 的小组一致

这是改动风险最高的文件，应优先加通用 helper，避免每个接口手写一套判断。

### 报表接口

文件：

- `/Users/johnson/Documents/AI-Projects/KanBan/backend/src/routes/reports.ts`

所有周报查询都要通过 `sprints.group_id` 或 `projects.group_id` 限制。

规则：

- admin 可导出全部或指定小组。
- group_admin 只能导出本组团队周报。
- developer 只能导出本组内自己有权限的个人周报。
- external 继续只能导出/查看自己相关数据，如保留该能力。

### 参与统计接口

文件：

- `/Users/johnson/Documents/AI-Projects/KanBan/backend/src/routes/participation_stats.ts`

当前查询没有小组过滤。需要：

- sprintIds 只能来自当前用户可见小组。
- memberIds 只能来自当前用户可见小组。
- 查询结果限制到同组项目和迭代。

### 全局搜索

文件：

- `/Users/johnson/Documents/AI-Projects/KanBan/backend/src/routes/search.ts`

当前搜索是全局搜索项目、迭代、Story、Task。需要全部加小组过滤。

项目搜索：

- `projects.group_id`

迭代搜索：

- `sprints.group_id`

Story/Task 搜索：

- 通过 `projects.group_id` 或对应快照关联到 `sprints.group_id`

### Dashboard 和通知

文件：

- `/Users/johnson/Documents/AI-Projects/KanBan/backend/src/routes/dashboard.ts`
- `/Users/johnson/Documents/AI-Projects/KanBan/backend/src/routes/notifications.ts`

Dashboard 里的总数、当前迭代、成员统计、项目状态都要按小组过滤。

通知如果只按用户接收展示，可以先保持用户维度。但生成通知或跳转到任务详情时，仍要校验任务所属小组。

## 前端改动清单

### 类型定义

文件：

- `/Users/johnson/Documents/AI-Projects/KanBan/frontend/src/types.ts`

新增：

```ts
export interface Group {
  id: number;
  name: string;
}
```

`Member`、`Project`、`Sprint` 增加：

```ts
group_id?: number;
group_name?: string;
```

### 权限 Hook

文件：

- `/Users/johnson/Documents/AI-Projects/KanBan/frontend/src/hooks/usePermissions.ts`

新增 `group_admin` 角色，并同步后端权限表。

### 布局和用户态

文件：

- `/Users/johnson/Documents/AI-Projects/KanBan/frontend/src/pages/DashboardLayout.tsx`

当前 `currentUser` 只有 `id/displayName/role`，需要增加 `groupId/groupName`。

如果是系统管理员，顶部或相关页面可以增加小组筛选；第一版也可以先只在管理页面提供小组选择。

### 成员管理

文件：

- `/Users/johnson/Documents/AI-Projects/KanBan/frontend/src/pages/UsersPage.tsx`

改动：

- 用户表显示小组。
- admin 创建/编辑用户时可选小组。
- group_admin 创建用户时小组字段隐藏，默认本组。
- 角色选项新增“小组管理员”。

### 项目管理

文件：

- `/Users/johnson/Documents/AI-Projects/KanBan/frontend/src/pages/ProjectsPage.tsx`

改动：

- 项目列表只展示后端返回的小组范围。
- admin 创建项目时可选小组。
- group_admin/developer 创建项目时默认本组。
- 项目详情、关键节点管理不需要额外暴露小组字段。

### 迭代管理

文件：

- `/Users/johnson/Documents/AI-Projects/KanBan/frontend/src/pages/SprintsPage.tsx`

改动：

- 迭代列表按后端返回展示。
- 创建迭代时，项目选择只能显示同组项目。
- admin 可选择小组后再创建迭代。
- 激活迭代文案保持不变，但语义变成“激活本组迭代”。

### 工作台

文件：

- `/Users/johnson/Documents/AI-Projects/KanBan/frontend/src/pages/Workbench.tsx`
- `/Users/johnson/Documents/AI-Projects/KanBan/frontend/src/hooks/useWorkbenchState.ts`
- `/Users/johnson/Documents/AI-Projects/KanBan/frontend/src/pages/Workbench/components/ProjectDialog.tsx`

改动：

- 迭代下拉只显示当前可见小组迭代。
- 引用旧项目只显示同组项目。
- 创建项目默认落入当前用户小组。
- admin 如需跨组操作，需要先选择小组上下文，否则容易混乱。

### 统计、搜索、报表

文件：

- `/Users/johnson/Documents/AI-Projects/KanBan/frontend/src/pages/ParticipationStatsPage.tsx`
- `/Users/johnson/Documents/AI-Projects/KanBan/frontend/src/components/GlobalSearch.tsx`
- `/Users/johnson/Documents/AI-Projects/KanBan/frontend/src/pages/SprintsPage.tsx`

前端主要消费后端过滤后的结果。

admin 如果需要查看特定小组统计，需要增加 group filter 参数。第一版可以先让 admin 看全部，第二版再加按组筛选。

## 旧数据影响评估

不会删除旧数据。

迁移后的旧数据会被放入“默认小组”：

- 旧用户归默认小组。
- 旧项目归默认小组。
- 旧迭代归默认小组。
- 旧 Story/Task 不改表结构，仍通过旧项目归属默认小组。
- 旧 Sprint 快照不改表结构，仍通过旧迭代归属默认小组。

上线后，旧功能在默认小组内继续可用。系统管理员能看到全部。默认小组的小组管理员可以继续管理这些旧数据。

需要注意：

- 当前 `sprints.sprint_number` 是全局唯一。改成小组内唯一后，不影响旧数据，因为旧数据都在默认小组里。
- 如果以后把旧数据拆到多个小组，需要人工迁移项目、迭代和用户的 `group_id`。
- 如果某些项目或任务历史上实际属于不同小组，需要上线前先整理归属清单。

## 上线前审计 SQL

检查用户、项目、迭代数量：

```sql
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM projects;
SELECT COUNT(*) FROM sprints;
```

检查迭代编号重复风险：

```sql
SELECT sprint_number, COUNT(*)
FROM sprints
GROUP BY sprint_number
HAVING COUNT(*) > 1;
```

迁移后检查空小组字段：

```sql
SELECT COUNT(*) FROM users WHERE group_id IS NULL;
SELECT COUNT(*) FROM projects WHERE group_id IS NULL;
SELECT COUNT(*) FROM sprints WHERE group_id IS NULL;
```

检查跨组异常关联：

```sql
SELECT sp.id, sp.sprint_id, sp.project_id
FROM sprint_projects sp
JOIN sprints s ON s.id = sp.sprint_id
JOIN projects p ON p.id = sp.project_id
WHERE s.group_id <> p.group_id;
```

如果这条 SQL 有结果，说明一个迭代引用了其他组项目，需要人工处理。

## 风险和控制

主要风险是接口漏加小组过滤，导致跨组数据泄露。

控制方式：

- 后端集中封装小组过滤 helper。
- 对核心对象访问统一做 `requireSameGroup` 校验。
- 全局搜索、报表、Dashboard 必须纳入第一版改造范围。
- 前端只作为体验层，不能作为权限边界。

第二个风险是迁移脚本不完善。

控制方式：

- 新迁移必须幂等。
- 不使用 `migrate:up all` 重放历史迁移。
- 先在备份库跑迁移和审计 SQL。
- 确认无空 `group_id` 和无跨组异常关联后，再加 NOT NULL/唯一约束。

## 推荐实施顺序

1. 写幂等数据库迁移：新增 `groups`、`group_id`、默认小组、角色约束调整。
2. 修改登录 session 和权限中间件，支持 `group_admin` 与 `group_id`。
3. 改用户、项目、迭代接口，先建立基础隔离。
4. 改工作台接口，确保项目、迭代、Story、Task 不跨组。
5. 改报表、参与统计、全局搜索、Dashboard。
6. 改前端类型、权限 Hook、成员管理、项目管理、迭代管理、工作台。
7. 跑旧数据审计 SQL。
8. 确认数据无异常后，再加 NOT NULL 和唯一约束。

## 第一版范围建议

第一版必须包含：

- 数据库小组字段。
- 登录态携带小组。
- 小组管理员角色。
- 用户、项目、迭代、工作台隔离。
- 周报、参与统计、全局搜索隔离。

第一版可以暂缓：

- 项目跨组共享。
- 复杂的小组间项目移交流程。
- 快照表冗余 `group_id`。
- admin 全局视图里的高级 group filter。

这样既能满足核心权限隔离，又能最大程度保护存量数据。
