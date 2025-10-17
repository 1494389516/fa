FROM golang:1.23-alpine AS builder

ENV GOPROXY=https://goproxy.cn,direct

WORKDIR /app

# 复制 go mod 文件
COPY gateway/go.mod gateway/go.sum ./
RUN go mod download

# 复制源码
COPY gateway/main.go ./

# 编译
RUN CGO_ENABLED=0 GOOS=linux go build -o gateway main.go

# 运行阶段
FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/

COPY --from=builder /app/gateway .

EXPOSE 8080

CMD ["./gateway"]

