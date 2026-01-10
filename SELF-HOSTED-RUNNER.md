# GitHub Self-Hosted Runner 配置指南

使用 Self-hosted Runner 在 VPS 上自动部署，无需配置 SSH。

---

## 优势

✅ **更安全** - 不需要 SSH 私钥
✅ **更简单** - 不需要配置 GitHub Secrets
✅ **更快** - 直接在 VPS 上执行，不需要 SSH 连接
✅ **更稳定** - 避免 SSH 连接问题

---

## 一、在 VPS 上安装 Runner

### 1. 获取 Runner Token

1. 打开 GitHub 仓库页面
2. 点击 **Settings** → **Actions** → **Runners**
3. 点击 **New self-hosted runner**
4. 选择操作系统：**Linux**
5. 按照页面提供的命令操作（下面有详细步骤）

### 2. 在 VPS 上执行安装命令

**在 VPS 上执行以下命令：**

```bash
# 创建 runner 目录
mkdir -p ~/actions-runner && cd ~/actions-runner

# 下载 runner（GitHub 会提供最新版本的命令）
# 示例（以 x64 为例，实际以 GitHub 页面显示为准）:
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz

# 解压
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz

# 配置 runner（使用 GitHub 页面提供的 token）
./config.sh --url https://github.com/your-username/kanban --token YOUR_TOKEN_HERE

# 配置过程中会询问：
# - Runner name: 输入 vps-runner（或任意名称）
# - Runner group: 直接回车（使用 Default）
# - Labels: 直接回车
# - Work folder: 直接回车（使用默认 _work）
```

### 3. 安装并启动 Runner 服务

```bash
# 安装为系统服务（推荐，开机自启）
sudo ./svc.sh install

# 启动服务
sudo ./svc.sh start

# 查看状态
sudo ./svc.sh status
```

**也可以手动运行（不推荐，关闭终端后会停止）：**
```bash
./run.sh
```

### 4. 验证 Runner 状态

1. 返回 GitHub 仓库的 **Settings → Actions → Runners**
2. 应该看到您的 runner 显示为 **Idle**（绿色）

---

## 二、配置项目环境变量

Self-hosted runner 会直接在 VPS 上执行命令，需要确保环境正确。

### 1. 在 VPS 上创建环境变量文件

```bash
cd /opt/kanban/deploy
nano .env
```

写入：
```env
POSTGRES_PASSWORD=your_secure_password
```

### 2. 确保 Docker 权限

```bash
# 确保 runner 用户（通常是安装 runner 的用户）有 Docker 权限
sudo usermod -aG docker $USER

# 重新加载权限（或重新登录）
newgrp docker

# 验证权限
docker ps
```

---

## 三、测试自动部署

### 1. 提交代码触发部署

```bash
# 在本地项目中提交代码
git add .
git commit -m "test: trigger auto deploy"
git push origin main
```

### 2. 查看部署进度

1. GitHub 仓库页面 → **Actions**
2. 点击最新的 workflow run
3. 查看实时日志输出

### 3. 验证部署结果

```bash
# 在 VPS 上查看容器状态
cd /opt/kanban/deploy
docker compose ps

# 查看日志
docker compose logs -f
```

访问 `http://VPS_IP`，确认应用已更新

---

## 四、Runner 管理命令

### 查看服务状态

```bash
cd ~/actions-runner
sudo ./svc.sh status
```

### 停止 Runner

```bash
sudo ./svc.sh stop
```

### 重启 Runner

```bash
sudo ./svc.sh stop
sudo ./svc.sh start
```

### 卸载 Runner

```bash
# 停止服务
sudo ./svc.sh stop
sudo ./svc.sh uninstall

# 删除配置
./config.sh remove --token YOUR_REMOVAL_TOKEN

# 删除文件
cd ~
rm -rf actions-runner
```

---

## 五、常见问题

### 1. Runner 显示离线（Offline）

**原因：** Runner 服务未运行

**解决：**
```bash
cd ~/actions-runner
sudo ./svc.sh start
sudo ./svc.sh status
```

