# KanBan 手动部署指南

适用于通过 `git clone` 直接部署到任何 Linux 服务器。

## 📋 最低系统要求

### 推荐配置
- **OS**: Ubuntu 20.04+, Debian 10+, CentOS 8+, RHEL 8+
- **CPU**: 2 核
- **内存**: 2GB
- **磁盘**: 10GB 可用空间
- **Docker**: 20.10+
- **Docker Compose**: v2.0+

### 老旧系统支持
如果你的服务器较老（CentOS 7, Ubuntu 16.04 等），也可以运行，但需要：
- **Docker**: 最低 17.06+
- **Docker Compose**: 最低 1.18+

## 🚀 部署步骤

### 1. 安装 Docker 和 Docker Compose

#### Ubuntu/Debian
```bash
# 更新包索引
sudo apt update

# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker

# 添加当前用户到 docker 组（避免每次使用 sudo）
sudo usermod -aG docker $USER
newgrp docker

# 安装 Docker Compose（如果没有）
sudo apt install docker-compose-plugin

# 验证安装
docker --version
docker compose version
```

#### CentOS/RHEL
```bash
# 安装 Docker
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install docker-ce docker-ce-cli containerd.io

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker

# 添加当前用户到 docker 组
sudo usermod -aG docker $USER
newgrp docker

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker --version
docker-compose --version
```

#### 老旧系统（CentOS 7, Ubuntu 16.04）
```bash
# 安装特定版本的 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装 Docker Compose v1（兼容性更好）
sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 如果使用 docker-compose v1，命令格式为：
# docker-compose up -d  （注意是破折号，不是空格）
```

### 2. 克隆项目代码

```bash
# 克隆仓库
cd ~
git clone https://github.com/coodersio/kanban.git
cd kanban

# 查看代码
ls -la
```

### 3. 配置环境变量

```bash
# 进入部署目录
cd deploy

# 创建 .env 文件
cat > .env << 'EOF'
# PostgreSQL 密码（请修改为强密码）
POSTGRES_PASSWORD=your_strong_password_here

# Session 密钥（请修改为随机字符串）
SESSION_SECRET=your_random_secret_key_here
EOF

# 查看配置
cat .env
```

**⚠️ 重要**：请修改 `.env` 文件中的密码和密钥！

生成随机密钥的方法：
```bash
# 生成随机密码
openssl rand -base64 32
```

### 4. 配置端口（可选）

如果需要修改端口（默认是 5003），编辑 `docker-compose.yml`：

```bash
vi docker-compose.yml
```

找到这一行：
```yaml
nginx:
  ports:
    - "5003:80"  # 左边的数字是服务器端口，可以修改
```

改成你需要的端口，例如：
```yaml
nginx:
  ports:
    - "8080:80"  # 使用 8080 端口
```

### 5. 配置防火墙

#### Ubuntu/Debian (ufw)
```bash
# 开放端口（假设使用 5003）
sudo ufw allow 5003/tcp
sudo ufw status
```

#### CentOS/RHEL (firewalld)
```bash
# 开放端口
sudo firewall-cmd --permanent --add-port=5003/tcp
sudo firewall-cmd --reload
sudo firewall-cmd --list-ports
```

#### 老旧系统 (iptables)
```bash
# 开放端口
sudo iptables -I INPUT -p tcp --dport 5003 -j ACCEPT
sudo service iptables save
```

### 6. 构建和启动容器

```bash
# 确保在 deploy 目录
cd ~/kanban/deploy

# 构建镜像（第一次部署或代码更新后）
docker compose build --no-cache

# 启动所有服务
docker compose up -d

# 查看容器状态
docker compose ps
```

预期输出：
```
NAME                IMAGE                   STATUS
kanban_backend      kanban-backend:latest   Up
kanban_frontend     kanban-frontend:latest  Up
kanban_nginx        nginx:alpine            Up
kanban_postgres     postgres:16             Up
```

### 7. 初始化数据库

```bash
# 等待后端启动（大约 10 秒）
sleep 10

# 运行数据库迁移
docker compose exec backend npm run migrate:up

# 创建初始数据（管理员账户 + 默认 Sprint）
docker compose exec backend npm run seed
```

### 8. 验证部署

```bash
# 查看容器日志
docker compose logs -f

# 测试后端健康检查
curl http://localhost:5003/health

# 从外部访问（替换为你的服务器 IP）
# 浏览器打开: http://YOUR_SERVER_IP:5003
```

**默认登录凭据**：
- 用户名: `admin`
- 密码: `admin123`

## 🔧 常见操作

### 查看日志
```bash
cd ~/kanban/deploy

# 查看所有日志
docker compose logs -f

# 查看特定服务日志
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f nginx
```

