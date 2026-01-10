# KanBan 部署指南

## 🚀 一键部署（推荐）

最简单的方式，适合任何 Linux 服务器：

```bash
# 1. 克隆项目
git clone https://github.com/coodersio/kanban.git
cd kanban/deploy

# 2. 运行安装脚本
./install.sh
```

脚本会自动完成：
- ✅ 检测并安装 Docker
- ✅ 检测并安装 Docker Compose
- ✅ 配置防火墙
- ✅ 生成安全密码
- ✅ 构建和启动服务
- ✅ 初始化数据库

**安装时间**: 约 5-10 分钟（取决于网络速度）

---

## 📖 手动部署

如果一键脚本不适用，参考详细的手动部署文档：

👉 [查看完整部署文档](../MANUAL-DEPLOY.md)

### 基本步骤

```bash
# 1. 安装 Docker 和 Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 2. 克隆项目
git clone https://github.com/coodersio/kanban.git
cd kanban/deploy

# 3. 创建环境变量
cat > .env << 'ENVEOF'
POSTGRES_PASSWORD=your_password_here
SESSION_SECRET=your_secret_here
ENVEOF

# 4. 启动服务
docker compose up -d

# 5. 初始化数据库
docker compose exec backend npm run migrate:up
docker compose exec backend npm run seed
```

---

## 🔧 最低系统要求

### 推荐配置
- **OS**: Ubuntu 20.04+, CentOS 8+
- **CPU**: 2 核
- **内存**: 2GB
- **磁盘**: 10GB

### 老旧系统支持
- **OS**: Ubuntu 16.04+, CentOS 7+
- **Docker**: 17.06+
- **Docker Compose**: 1.18+

**支持的系统**：
- ✅ Ubuntu 16.04, 18.04, 20.04, 22.04
- ✅ Debian 9, 10, 11, 12
- ✅ CentOS 7, 8, 9
- ✅ RHEL 7, 8, 9
- ✅ Rocky Linux 8, 9
- ✅ AlmaLinux 8, 9

---

## 📞 常见问题

### Q: 老旧服务器可以运行吗？

**A**: 可以！只要能安装 Docker 17.06+ 和 Docker Compose 1.18+ 即可。

如果服务器是 CentOS 7 或 Ubuntu 16.04，使用 `docker-compose`（带破折号）命令：

```bash
# 安装 Docker Compose v1
sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 使用 docker-compose 命令
docker-compose up -d
docker-compose logs -f
```

### Q: 内存不足怎么办？

**A**: 如果内存少于 2GB，可以：

1. 创建 Swap 分区：
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

2. 限制容器内存（编辑 `docker-compose.yml`）：
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
```

### Q: 端口被占用怎么办？

**A**: 修改 `docker-compose.yml` 中的端口映射：

```yaml
nginx:
  ports:
    - "8080:80"  # 改成其他端口
```

### Q: 如何查看日志？

```bash
cd ~/kanban/deploy

# 所有日志
docker compose logs -f

# 特定服务
docker compose logs -f backend
docker compose logs -f frontend
```

### Q: 如何更新代码？

```bash
cd ~/kanban
git pull origin main
cd deploy
docker compose up -d --build
docker compose exec backend npm run migrate:up
```

### Q: 如何备份数据？

```bash
cd ~/kanban/deploy

# 导出数据库
docker compose exec postgres pg_dump -U kanban_user kanban_db > backup_$(date +%Y%m%d).sql

# 恢复数据库
docker compose exec -T postgres psql -U kanban_user kanban_db < backup_20240115.sql
```

---

## 🎯 访问应用

部署完成后：

1. **打开浏览器**: `http://YOUR_SERVER_IP:5003`
2. **使用默认账户登录**:
   - 用户名: `admin`
   - 密码: `admin123`
3. **修改密码**: 登录后立即修改管理员密码

---

## 📚 更多文档

- [完整部署文档](../MANUAL-DEPLOY.md) - 详细的步骤和故障排查
- [端口配置说明](../PORT-CONFIG.md) - 端口架构和修改方法
- [GitHub Actions 部署](../.github/workflows/deploy.yml) - 自动化部署配置

---

## 🆘 需要帮助？

如果遇到问题：

1. 查看日志: `docker compose logs -f`
2. 检查容器状态: `docker compose ps`
3. 参考[完整文档](../MANUAL-DEPLOY.md)的故障排查章节

