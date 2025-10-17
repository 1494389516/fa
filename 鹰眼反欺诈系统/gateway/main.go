package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"sync"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// 配置
type Config struct {
	Port         string
	RedisAddr    string
	PythonAPIURL string
	RustAPIURL   string
	MaxQPS       int
	TimeoutMs    int
}

// 检测请求
type DetectionRequest struct {
	UserID    string                 `json:"user_id" binding:"required"`
	ItemID    string                 `json:"item_id"`
	Amount    float64                `json:"amount"`
	Timestamp float64                `json:"timestamp"`
	IP        string                 `json:"ip"`
	DeviceID  string                 `json:"device_id"`
	Action    string                 `json:"action"`
	Features  map[string]interface{} `json:"features"`
}

// 检测响应
type DetectionResponse struct {
	UserID           string   `json:"user_id"`
	RiskScore        float64  `json:"risk_score"`
	RiskLevel        string   `json:"risk_level"`
	FraudProbability float64  `json:"fraud_probability"`
	DetectedPatterns []string `json:"detected_patterns"`
	DefenseLayers    []int    `json:"defense_layers"`
	Timestamp        float64  `json:"timestamp"`
	ResponseTimeMs   float64  `json:"response_time_ms"`
	ProcessedBy      string   `json:"processed_by"`
}

// Prometheus 指标
var (
	requestsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "fraud_detection_requests_total",
			Help: "Total number of fraud detection requests",
		},
		[]string{"endpoint", "status"},
	)

	requestDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "fraud_detection_request_duration_seconds",
			Help:    "Request duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"endpoint"},
	)

	fraudDetectedTotal = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "fraud_detected_total",
			Help: "Total number of fraud cases detected",
		},
	)

	activeRequests = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Name: "fraud_detection_active_requests",
			Help: "Number of active requests",
		},
	)
)

func init() {
	// 注册 Prometheus 指标
	prometheus.MustRegister(requestsTotal)
	prometheus.MustRegister(requestDuration)
	prometheus.MustRegister(fraudDetectedTotal)
	prometheus.MustRegister(activeRequests)
}

// API 网关
type APIGateway struct {
	config      *Config
	redisClient *redis.Client
	rateLimiter *RateLimiter
	httpClient  *http.Client
	stats       *Stats
	mu          sync.RWMutex
}

// 统计信息
type Stats struct {
	TotalRequests   int64
	FraudDetected   int64
	AvgResponseTime float64
	RequestsPerSec  float64
	LastResetTime   time.Time
}

// 速率限制器
type RateLimiter struct {
	maxQPS    int
	tokens    int
	lastReset time.Time
	mu        sync.Mutex
}

func NewRateLimiter(maxQPS int) *RateLimiter {
	return &RateLimiter{
		maxQPS:    maxQPS,
		tokens:    maxQPS,
		lastReset: time.Now(),
	}
}

func (rl *RateLimiter) Allow() bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	// 每秒重置
	if now.Sub(rl.lastReset) >= time.Second {
		rl.tokens = rl.maxQPS
		rl.lastReset = now
	}

	if rl.tokens > 0 {
		rl.tokens--
		return true
	}

	return false
}

func NewAPIGateway(config *Config) *APIGateway {
	// Redis 客户端
	redisClient := redis.NewClient(&redis.Options{
		Addr: config.RedisAddr,
	})

	return &APIGateway{
		config:      config,
		redisClient: redisClient,
		rateLimiter: NewRateLimiter(config.MaxQPS),
		httpClient: &http.Client{
			Timeout: time.Duration(config.TimeoutMs) * time.Millisecond,
		},
		stats: &Stats{
			LastResetTime: time.Now(),
		},
	}
}

