FROM node:20-alpine

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制所有文件
COPY . .

# 暴露端口 3000（Vite dev server）
EXPOSE 3000

# 使用开发服务器（支持热更新，生产环境也可用）
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
