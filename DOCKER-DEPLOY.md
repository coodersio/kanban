# KanBan - Docker 部署指南

简化版 Docker + GitHub Actions 自动部署方案

---

## 📦 部署架构

```
VPS 服务器
├── Nginx (5003端口) - 反向代理
├── Frontend (5001端口) - React + Vite
├── Backend (5002端口) - Node.js + Express
└── PostgreSQL (内部) - 数据库
```

访问地址：`http://VPS_IP:5003`

---

## 一、VPS 环境准备

### 1. 安装 Docker

**Ubuntu/Debian:**
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Docker（自动包含 Compose 插件）
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker

# 验证安装
docker --version
docker compose version

# 如果 docker compose 命令不存在，手动安装插件
# sudo apt install docker-compose-plugin
```

**CentOS/RHEL:**
```bash
# 安装 Docker
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker

# 验证安装
docker --version
docker compose version
```

**注意：** 如果 `docker compose version` 提示命令不存在：
- Ubuntu/Debian: `sudo apt install docker-compose-plugin`
- CentOS/RHEL: `sudo yum install docker-compose-plugin`

### 2. 配置 Docker 权限

```bash
# 将当前用户添加到 docker 组（避免每次都用 sudo）
sudo usermod -aG docker $USER

# 重新登录或执行以下命令使权限生效
newgrp docker

# 验证权限（不需要 sudo）
docker ps
```

### 3. 创建项目目录

```bash
# 创建项目目录
sudo mkdir -p /opt/kanban

# 设置目录所有者（替换 your_username 为您的用户名）
sudo chown -R $USER:$USER /opt/kanban

# 验证权限
ls -ld /opt/kanban
```

### 4. 配置防火墙

**Ubuntu/Debian (ufw):**
```bash
sudo ufw allow 80/tcp      # Nginx HTTP
sudo ufw allow 22/tcp      # SSH
sudo ufw enable
sudo ufw status
```

**CentOS/RHEL (firewalld):**
```bash
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --reload
sudo firewall-cmd --list-all
```

---

## 二、首次部署

### 1. 上传代码到 VPS

**方式A: 使用 Git（推荐）**
```bash
# 在 VPS 上克隆代码
cd /opt
git clone https://github.com/your-username/kanban.git
cd kanban

# 如果仓库是私有的，需要配置 SSH Key 或使用 Personal Access Token
```

**方式B: 使用 scp/sftp**
```bash
# 在本地执行（压缩并上传）
cd /path/to/local/kanban
tar -czf kanban.tar.gz .
scp kanban.tar.gz user@vps_ip:/opt/

# 在 VPS 上解压
ssh user@vps_ip
cd /opt
mkdir kanban
tar -xzf kanban.tar.gz -C kanban
cd kanban
```

### 2. 配置环境变量

```bash
# 在 VPS 上创建环境变量文件
cd /opt/kanban/deploy
nano .env
```

写入以下内容：
```env
POSTGRES_PASSWORD=your_secure_password_here
```

保存并退出（Ctrl+O, Enter, Ctrl+X）

### 3. 首次构建和启动

```bash
# 进入 deploy 目录
cd /opt/kanban/deploy

# 构建镜像（首次较慢，约 5-10 分钟）
docker compose build

# 启动所有服务
docker compose up -d

# 查看启动状态
docker compose ps

# 查看日志
docker compose logs -f
```

### 4. 初始化数据库

```bash
# 运行数据库迁移
docker compose exec backend npm run migrate:up

# 创建初始数据（admin 账户）
docker compose exec backend npm run seed
```

### 5. 验证部署

```bash
# 检查所有容器是否运行
docker compose ps

# 应该看到 4 个容器都是 Up 状态：
# - kanban_nginx
# - kanban_frontend
# - kanban_backend
# - kanban_postgres
```

访问 `http://VPS_IP`，使用默认账户登录：
- 用户名: `admin`
- 密码: `admin123`

