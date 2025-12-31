# KanBan 周报系统 - 部署指南

简单快速的部署方案，4步完成部署。

---

## 前置要求

- **操作系统:** Ubuntu 20.04+ / CentOS 8+
- **Docker:** 20.10+
- **Node.js:** 20+
- **端口:** 3003 (前端), 4004 (后端), 5432 (数据库)

---

## 快速部署 (5分钟)

### 1. 安装环境

**Ubuntu/Debian:**
```bash
# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
docker --version
node --version
npm --version
```

**CentOS/RHEL:**
```bash
# 安装 Docker
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io
sudo systemctl start docker
sudo systemctl enable docker

# 安装 Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# 验证安装
docker --version
node --version
npm --version
```

### 2. 上传代码

```bash
# 创建项目目录
sudo mkdir -p /opt/kanban
sudo chown -R $(whoami):$(whoami) /opt/kanban

# 上传代码到 /opt/kanban
# 使用 scp, sftp 或 git clone
```

### 3. 一键部署

```bash
# 进入部署目录
cd /opt/kanban/deploy

# 赋予执行权限
chmod +x deploy.sh stop.sh

# 创建日志目录
mkdir -p /opt/kanban/logs

# 执行部署
./deploy.sh
```

**部署过程:**
1. ✓ 环境检查 (Docker, Node.js)
2. ✓ 启动数据库 (PostgreSQL)
3. ✓ 数据初始化 (创建表, 默认账户)
4. ✓ 启动后端 (端口 4004)
5. ✓ 启动前端 (端口 3003)

### 4. 访问应用

```
浏览器打开: http://服务器IP:3003

默认账户:
  用户名: admin
  密码: admin123

⚠️  请立即修改默认密码！
```

---

## 管理命令

### 停止服务
```bash
cd /opt/kanban/deploy
./stop.sh
```

### 重启服务
```bash
cd /opt/kanban/deploy
./stop.sh
./deploy.sh
```

### 查看日志
```bash
# 后端日志
tail -f /opt/kanban/logs/backend.log

# 前端日志
tail -f /opt/kanban/logs/frontend.log

# 数据库日志
docker-compose logs -f postgres
```

### 查看运行状态
```bash
# 查看进程
ps aux | grep node

# 查看端口
netstat -tulnp | grep -E "3003|4004|5432"

# 查看数据库
docker-compose ps
```

---

## 数据库管理

### 连接数据库
```bash
cd /opt/kanban/deploy
docker-compose exec postgres psql -U kanban_user -d kanban_db
```

### 备份数据库
```bash
# 创建备份
docker-compose exec postgres pg_dump -U kanban_user kanban_db > backup_$(date +%Y%m%d).sql

# 压缩备份
gzip backup_$(date +%Y%m%d).sql
```

### 恢复数据库
```bash
# 解压备份
gunzip backup_20250131.sql.gz

# 恢复数据
docker-compose exec -T postgres psql -U kanban_user -d kanban_db < backup_20250131.sql
```

---

## 更新应用

```bash
# 1. 停止服务
cd /opt/kanban/deploy
./stop.sh

# 2. 备份数据库
docker-compose exec postgres pg_dump -U kanban_user kanban_db > backup_before_update.sql

# 3. 更新代码
cd /opt/kanban
git pull
# 或重新上传代码

# 4. 重新部署
cd /opt/kanban/deploy
./deploy.sh
```

---

## 防火墙配置

```bash
# Ubuntu/Debian
sudo ufw allow 3003/tcp
sudo ufw allow 22/tcp  # SSH
sudo ufw enable

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3003/tcp
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --reload
```

---

## 常见问题

### 1. 端口被占用
```bash
# 查看端口占用
netstat -tulnp | grep 3003
netstat -tulnp | grep 4004
netstat -tulnp | grep 5432

# 杀掉占用进程
sudo kill -9 <PID>
```

### 2. 无法访问应用
```bash
# 检查服务是否运行
ps aux | grep node

# 检查防火墙
sudo ufw status
sudo firewall-cmd --list-all

# 检查日志
tail -f /opt/kanban/logs/backend.log
tail -f /opt/kanban/logs/frontend.log
```

### 3. 数据库连接失败
```bash
# 检查数据库是否运行
docker-compose ps

# 重启数据库
docker-compose restart postgres

# 查看数据库日志
docker-compose logs postgres
```

---

## 目录结构

```
/opt/kanban/
├── backend/              # 后端代码
├── frontend/             # 前端代码
├── deploy/               # 部署文件
│   ├── docker-compose.yml
│   ├── deploy.sh
│   ├── stop.sh
│   └── README.md
└── logs/                 # 日志目录
    ├── backend.log
    ├── frontend.log
    ├── backend.pid
    └── frontend.pid
```

---

## 安全建议

1. **立即修改默认密码** - 首次登录后修改 admin 账户密码
2. **修改数据库密码** - 编辑 `deploy/docker-compose.yml` 中的 `POSTGRES_PASSWORD`
3. **配置防火墙** - 只开放必要的端口 (3003, 22)
4. **定期备份** - 设置自动备份任务
5. **定期更新** - 及时更新系统和应用

---

## 技术支持

- 详细文档: `/opt/kanban/DEVELOPER-GUIDE.md`
- 架构设计: `/opt/kanban/方案/architecture-design-final.md`
- Claude Code: `/opt/kanban/CLAUDE.md`
