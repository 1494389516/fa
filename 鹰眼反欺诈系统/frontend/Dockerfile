FROM node:18-alpine AS builder

WORKDIR /app

# 复制package文件
COPY package*.json ./

# 设置npm镜像加速
RUN npm config set registry https://registry.npmmirror.com

# 安装依赖
RUN npm install

# 复制源码
COPY . .

# 构建（生产环境，API会通过nginx代理）
RUN npm run build

# 运行阶段 - 使用nginx
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制nginx配置
RUN echo 'server { \
    listen 80; \
    server_name _; \
    \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
    } \
    \
    location /api/ { \
        proxy_pass http://go-gateway:8080/api/; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

