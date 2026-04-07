# 参与项目统计页面实现方案

## 1. 目标

新增一个“参与项目统计”页面，用于统计多个迭代中指定成员参与的项目、关键节点和完成时间。

页面核心诉求：

- 支持多选迭代
- 支持多选成员
- 默认显示全部迭代、全部成员
- 结果用标准二维表格呈现，方便直接复制到 Excel

## 2. 页面方案

页面采用“两行筛选 + 表格结果区”的结构。

- 第一行：迭代筛选
- 第二行：成员筛选
- 第三行：操作区
- 第四部分：统计表格

推荐表格列：

- 项目名称
- 迭代
- 关键节点
- 成员
- 角色
- 状态
- 完成时间

交互约定：

- 默认进入页面时，迭代和成员都为“全部”
- 支持多选标签式筛选
- 保留 `查询` 按钮，避免每次勾选都触发请求
- 保留 `清空筛选` 按钮，一键恢复默认
- `复制到 Excel` 复制当前可见结果，格式为 TSV

## 3. 前端实现

### 3.1 路由与入口

新增页面文件：

- `frontend/src/pages/ParticipationStatsPage.tsx`

新增路由：

- 在 `frontend/src/App.tsx` 下挂到 `/dashboard/participation-stats`

新增左侧导航：

- 在 `frontend/src/pages/DashboardLayout.tsx` 新增一个导航入口
- 可直接复用当前已导入但未使用的 `BarChart3` 图标
- 页面标题建议为“参与统计”或“参与项目统计”

### 3.2 页面状态

页面需要维护以下状态：

- `sprints`
- `members`
- `selectedSprintIds`
- `selectedMemberIds`
- `rows`
- `summary`
- `loading`
- `error`

建议约定：

- `selectedSprintIds` 为空时表示“全部”
- `selectedMemberIds` 为空时表示“全部”

这样前后端都更容易处理。

### 3.3 筛选数据来源

筛选项可以直接复用现有接口：

- 迭代列表：`GET /api/sprints`
- 成员列表：`GET /api/users`

成员筛选建议在前端默认过滤掉 `external` 用户，只保留内部成员，除非业务明确要求显示外部成员。

### 3.4 结果表格组件

建议使用现有 UI 体系中的表格组件：

- `frontend/src/components/ui/table.tsx`

页面本身保持普通二维表，不要做分组折叠、合并单元格或卡片式布局。这样复制到 Excel 的成功率最高。

### 3.5 复制到 Excel

前端不需要依赖 ExcelJS，直接复制为 TSV 即可。

实现方式：

1. 取当前表格可见数据
2. 按列组装为二维数组
3. 每列用 `\t` 连接
4. 每行用 `\n` 连接
5. 调用 `navigator.clipboard.writeText(tsv)`

复制的列顺序必须与表头完全一致。

示例表头：

```ts
["项目名称", "迭代", "关键节点", "成员", "角色", "状态", "完成时间"]
```

## 4. 后端实现

### 4.1 推荐接口

新增独立接口，避免把这类统计逻辑继续堆进现有 `dashboard.ts` 或 `reports.ts`。

建议新增路由文件：

- `backend/src/routes/participation_stats.ts`

在 `backend/src/index.ts` 挂载：

- `/api/participation-stats`

推荐接口：

- `GET /api/participation-stats?sprintIds=7,8,9&memberIds=2,5`

参数约定：

- `sprintIds` 可选；不传表示全部正常迭代
- `memberIds` 可选；不传表示全部成员

`BACKLOG` 建议默认排除。

### 4.2 返回结构

建议返回：

```json
{
  "summary": {
    "projectCount": 3,
    "milestoneCount": 8,
    "memberCount": 2
  },
  "rows": [
    {
      "projectId": 21,
      "projectName": "PMTestHostComputer",
      "sprintId": 8,
      "sprintName": "W8",
      "storyId": 106,
      "storyTitle": "根据研发任务单功能编码开发",
      "memberId": 12,
      "memberName": "吴群群",
      "role": "负责人",
      "status": "completed",
      "completedAt": "2026-03-13T10:00:00.000Z"
    }
  ]
}
```