### 2. 部署失败：权限不足

**原因：** Runner 用户没有 Docker 权限

**解决：**
```bash
# 查看当前用户
whoami

# 添加 Docker 权限
sudo usermod -aG docker $(whoami)

# 重启 runner 服务
sudo ./svc.sh stop
sudo ./svc.sh start
```

### 3. 部署失败：找不到 docker compose 命令

**原因：** Docker Compose 插件未安装

**解决：**
```bash
# Ubuntu/Debian
sudo apt install docker-compose-plugin

# 验证
docker compose version
```

### 4. Runner 占用磁盘空间过大

**原因：** 工作目录积累了大量构建缓存

**清理：**
```bash
cd ~/actions-runner/_work
du -sh *

# 清理旧的工作文件
cd ~/actions-runner
sudo ./svc.sh stop
rm -rf _work/*
sudo ./svc.sh start
```

### 5. 需要更新 Runner

```bash
cd ~/actions-runner

# 停止服务
sudo ./svc.sh stop

# 下载最新版本（从 GitHub 页面获取最新链接）
curl -o actions-runner-linux-x64-NEW_VERSION.tar.gz -L <LATEST_URL>

# 解压（会覆盖旧文件）
tar xzf ./actions-runner-linux-x64-NEW_VERSION.tar.gz

# 重启服务
sudo ./svc.sh start
```

---

## 六、安全建议

### 1. 限制 Runner 权限

不要用 root 用户运行 runner，使用普通用户：
```bash
# 创建专用用户（可选）
sudo useradd -m -s /bin/bash github-runner
sudo usermod -aG docker github-runner

# 切换到该用户安装 runner
sudo su - github-runner
```

### 2. 定期更新 Runner

```bash
# 每月检查更新
cd ~/actions-runner
./run.sh --version

# 与 GitHub 最新版本对比
# https://github.com/actions/runner/releases
```

### 3. 监控 Runner 日志

```bash
# 查看 runner 日志
cd ~/actions-runner
tail -f _diag/Runner_*.log
```

---

## 七、工作流程图

```
代码提交 (git push)
    ↓
GitHub 触发 Workflow
    ↓
分配任务到 Self-hosted Runner (VPS)
    ↓
VPS Runner 拉取代码 (checkout)
    ↓
执行部署脚本
    ├── docker compose down
    ├── docker compose build
    ├── docker compose up -d
    └── docker compose exec migrate
    ↓
部署完成
```

---

## 八、对比：Self-hosted vs SSH

| 特性 | Self-hosted Runner | SSH 方式 |
|------|-------------------|----------|
| 安全性 | ✅ 不需要暴露 SSH 密钥 | ⚠️ 需要存储私钥 |
| 配置复杂度 | ✅ 简单 | ⚠️ 需要配置 Secrets |
| 执行速度 | ✅ 快（本地执行） | ⚠️ 慢（SSH 连接） |
| 稳定性 | ✅ 高 | ⚠️ 可能有网络问题 |
| 资源占用 | ⚠️ 占用 VPS 资源 | ✅ 使用 GitHub 资源 |
| 维护成本 | ⚠️ 需要维护 Runner | ✅ 无需维护 |

---

## 九、快速参考

**安装 Runner:**
```bash
mkdir -p ~/actions-runner && cd ~/actions-runner
# 从 GitHub 页面获取下载命令
./config.sh --url <REPO_URL> --token <TOKEN>
sudo ./svc.sh install
sudo ./svc.sh start
```

**日常管理:**
```bash
# 状态
sudo ./svc.sh status

# 重启
sudo ./svc.sh stop && sudo ./svc.sh start

# 查看日志
cd ~/actions-runner
docker compose logs -f
```

**卸载:**
```bash
sudo ./svc.sh stop
sudo ./svc.sh uninstall
./config.sh remove --token <REMOVAL_TOKEN>
```

---

**完成后，每次 push 代码到 main 分支，都会自动触发部署！** 🎉