---

## 三、配置 GitHub Actions 自动部署

本项目使用 **Self-hosted Runner** 在 VPS 上自动部署，每次提交代码到 main 分支即可自动触发。

### 步骤：在 VPS 上安装 GitHub Runner

详细步骤请查看：**[SELF-HOSTED-RUNNER.md](./SELF-HOSTED-RUNNER.md)**

**快速安装：**

```bash
# 1. 在 GitHub 仓库获取 Runner Token
# Settings → Actions → Runners → New self-hosted runner

# 2. 在 VPS 上执行（使用 GitHub 页面提供的命令）
mkdir -p ~/actions-runner && cd ~/actions-runner
curl -o actions-runner-linux-x64.tar.gz -L <GITHUB_URL>
tar xzf ./actions-runner-linux-x64.tar.gz
./config.sh --url https://github.com/your-username/kanban --token <YOUR_TOKEN>

# 3. 安装为系统服务
sudo ./svc.sh install
sudo ./svc.sh start

# 4. 验证状态
sudo ./svc.sh status
```

### 测试自动部署

```bash
# 提交代码触发部署
git add .
git commit -m "test: trigger deploy"
git push origin main

# 在 GitHub 查看 Actions 执行情况
# 仓库页面 → Actions → 查看运行日志
```

---

## 四、日常管理命令

### 查看服务状态

```bash
cd /opt/kanban/deploy

# 查看所有容器状态
docker-compose ps

# 查看实时日志
docker compose logs -f

# 查看特定服务日志
docker compose logs -f frontend
docker compose logs -f backend
docker compose logs -f postgres
```

### 重启服务

```bash
cd /opt/kanban/deploy

# 重启所有服务
docker compose restart

# 重启特定服务
docker compose restart frontend
docker compose restart backend
```

### 停止/启动服务

```bash
cd /opt/kanban/deploy

# 停止所有服务
docker compose down

# 启动所有服务
docker compose up -d
```

### 手动更新部署

```bash
cd /opt/kanban

# 拉取最新代码
git pull origin main

# 重新构建并启动
cd deploy
docker compose down
docker compose build --no-cache
docker compose up -d

# 运行数据库迁移
docker compose exec backend npm run migrate:up
```

### 数据库操作

```bash
cd /opt/kanban/deploy

# 连接数据库
docker compose exec postgres psql -U kanban_user -d kanban_db

# 备份数据库
docker compose exec postgres pg_dump -U kanban_user kanban_db > backup_$(date +%Y%m%d).sql

# 恢复数据库
docker compose exec -T postgres psql -U kanban_user -d kanban_db < backup_20260110.sql
```

### 清理 Docker 资源

```bash
# 清理无用镜像
docker image prune -f

# 清理无用容器
docker container prune -f

# 清理无用卷（注意：会删除未使用的数据！）
docker volume prune -f

# 清理所有未使用资源
docker system prune -a -f
```

---

## 五、常见问题

### 1. 端口被占用

```bash
# 查看端口占用
sudo netstat -tulnp | grep :80
sudo lsof -i :80

# 杀掉占用进程
sudo kill -9 <PID>
```

### 2. 容器无法启动

```bash
# 查看详细错误日志
docker compose logs backend
docker compose logs frontend

# 检查配置文件
cat /opt/kanban/deploy/.env
cat /opt/kanban/deploy/docker-compose.yml
```

### 3. 无法访问应用

```bash
# 检查 Nginx 容器状态
docker-compose ps nginx

# 检查防火墙
sudo ufw status
sudo firewall-cmd --list-all

# 检查 Nginx 配置
docker compose exec nginx cat /etc/nginx/nginx.conf

# 重启 Nginx
docker compose restart nginx
```

### 4. 数据库连接失败

```bash
# 检查数据库容器
docker-compose ps postgres

# 查看数据库日志
docker compose logs postgres

# 测试数据库连接
docker compose exec postgres psql -U kanban_user -d kanban_db -c "SELECT 1;"
```

