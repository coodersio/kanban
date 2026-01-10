# 多阶段构建 - 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制所有文件
COPY . .

# 构建应用
RUN npm run build

# 生产阶段
FROM node:20-alpine

WORKDIR /app

# 从构建阶段复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# 只安装生产依赖
RUN npm ci --production

# 暴露端口
EXPOSE 5001

# 启动命令
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5001"]
