# 自动 Checkout 部署方案 - 快速操作指南

使用 GitHub Self-hosted Runner + 自动 checkout 代码的部署方案。

---

## ✅ 当前配置

- **Workflow:** `.github/workflows/deploy.yml`
- **部署方式:** 自动 checkout 代码到 runner 工作目录
- **工作目录:** `~/kanban-actions-runner/_work/kanban/kanban`
- **环境变量:** 通过 GitHub Secrets 管理

---

## 一、在 VPS 上修复 Docker 权限

**必须执行，否则部署会失败！**

```bash
# 1. 添加 Docker 权限
sudo usermod -aG docker plugcamp

# 2. 重启 runner 服务
cd ~/kanban-actions-runner
sudo ./svc.sh stop
sudo ./svc.sh start

# 3. 验证权限（应该能正常运行）
docker ps

# 如果步骤 3 仍然报错，执行：
sudo systemctl restart docker
cd ~/kanban-actions-runner
sudo ./svc.sh stop
sudo ./svc.sh start

# 再次测试
docker ps
```

---

## 二、配置 GitHub Secrets

### 1. 进入仓库设置

1. 打开 GitHub 仓库
2. 点击 **Settings** → **Secrets and variables** → **Actions**
3. 点击 **New repository secret**

### 2. 添加密码 Secret

| 名称 | 值 | 说明 |
|------|-----|------|
| `POSTGRES_PASSWORD` | `your_secure_password` | PostgreSQL 数据库密码 |

**示例：**
- Name: `POSTGRES_PASSWORD`
- Secret: `MySecurePass123!`

点击 **Add secret** 保存。

---

## 三、首次手动部署（初始化数据库）

由于首次部署需要初始化数据库，建议先手动执行一次：

```bash
# 1. 进入 runner 工作目录
cd ~/kanban-actions-runner/_work/kanban/kanban

# 2. 如果目录不存在，手动触发一次 workflow
# GitHub 仓库 → Actions → Deploy to VPS → Run workflow

# 3. 等待 checkout 完成后，进入 deploy 目录
cd ~/kanban-actions-runner/_work/kanban/kanban/deploy

# 4. 创建环境变量文件（临时，正式部署会自动创建）
echo "POSTGRES_PASSWORD=your_password" > .env

# 5. 启动服务
docker compose up -d

# 6. 初始化数据库
docker compose exec backend npm run migrate:up
docker compose exec backend npm run seed

# 7. 验证部署
docker compose ps
```

访问 `http://VPS_IP` 确认应用运行正常。

---

## 四、测试自动部署

```bash
# 在本地提交代码
git add .
git commit -m "test: auto deploy with checkout"
git push origin main

# 查看部署进度
# GitHub 仓库 → Actions → 查看最新 workflow
```

---

## 五、日常管理

### 查看服务状态

```bash
cd ~/kanban-actions-runner/_work/kanban/kanban/deploy
docker compose ps
docker compose logs -f
```

### 手动重启服务

```bash
cd ~/kanban-actions-runner/_work/kanban/kanban/deploy
docker compose restart
```

### 查看 runner 状态

```bash
cd ~/kanban-actions-runner
sudo ./svc.sh status
```

### 清理 runner 工作目录（释放空间）

```bash
# 停止服务
cd ~/kanban-actions-runner/_work/kanban/kanban/deploy
docker compose down

# 清理工作目录
cd ~/kanban-actions-runner/_work
rm -rf kanban

# 下次 push 代码时会自动重新 checkout
```

---

## 六、常见问题

### 1. 权限错误：permission denied while trying to connect to Docker

**原因：** runner 用户没有 Docker 权限

**解决：**
```bash
sudo usermod -aG docker plugcamp
cd ~/kanban-actions-runner
sudo ./svc.sh stop
sudo ./svc.sh start
```

### 2. 环境变量未生效

**原因：** GitHub Secret 未配置

**解决：**
- 检查 GitHub → Settings → Secrets → Actions
- 确保 `POSTGRES_PASSWORD` 已添加

### 3. 数据库连接失败

**原因：** 首次部署未初始化数据库

**解决：**
```bash
cd ~/kanban-actions-runner/_work/kanban/kanban/deploy
docker compose exec backend npm run migrate:up
docker compose exec backend npm run seed
```

### 4. 找不到工作目录

**原因：** runner 还未执行过 workflow

**解决：**
- 手动触发一次部署：GitHub → Actions → Run workflow
- 或提交代码触发自动部署

### 5. 磁盘空间不足

**原因：** Docker 镜像和容器占用空间

**清理：**
```bash
# 清理无用镜像
docker image prune -a -f

# 清理无用容器
docker container prune -f

# 清理无用卷（注意：会删除数据库数据！）
docker volume prune -f

# 清理 runner 缓存
cd ~/kanban-actions-runner/_work
du -sh *
rm -rf kanban  # 清理后下次会重新 checkout
```

---

## 七、工作流程图

```
本地提交代码 (git push)
    ↓
GitHub 触发 Workflow
    ↓
Self-hosted Runner 接收任务
    ↓
Checkout 代码到工作目录
    ↓
创建 .env 文件（使用 GitHub Secret）
    ↓
执行部署
    ├── docker compose down
    ├── docker compose build
    ├── docker compose up -d
    └── docker compose exec migrate
    ↓
部署完成
```

---

## 八、文件位置参考

| 文件 | 位置 |
|------|------|
| Runner 安装目录 | `~/kanban-actions-runner` |
| 工作目录 | `~/kanban-actions-runner/_work/kanban/kanban` |
| 部署配置 | `~/kanban-actions-runner/_work/kanban/kanban/deploy` |
| 环境变量 | `~/kanban-actions-runner/_work/kanban/kanban/deploy/.env` |
| Docker 数据 | Docker volumes（由 Docker 管理） |

---

## 九、部署检查清单

首次部署前确认：

- [ ] VPS 已安装 Docker 和 Docker Compose 插件
- [ ] plugcamp 用户有 Docker 权限（`docker ps` 不报错）
- [ ] Self-hosted Runner 已安装并运行（状态：Idle）
- [ ] GitHub Secret `POSTGRES_PASSWORD` 已配置
- [ ] 防火墙已开放 80 端口
- [ ] 已手动执行一次初始化（migrate + seed）

---

**部署完成后访问地址:** `http://VPS_IP`

**默认账户:**
- 用户名: `admin`
- 密码: `admin123`

⚠️ **请立即修改默认密码！**
