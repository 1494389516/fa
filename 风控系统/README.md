# 实时流量风控系统

本项目是一个基于微服务架构的实时流量风控系统，旨在检测和缓解恶意网络流量。它利用 Nginx/LuaJIT 作为高性能边缘网关，通过 Kafka 将流量数据分发至后端服务进行实时分析和模型训练。

## 🚀 快速启动

我们提供了智能部署脚本，可以自动检测您的环境并简化启动流程。

### 1. 环境准备

- **Docker**: 确保您的系统已安装 Docker 和 Docker Compose。
  - [Windows/macOS 安装 Docker Desktop](https://docs.docker.com/desktop/install/)
  - [Linux 安装 Docker Engine](https://docs.docker.com/engine/install/)

### 2. 运行部署脚本

打开您的终端，然后根据您的操作系统运行对应的命令：

- **对于 Linux, macOS, 或 WSL 用户**:
  ```bash
  # 赋予脚本执行权限
  chmod +x deploy.sh

  # 运行智能部署脚本
  ./deploy.sh
  ```
  脚本将引导您完成后续步骤。

- **对于 Windows (PowerShell) 用户**:
  ```powershell
  # 运行 PowerShell 部署脚本
  ./deploy.ps1
  ```
  脚本将检查您的环境并启动所有服务。

脚本会自动处理 `.env` 配置文件的创建和检查。您只需按照提示操作即可。

### 3. 访问服务

部署成功后，可以通过以下地址访问各个服务的 Web 界面：

- **管理后台**: `http://localhost:3001`
- **Grafana 监控面板**: `http://localhost:3000` (默认用户名: `admin`, 密码: `admin`)
- **Kafka UI (Kafdrop)**: `http://localhost:9090`

### 4. 停止服务

要停止所有正在运行的服务，请在项目根目录运行：
```bash
# 对于 Linux/macOS/WSL
docker compose down

# 对于 Windows PowerShell
docker-compose down
```

## 💻 前端开发

如果您想对 `web/admin` 管理面板进行本地开发和调试，请按照以下步骤操作：

1.  **进入目录**:
    ```bash
    cd web/admin
    ```

2.  **解压缩并安装依赖**:
    > **注意**: `node_modules` 目录已从版本库中移除以减小体积。在开始开发前，您需要手动运行以下命令来下载并安装所有依赖。
    ```bash
    npm install
    ```

3.  **启动开发服务器**:
    ```bash
    npm run dev
    ```
    现在，您可以在 Vite 指定的端口（默认为 `http://localhost:5173`）访问开发版本的管理面板。

## 系统架构

本系统由多个协同工作的微服务组成：

- **边缘网关 (`edge-gateway`)**: 基于 **OpenResty (Nginx + LuaJIT)** 构建，是系统的流量入口。它负责初步的请求过滤、速率限制，并将流量数据推送到 Kafka。
- **流处理服务 (`stream-processor`)**: 一个 **Java/Flink** 应用，负责从 Kafka 消费数据，进行实时的数据聚合与特征工程。
- **机器学习推理服务 (`ml-inference`)**: 一个使用 **Rust** 和 **Actix Web** 构建的高性能服务。它加载由训练服务生成的 ONNX 模型，对实时数据进行快速的风险评分。
- **模型训练服务 (`ml-training`)**: 一个使用 **Python**、**PyTorch** 和 **Scikit-learn** 的服务，用于离线训练和更新机器学习模型。
- **支持服务**:
  - **PostgreSQL**: 用于存储元数据和分析结果。
  - **Redis**: 用于高速缓存，如IP黑名单、速率限制计数等。
  - **Kafka**: 作为系统各组件之间解耦的异步消息总线。
  - **Prometheus & Grafana**: 用于系统的监控和指标可视化。

## 目录结构

```
.
├── deploy.sh               # 一键部署脚本
├── docker-compose.yml      # Docker Compose 核心配置文件
├── .env.example            # 环境变量模板文件
├── services/               # 各个微服务的源代码
│   ├── edge-gateway/       # Nginx/LuaJIT 边缘网关
│   ├── ml-inference/       # Rust 机器学习推理服务
│   ├── ml-training/        # Python 模型训练服务
│   └── stream-processor/   # Java/Flink 流处理服务
├── monitoring/             # Prometheus 和 Grafana 的配置文件
├── data/                   # 用于模型训练的示例数据集
└── ...
```

关于每个服务的更详细信息，请查阅其对应目录下的 `README.md` 文件。