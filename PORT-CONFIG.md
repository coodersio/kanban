# KanBan 项目端口配置说明

## 📋 端口映射总览

```
外部访问                    VPS 端口        Docker 容器
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
浏览器访问应用
http://VPS_IP:5003    →    5003     →    Nginx 容器:80
                                              ↓
                                         路由分发
                                              ↓
                           ┌──────────────────┴──────────────────┐
                           ↓                                     ↓
                      前端容器:5001                        后端容器:5002
                      (仅内部访问)                        (仅内部访问)
                                                                ↓
                                                         PostgreSQL:5432
                                                         (仅内部访问)
```

## 🔌 端口详细说明

| 服务 | VPS 端口 | 容器内部端口 | 外部可访问 | 说明 |
|------|---------|-------------|-----------|------|
| **Nginx** | 5003 | 80 | ✅ 是 | 反向代理入口 |
| **Frontend** | - | 5001 | ❌ 否 | 仅通过 Nginx 访问 |
| **Backend** | - | 5002 | ❌ 否 | 仅通过 Nginx 访问 |
| **PostgreSQL** | - | 5432 | ❌ 否 | 仅容器内部访问 |

## 🌐 访问方式

### 用户访问
```
http://VPS_IP:5003              → 前端应用
http://VPS_IP:5003/api/...      → 后端 API
```

### 内部通信（Docker 网络）
```
frontend 容器 → backend 容器
http://backend:5002

backend 容器 → postgres 容器
postgresql://kanban_user:password@postgres:5432/kanban_db
```

## 🔥 防火墙配置

### 需要开放的端口

**Ubuntu/Debian:**
```bash
sudo ufw allow 5003/tcp    # KanBan 应用
sudo ufw allow 22/tcp      # SSH
sudo ufw status
```

**CentOS/RHEL:**
```bash
sudo firewall-cmd --permanent --add-port=5003/tcp
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --reload
```

### 不需要开放的端口

- ❌ 5001 (前端) - 仅内部访问
- ❌ 5002 (后端) - 仅内部访问
- ❌ 5432 (PostgreSQL) - 仅内部访问

## 📝 为什么使用 5003？

1. **VPS 的 80 端口已被占用** - 用于其他服务
2. **5001/5002 不对外暴露** - 通过 Nginx 代理访问，更安全
3. **统一入口** - 用户只需要记住一个地址

## 🔧 如何修改端口

### 修改 Nginx 对外端口

编辑 `deploy/docker-compose.yml`:

```yaml
nginx:
  ports:
    - "5003:80"  # 修改左边的数字（VPS 端口）
      ↑
      改成其他端口，比如 8080
```

修改后：
```yaml
nginx:
  ports:
    - "8080:80"  # 新的访问地址: http://VPS_IP:8080
```

### 修改前端/后端内部端口

一般不需要修改，但如果需要：

**前端 (frontend/vite.config.ts):**
```typescript
server: {
  port: 5001,  // 修改这里
}
```

**后端 (backend/.env):**
```env
PORT=5002  # 修改这里
```

同时需要更新 `deploy/nginx.conf`:
```nginx
upstream frontend {
    server frontend:5001;  # 改成新端口
}

upstream backend {
    server backend:5002;   # 改成新端口
}
```

## ⚠️ 常见问题

### Q: 为什么不直接暴露 5001 和 5002？

**A:** 使用 Nginx 反向代理有以下优点：
- ✅ 统一入口（一个端口访问所有服务）
- ✅ 更安全（前后端不直接暴露）
- ✅ 灵活路由（根据路径分发请求）
- ✅ 易于添加 HTTPS
- ✅ 标准的生产环境架构

### Q: 如果 5003 端口也被占用怎么办？

**A:** 修改 `docker-compose.yml` 中的端口映射：
```yaml
nginx:
  ports:
    - "5004:80"  # 或任何未被占用的端口
```

### Q: 如何查看端口占用情况？

```bash
# 查看所有监听端口
sudo netstat -tlnp

# 查看特定端口
sudo lsof -i :5003

# 查看 Docker 容器端口映射
docker compose ps
```

## 🎯 快速验证

部署完成后：

```bash
# 1. 检查容器状态
docker compose ps

# 2. 测试端口连通性
curl http://localhost:5003

# 3. 从外部访问
# 浏览器打开: http://VPS_IP:5003

# 4. 查看 Nginx 日志
docker compose logs -f nginx
```

---

**当前配置访问地址:** `http://VPS_IP:5003`