前端只消费 `rows` 和 `summary`。

### 4.3 统计粒度

推荐按“项目 + 迭代 + 关键节点 + 成员”输出一行。

原因：

- 页面目标是看“关键节点”和“完成时间”
- `Story` 本身就是关键节点
- 如果按 `Task` 粒度输出，表格会过细，不利于复制和汇总

换句话说，页面展示对象应当是“某成员在某迭代参与了哪个项目的哪个关键节点”。

### 4.4 角色判定

角色建议做两级：

- `负责人`
- `参与人`

判定规则：

- 若 `sprint_stories.assigned_to = member_id`，则该成员在该关键节点下角色为 `负责人`
- 若成员没有被分配到 Story，但在该 Story 下存在分配给他的 `sprint_tasks`，则角色为 `参与人`
- 若两种情况同时存在，优先显示 `负责人`

### 4.5 状态与完成时间

建议直接以 `sprint_stories` 为准：

- 状态：`sprint_stories.status`
- 完成时间：`sprint_stories.actual_completion_date`

这样字段定义最稳定，也符合“关键节点完成时间”的业务语义。

如果后续业务希望看到“我个人任务的完成时间”，建议新增单独列，不要混用当前列含义。

### 4.6 SQL 设计建议

推荐用 CTE 先把 Story 负责人和 Task 参与人合并，再做去重。

逻辑步骤：

1. 过滤选中的迭代
2. 取 Story 负责人记录
3. 取 Task 参与记录
4. 以 `sprint_id + project_id + story_id + member_id` 去重
5. 若同一成员在同一 Story 下既是负责人又有任务，则角色归并为 `负责人`
6. 关联 `projects / sprints / stories / users / sprint_stories`
7. 排序后返回

建议排序：

- `sprints.start_date DESC`
- `projects.software_name ASC`
- `stories.id ASC`
- `users.display_name ASC`

### 4.7 权限建议

建议分角色处理：

- `admin` / `developer`：可筛选全部成员
- `external`：只允许查看自己，成员筛选锁定为当前用户

如果当前版本不想分权限细节，最小实现可以先统一使用 `requireAuth`，再在接口内部根据当前登录用户角色决定是否覆盖 `memberIds`。

## 5. 实施步骤

建议按下面顺序推进：

1. 新增后端接口，先返回静态或最小真实数据
2. 新建前端页面，先把筛选区和表格框架做出来
3. 接通 `sprints` 和 `users` 筛选选项
4. 接通统计接口，完成表格渲染
5. 实现 `复制到 Excel`
6. 补充空态、加载态、错误态
7. 再决定是否加分页、排序、导出 CSV

## 6. 验收标准

- 可同时选择多个迭代
- 可同时选择多个成员
- 默认进入页面时为全部迭代、全部成员
- 点击查询后正确返回统计结果
- 表格一行对应一条“成员参与关键节点”的记录
- 复制后粘贴到 Excel 时能够自动分列
- 仅下周新增项目、跨多个迭代的项目都能正常显示

## 7. 风险与注意点

- 同一成员在同一关键节点下可能同时是 Story 负责人和 Task 执行人，必须做好去重
- 如果某个 Story 完成了但没有 `actual_completion_date`，页面会出现“已完成但完成时间为空”的情况，需要在接口层统一处理
- 现有文档和运行端口存在旧配置，开发联调时应以当前代码配置为准
- 页面是“统计页”，应尽量避免塞入过多看板交互，否则会破坏复制到 Excel 的核心价值

## 8. 建议的第一版范围

第一版只做这些：

- 页面入口
- 双行多选筛选
- 查询结果表格
- 复制到 Excel

第一版先不做这些：

- 图表
- 分页
- 多维排序
- CSV / Excel 文件导出
- 项目详情跳转

这样可以先把最核心的场景做稳，再决定是否继续扩展。