### 5. GitHub Actions 部署失败

常见原因：
- **Runner 离线**：检查 VPS 上的 runner 服务状态
  ```bash
  cd ~/actions-runner
  sudo ./svc.sh status
  sudo ./svc.sh start
  ```
- **Docker 权限不足**：确保 runner 用户有 Docker 权限
  ```bash
  sudo usermod -aG docker $USER
  newgrp docker
  ```
- **环境变量缺失**：检查 `/opt/kanban/deploy/.env` 文件
- **端口占用**：检查 80 端口是否被占用

调试方法：
```bash
# 查看 GitHub Actions 日志（在 GitHub 网页上）
# 仓库 → Actions → 点击失败的 workflow

# 在 VPS 上手动执行部署步骤
cd /opt/kanban
git pull origin main
cd deploy
docker compose down
docker compose build --no-cache
docker compose up -d
```

---

## 六、本地测试

在部署到 VPS 之前，建议先在本地测试 Docker 构建：

```bash
# 进入项目目录
cd /path/to/kanban/deploy

# 创建 .env 文件
echo "POSTGRES_PASSWORD=test123" > .env

# 启动服务
docker compose up -d

# 查看日志
docker compose logs -f

# 访问应用
# 浏览器打开: http://localhost

# 停止服务
docker compose down
```

---

## 七、项目文件清单

部署相关文件：
```
KanBan/
├── frontend/
│   ├── Dockerfile              ✅ 前端镜像配置
│   └── .dockerignore           ✅ 忽略文件
├── backend/
│   ├── Dockerfile              ✅ 后端镜像配置
│   └── .dockerignore           ✅ 忽略文件
├── deploy/
│   ├── docker-compose.yml      ✅ 服务编排
│   ├── nginx.conf              ✅ Nginx 配置
│   └── .env                    ⚠️  需要手动创建（包含密码）
└── .github/
    └── workflows/
        └── deploy.yml          ✅ 自动部署流程
```

---

## 八、安全建议

1. **修改默认密码**
   - 首次登录后立即修改 admin 账户密码

2. **保护数据库密码**
   - 使用强密码（`POSTGRES_PASSWORD`）
   - 不要提交 `.env` 文件到 Git

3. **限制 SSH 访问**
   ```bash
   # 修改 SSH 端口（可选）
   sudo nano /etc/ssh/sshd_config
   # 改为: Port 2222
   sudo systemctl restart sshd
   ```

4. **定期备份数据库**
   ```bash
   # 添加 cron 任务每天备份
   crontab -e
   # 添加: 0 2 * * * cd /opt/kanban/deploy && docker compose exec -T postgres pg_dump -U kanban_user kanban_db > /opt/backups/kanban_$(date +\%Y\%m\%d).sql
   ```

5. **定期更新系统**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

---

## 九、部署检查清单

首次部署前确认：

- [ ] VPS 已安装 Docker 和 Docker Compose 插件
- [ ] Docker 权限已配置（可以无 sudo 运行）
- [ ] 项目目录 `/opt/kanban` 已创建并设置权限
- [ ] 防火墙已开放 80 和 22 端口
- [ ] 代码已上传到 VPS（git clone）
- [ ] 环境变量文件 `.env` 已创建
- [ ] 本地测试已通过
- [ ] GitHub Self-hosted Runner 已安装并运行
- [ ] Runner 状态显示为 Idle（绿色）

---

## 十、技术支持

遇到问题时的排查顺序：
1. 查看容器日志：`docker compose logs -f`
2. 检查容器状态：`docker-compose ps`
3. 查看本文档的"常见问题"部分
4. 检查 GitHub Actions 执行日志

---

**部署完成后访问地址:** `http://VPS_IP`

**默认账户:**
- 用户名: `admin`
- 密码: `admin123`

⚠️ **请立即修改默认密码！**