### 更新代码
```bash
cd ~/kanban

# 拉取最新代码
git pull origin main

# 重新构建和部署
cd deploy
docker compose down
docker compose build --no-cache
docker compose up -d

# 运行迁移（如果有数据库更改）
docker compose exec backend npm run migrate:up
```

### 重启服务
```bash
cd ~/kanban/deploy

# 重启所有服务
docker compose restart

# 重启特定服务
docker compose restart backend
docker compose restart nginx
```

### 停止服务
```bash
cd ~/kanban/deploy

# 停止所有服务（保留数据）
docker compose down

# 停止并删除所有数据（⚠️ 危险操作）
docker compose down -v
```

### 备份数据库
```bash
cd ~/kanban/deploy

# 导出数据库
docker compose exec postgres pg_dump -U kanban_user kanban_db > backup_$(date +%Y%m%d).sql

# 恢复数据库
docker compose exec -T postgres psql -U kanban_user kanban_db < backup_20240115.sql
```

## 🐛 故障排查

### 容器无法启动

```bash
# 查看详细错误
docker compose logs backend
docker compose logs frontend

# 检查端口占用
sudo netstat -tlnp | grep 5003
sudo lsof -i :5003
```

### 数据库连接失败

```bash
# 检查 PostgreSQL 容器
docker compose ps postgres

# 进入 PostgreSQL 容器
docker compose exec postgres psql -U kanban_user -d kanban_db

# 在 psql 中执行
\dt  # 查看表
\q   # 退出
```

### 内存不足

如果服务器内存少于 2GB，可以限制容器内存：

编辑 `docker-compose.yml`，在每个服务下添加：
```yaml
services:
  backend:
    # ... 其他配置
    deploy:
      resources:
        limits:
          memory: 512M
```

### Docker Compose 版本问题

**老系统使用 v1 语法**：
- 命令：`docker-compose` (带破折号)
- 配置文件可能需要版本号：在 `docker-compose.yml` 顶部添加 `version: '3.8'`

**新系统使用 v2 语法**：
- 命令：`docker compose` (空格)
- 不需要版本号

如果遇到语法错误，尝试：
```bash
# 检查版本
docker-compose --version

# 如果是 v1，所有命令改用 docker-compose
docker-compose up -d
docker-compose logs -f
docker-compose down
```

### 磁盘空间不足

```bash
# 清理无用的 Docker 资源
docker system prune -a

# 查看磁盘使用
df -h
docker system df
```

## 📊 性能优化

### 老旧服务器优化

**1. 减少并发构建进程**
```bash
# 单线程构建（减少内存使用）
docker compose build --no-cache --parallel 1
```

**2. 使用 Swap 分区（内存不足时）**
```bash
# 创建 2GB swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 永久生效
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

**3. 限制日志大小**

编辑 `docker-compose.yml`，在顶层添加：
```yaml
x-logging: &default-logging
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"

services:
  backend:
    logging: *default-logging
    # ... 其他配置

  frontend:
    logging: *default-logging
    # ... 其他配置
```

## 🔒 安全建议

1. **修改默认密码**
   - 登录后立即修改 admin 密码
   - 修改 .env 中的 POSTGRES_PASSWORD

2. **防火墙配置**
   - 只开放必要的端口（5003, 22）
   - 不要开放 5432 (PostgreSQL) 端口

3. **定期更新**
   ```bash
   # 更新系统包
   sudo apt update && sudo apt upgrade  # Ubuntu/Debian
   sudo yum update                       # CentOS/RHEL

   # 更新 Docker 镜像
   docker compose pull
   docker compose up -d
   ```

4. **启用 HTTPS（推荐）**
   - 使用 Certbot + Let's Encrypt 获取免费证书
   - 修改 Nginx 配置启用 SSL

## 📞 获取帮助

如果遇到问题：

1. **查看日志**
   ```bash
   docker compose logs -f
   ```

2. **检查系统资源**
   ```bash
   free -h        # 内存
   df -h          # 磁盘
   top            # CPU
   ```

3. **验证网络连接**
   ```bash
   docker compose exec backend ping postgres
   docker compose exec frontend ping backend
   ```

## 🎯 快速命令参考

```bash
# 部署
cd ~/kanban/deploy
docker compose up -d

# 更新
git pull && cd deploy && docker compose up -d --build

# 查看状态
docker compose ps

# 查看日志
docker compose logs -f backend

# 重启
docker compose restart

# 停止
docker compose down

# 备份数据库
docker compose exec postgres pg_dump -U kanban_user kanban_db > backup.sql

# 进入容器
docker compose exec backend sh
docker compose exec postgres psql -U kanban_user -d kanban_db
```

---

**访问地址**: `http://YOUR_SERVER_IP:5003`
**默认账户**: admin / admin123