// 处理检测请求
func (gw *APIGateway) HandleDetection(c *gin.Context) {
	startTime := time.Now()
	activeRequests.Inc()
	defer activeRequests.Dec()

	// 速率限制
	if !gw.rateLimiter.Allow() {
		requestsTotal.WithLabelValues("/detect", "rate_limited").Inc()
		c.JSON(http.StatusTooManyRequests, gin.H{
			"error": "Rate limit exceeded",
		})
		return
	}

	// 解析请求
	var req DetectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		requestsTotal.WithLabelValues("/detect", "bad_request").Inc()
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	// 设置默认值
	if req.Timestamp == 0 {
		req.Timestamp = float64(time.Now().Unix())
	}
	if req.IP == "" {
		req.IP = c.ClientIP()
	}

	// 调用 Rust 实时检测器（快速路径）
	response, err := gw.callRustDetector(&req)
	if err != nil {
		log.Printf("Rust检测器调用失败，回退到Python: %v", err)
		// 回退到 Python 引擎
		response, err = gw.callPythonEngine(&req)
		if err != nil {
			requestsTotal.WithLabelValues("/detect", "error").Inc()
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Detection service unavailable",
			})
			return
		}
	}

	// 记录结果到 Redis
	gw.cacheResult(response)

	// 更新指标
	duration := time.Since(startTime)
	requestDuration.WithLabelValues("/detect").Observe(duration.Seconds())
	requestsTotal.WithLabelValues("/detect", "success").Inc()

	if response.RiskLevel == "HIGH" || response.RiskLevel == "CRITICAL" {
		fraudDetectedTotal.Inc()
	}

	// 更新统计
	gw.updateStats(duration.Seconds(), response.RiskLevel)

	// 返回响应
	c.JSON(http.StatusOK, response)
}

// 调用 Rust 检测器
func (gw *APIGateway) callRustDetector(req *DetectionRequest) (*DetectionResponse, error) {
	// 简化实现 - 实际应该通过 HTTP/gRPC 调用
	// 这里模拟 Rust 的极速响应
	time.Sleep(2 * time.Millisecond) // 模拟 2ms 延迟

	return &DetectionResponse{
		UserID:           req.UserID,
		RiskScore:        0.35,
		RiskLevel:        "LOW",
		FraudProbability: 0.25,
		DetectedPatterns: []string{},
		DefenseLayers:    []int{},
		Timestamp:        float64(time.Now().Unix()),
		ResponseTimeMs:   2.0,
		ProcessedBy:      "rust_detector",
	}, nil
}

// 调用 Python 引擎
func (gw *APIGateway) callPythonEngine(req *DetectionRequest) (*DetectionResponse, error) {
	// 简化实现
	time.Sleep(5 * time.Millisecond) // 模拟 5ms 延迟

	return &DetectionResponse{
		UserID:           req.UserID,
		RiskScore:        0.42,
		RiskLevel:        "MEDIUM",
		FraudProbability: 0.38,
		DetectedPatterns: []string{"BEHAVIOR_ANOMALY"},
		DefenseLayers:    []int{1, 4},
		Timestamp:        float64(time.Now().Unix()),
		ResponseTimeMs:   5.0,
		ProcessedBy:      "python_engine",
	}, nil
}

// 缓存结果到 Redis
func (gw *APIGateway) cacheResult(response *DetectionResponse) {
	ctx := context.Background()
	key := fmt.Sprintf("fraud:result:%s:%d", response.UserID, int64(response.Timestamp))

	data, err := json.Marshal(response)
	if err != nil {
		log.Printf("序列化结果失败: %v", err)
		return
	}

	err = gw.redisClient.Set(ctx, key, data, 1*time.Hour).Err()
	if err != nil {
		log.Printf("缓存结果失败: %v", err)
	}
}

// 更新统计
func (gw *APIGateway) updateStats(responseTime float64, riskLevel string) {
	gw.mu.Lock()
	defer gw.mu.Unlock()

	gw.stats.TotalRequests++
	if riskLevel == "HIGH" || riskLevel == "CRITICAL" {
		gw.stats.FraudDetected++
	}

	// 更新平均响应时间
	n := float64(gw.stats.TotalRequests)
	gw.stats.AvgResponseTime = (gw.stats.AvgResponseTime*(n-1) + responseTime) / n

	// 计算 QPS
	elapsed := time.Since(gw.stats.LastResetTime).Seconds()
	if elapsed > 0 {
		gw.stats.RequestsPerSec = float64(gw.stats.TotalRequests) / elapsed
	}
}

