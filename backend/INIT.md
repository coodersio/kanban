# 数据库初始化指南

## 方式一：使用 seed 脚本（推荐）

这是最简单的方式，会自动创建：
- Admin 账户（用户名: `admin`, 密码: `admin123`）
- Backlog 迭代（id: -1）

```bash
cd backend
npm run seed
```

## 方式二：手动运行 SQL 迁移

如果你想手动运行SQL脚本：

```bash
cd backend
npm run build
node dist/scripts/migrate.js 013_seed_initial_data.sql
```

## 创建的账户信息

- **用户名**: `admin`
- **密码**: `admin123`
- **角色**: 系统管理员
- **显示名称**: 系统管理员

## 创建的迭代信息

- **ID**: -1
- **名称**: BACKLOG
- **状态**: planned
- **日期范围**: 1970-01-01 至 2099-12-31

## 注意事项

1. 所有操作都使用 `ON CONFLICT DO NOTHING`，可以安全地重复运行
2. 如果已经存在 admin 账户或 Backlog 迭代，脚本会跳过创建
3. 首次初始化数据库时，请先运行所有迁移脚本，再运行 seed
