import React, { useState, useEffect } from 'react';
import { Layout, Card, Row, Col, Statistic, Table, Tag, Progress, notification, Badge, Tooltip as AntTooltip } from 'antd';
import {
  AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { 
  SafetyOutlined, WarningOutlined, ThunderboltOutlined, 
  RiseOutlined, FallOutlined, DashboardOutlined, 
  FireOutlined, RocketOutlined, CheckCircleOutlined,
  ClockCircleOutlined, GlobalOutlined, ApiOutlined
} from '@ant-design/icons';
import axios from 'axios';
import './App.css';

const { Header, Content } = Layout;

// 颜色配置
const COLORS = {
  LOW: '#52c41a',
  MEDIUM: '#faad14',
  HIGH: '#ff7875',
  CRITICAL: '#ff4d4f'
};

const App = () => {
  const [stats, setStats] = useState({
    total_requests: 0,
    fraud_detected: 0,
    fraud_rate: 0,
    avg_response_time: 0,
    requests_per_sec: 0,
    vpn_detected: 0
  });

  const [recentDetections, setRecentDetections] = useState([]);
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [riskDistribution, setRiskDistribution] = useState([]);

  // 获取统计数据
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
        const response = await axios.get(`${API_BASE_URL}/api/v1/stats`);
        setStats(response.data);
      } catch (error) {
        console.error('获取统计数据失败:', error);
        // 开发环境显示友好提示
        if (import.meta.env.DEV) {
          notification.warning({
            message: '无法连接到后端服务',
            description: '请确保API网关正在运行 (http://localhost:8080)',
            duration: 5
          });
        }
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 2000); // 每2秒更新

    return () => clearInterval(interval);
  }, []);

  // 模拟实时检测数据
  useEffect(() => {
    const generateMockData = () => {
      const mockDetection = {
        key: Date.now(),
        user_id: `user_${Math.floor(Math.random() * 1000)}`,
        risk_score: (Math.random() * 0.8).toFixed(2),
        risk_level: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][Math.floor(Math.random() * 4)],
        fraud_probability: (Math.random() * 0.7).toFixed(2),
        response_time: (Math.random() * 5 + 1).toFixed(2),
        timestamp: new Date().toLocaleTimeString()
      };

      setRecentDetections(prev => [mockDetection, ...prev.slice(0, 9)]);

      // 更新时间序列数据
      setTimeSeriesData(prev => {
        const newData = [
          ...prev.slice(-19),
          {
            time: new Date().toLocaleTimeString(),
            requests: Math.floor(Math.random() * 100 + 50),
            fraud: Math.floor(Math.random() * 20)
          }
        ];
        return newData;
      });
    };

    const interval = setInterval(generateMockData, 3000);
    return () => clearInterval(interval);
  }, []);

  // 风险分布数据
  useEffect(() => {
    setRiskDistribution([
      { name: '低风险', value: 65, color: COLORS.LOW },
      { name: '中风险', value: 25, color: COLORS.MEDIUM },
      { name: '高风险', value: 8, color: COLORS.HIGH },
      { name: '极高风险', value: 2, color: COLORS.CRITICAL }
    ]);
  }, []);

  // 表格列配置
  const columns = [
    {
      title: '用户ID',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 120
    },
    {
      title: '风险评分',
      dataIndex: 'risk_score',
      key: 'risk_score',
      width: 100,
      render: (score) => (
        <Progress 
          percent={parseFloat(score) * 100} 
          size="small"
          strokeColor={
            score < 0.3 ? COLORS.LOW :
            score < 0.6 ? COLORS.MEDIUM :
            score < 0.85 ? COLORS.HIGH : COLORS.CRITICAL
          }
        />
      )
    },
    {
      title: '风险等级',
      dataIndex: 'risk_level',
      key: 'risk_level',
      width: 100,
      render: (level) => (
        <Tag color={COLORS[level]}>{level}</Tag>
      )
    },
    {
      title: '欺诈概率',
      dataIndex: 'fraud_probability',
      key: 'fraud_probability',
      width: 100
    },
    {
      title: '响应时间',
      dataIndex: 'response_time',
      key: 'response_time',
      width: 100,
      render: (time) => `${time}ms`
    },
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 120
    }
  ];

  return (
    <Layout className="dashboard-layout">
      <Header className="animated-header glass-header">
        <div style={{ display: 'flex', alignItems: 'center' }} className="header-left">
          <div className="logo-container">
            <SafetyOutlined className="logo-icon pulse-animation" />
          </div>
          <div>
            <h1 style={{ color: 'white', margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '1px' }}>
              🦅 鹰眼反欺诈系统 FraudHawk
            </h1>
            <div className="subtitle" style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 }}>
              Sharp Eyes, Secure Future
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }} className="header-right">
          <div className="system-status">
            <Badge status="processing" />
            <span style={{ color: '#52c41a', fontSize: 14, fontWeight: 600, marginLeft: 8 }}>
              <ThunderboltOutlined /> ONLINE
            </span>
          </div>
          <div className="tech-badge">
            <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: 500 }}>
              🔐 AI防护 | 🌐 VPN检测
            </span>
          </div>
        </div>
      </Header>

      <Content className="dashboard-content">
        {/* 统计卡片 - 美化版 */}
        <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card gradient-card-1 hover-lift">
              <div className="stat-icon-wrapper">
                <DashboardOutlined className="stat-icon" />
              </div>
              <Statistic
                title={<span className="stat-title">总请求数</span>}
                value={stats.total_requests}
                valueStyle={{ color: '#fff', fontSize: '32px', fontWeight: 'bold' }}
                suffix={<span style={{ fontSize: '14px', opacity: 0.8 }}>次</span>}
              />
              <div className="stat-trend">
                <RiseOutlined /> +12.5% vs 昨日
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card gradient-card-2 hover-lift">
              <div className="stat-icon-wrapper">
                <WarningOutlined className="stat-icon" />
              </div>
              <Statistic
                title={<span className="stat-title">检测到欺诈</span>}
                value={stats.fraud_detected}
                valueStyle={{ color: '#fff', fontSize: '32px', fontWeight: 'bold' }}
                suffix={<span style={{ fontSize: '14px', opacity: 0.8 }}>次</span>}
              />
              <div className="stat-trend warning">
                <FireOutlined /> 实时监控中
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card gradient-card-3 hover-lift">
              <div className="stat-icon-wrapper">
                {stats.fraud_rate > 0.1 ? <RiseOutlined className="stat-icon" /> : <FallOutlined className="stat-icon" />}
              </div>
              <Statistic
                title={<span className="stat-title">欺诈率</span>}
                value={(stats.fraud_rate * 100).toFixed(2)}
                suffix={<span style={{ fontSize: '14px', opacity: 0.8 }}>%</span>}
                valueStyle={{ color: '#fff', fontSize: '32px', fontWeight: 'bold' }}
              />
              <div className={`stat-trend ${stats.fraud_rate > 0.1 ? 'warning' : 'success'}`}>
                {stats.fraud_rate > 0.1 ? '⚠️ 需要关注' : '✅ 正常范围'}
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card gradient-card-4 hover-lift">
              <div className="stat-icon-wrapper">
                <GlobalOutlined className="stat-icon" />
              </div>
              <Statistic
                title={<span className="stat-title">🌐 VPN检测</span>}
                value={stats.vpn_detected || 0}
                suffix={<span style={{ fontSize: '14px', opacity: 0.8 }}>次</span>}
                valueStyle={{ color: '#fff', fontSize: '32px', fontWeight: 'bold' }}
              />
              <div className="stat-trend">
                <RocketOutlined /> {stats.avg_response_time?.toFixed(2) || 0}ms 响应
              </div>
            </Card>
          </Col>
        </Row>

        {/* 图表区域 - 美化版 */}
        <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
          <Col xs={24} lg={16}>
            <Card className="chart-card glass-card" title={
              <span className="card-title">
                <GlobalOutlined /> 实时请求趋势分析
              </span>
            } bordered={false}>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={timeSeriesData}>
                  <defs>
                    <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#667eea" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#667eea" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorFraud" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f093fb" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#f5576c" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="time" stroke="rgba(255,255,255,0.6)" />
                  <YAxis stroke="rgba(255,255,255,0.6)" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.8)', 
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Legend wrapperStyle={{ color: '#fff' }} />
                  <Area 
                    type="monotone" 
                    dataKey="requests" 
                    stroke="#667eea" 
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorRequests)"
                    name="总请求"
                    animationDuration={1000}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="fraud" 
                    stroke="#f5576c" 
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorFraud)"
                    name="欺诈检测"
                    animationDuration={1000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card className="chart-card glass-card" title={
              <span className="card-title">
                <FireOutlined /> 风险等级分布
              </span>
            } bordered={false}>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={riskDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                    animationDuration={1000}
                    animationBegin={0}
                  >
                    {riskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.8)', 
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>

        {/* 最近检测记录 - 美化版 */}
        <Card className="table-card glass-card" title={
          <span className="card-title">
            <ClockCircleOutlined /> 最近检测记录（实时更新）
          </span>
        } bordered={false}>
          <Table 
            columns={columns} 
            dataSource={recentDetections}
            pagination={false}
            size="middle"
            scroll={{ y: 400 }}
            className="custom-table"
          />
        </Card>
      </Content>
    </Layout>
  );
};

export default App;

