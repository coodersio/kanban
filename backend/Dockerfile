FROM node:20-alpine

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装所有依赖（包括 devDependencies，因为需要编译 TypeScript）
RUN npm ci

# 复制所有文件
COPY . .

# 编译 TypeScript
RUN npm run build

# 保留所有依赖（迁移脚本需要 pg 等模块）
# RUN npm prune --production

# 暴露端口
EXPOSE 5002

# 启动命令
CMD ["npm", "start"]