// 获取统计信息
func (gw *APIGateway) GetStats(c *gin.Context) {
	gw.mu.RLock()
	defer gw.mu.RUnlock()

	fraudRate := 0.0
	if gw.stats.TotalRequests > 0 {
		fraudRate = float64(gw.stats.FraudDetected) / float64(gw.stats.TotalRequests)
	}

	c.JSON(http.StatusOK, gin.H{
		"total_requests":    gw.stats.TotalRequests,
		"fraud_detected":    gw.stats.FraudDetected,
		"fraud_rate":        fraudRate,
		"avg_response_time": gw.stats.AvgResponseTime,
		"requests_per_sec":  gw.stats.RequestsPerSec,
		"uptime_seconds":    time.Since(gw.stats.LastResetTime).Seconds(),
	})
}

// 健康检查
func (gw *APIGateway) HealthCheck(c *gin.Context) {
	ctx := context.Background()

	// 检查 Redis
	_, err := gw.redisClient.Ping(ctx).Result()
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status": "unhealthy",
			"redis":  "down",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "healthy",
		"redis":  "up",
	})
}

// 启动网关
func (gw *APIGateway) Start() error {
	gin.SetMode(gin.ReleaseMode)
	router := gin.Default()

	// 中间件
	router.Use(gin.Recovery())
	router.Use(corsMiddleware())
	router.Use(loggingMiddleware())

	// API 路由
	api := router.Group("/api/v1")
	{
		api.POST("/detect", gw.HandleDetection)
		api.GET("/stats", gw.GetStats)
		api.GET("/health", gw.HealthCheck)
	}

	// Prometheus 指标
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// 启动服务器
	srv := &http.Server{
		Addr:    ":" + gw.config.Port,
		Handler: router,
	}

	// 优雅关闭
	go func() {
		sigint := make(chan os.Signal, 1)
		signal.Notify(sigint, os.Interrupt, syscall.SIGTERM)
		<-sigint

		log.Println("正在关闭服务器...")
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		if err := srv.Shutdown(ctx); err != nil {
			log.Printf("服务器关闭出错: %v", err)
		}
	}()

	log.Printf("🚀 API网关启动在端口 %s", gw.config.Port)
	log.Printf("📊 Prometheus指标: http://localhost:%s/metrics", gw.config.Port)
	log.Printf("💊 健康检查: http://localhost:%s/api/v1/health", gw.config.Port)

	return srv.ListenAndServe()
}

// CORS 中间件
func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

// 日志中间件
func loggingMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path

		c.Next()

		duration := time.Since(start)
		log.Printf("[%s] %s - %d - %v",
			c.Request.Method,
			path,
			c.Writer.Status(),
			duration,
		)
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		parsed, convErr := strconv.Atoi(value)
		if convErr == nil {
			return parsed
		}
		log.Printf("环境变量 %s 解析失败，使用默认值 %d: %v", key, defaultValue, convErr)
	}
	return defaultValue
}

func main() {
	config := &Config{
		Port:         getEnv("GATEWAY_PORT", "8080"),
		RedisAddr:    getEnv("REDIS_ADDR", "localhost:6379"),
		PythonAPIURL: getEnv("PYTHON_API_URL", "http://localhost:5000"),
		RustAPIURL:   getEnv("RUST_API_URL", "http://localhost:3030"),
		MaxQPS:       getEnvInt("MAX_QPS", 5000),
		TimeoutMs:    getEnvInt("TIMEOUT_MS", 100),
	}

	log.Printf("加载配置: port=%s redis=%s python_api=%s rust_api=%s max_qps=%d timeout_ms=%d",
		config.Port, config.RedisAddr, config.PythonAPIURL, config.RustAPIURL, config.MaxQPS, config.TimeoutMs)

	gateway := NewAPIGateway(config)

	if err := gateway.Start(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("启动失败: %v", err)
	}
}
