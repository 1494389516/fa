# 贡献指南

感谢您对内容监控助手项目的关注！我们欢迎所有形式的贡献。

## 🤝 如何贡献

### 报告 Bug
如果您发现了 bug，请：
1. 检查 [Issues](https://github.com/yourusername/douyin-monitor-miniprogram/issues) 确认问题未被报告
2. 创建新的 Issue，包含：
   - 详细的问题描述
   - 复现步骤
   - 预期行为和实际行为
   - 环境信息（操作系统、浏览器版本等）
   - 相关截图或错误日志

### 提出功能建议
我们欢迎新功能建议：
1. 在 [Discussions](https://github.com/yourusername/douyin-monitor-miniprogram/discussions) 中讨论您的想法
2. 如果获得积极反馈，创建 Feature Request Issue
3. 详细描述功能需求和使用场景

### 提交代码
1. **Fork 项目**
   ```bash
   git clone https://github.com/yourusername/douyin-monitor-miniprogram.git
   ```

2. **创建分支**
   ```bash
   git checkout -b feature/your-feature-name
   # 或
   git checkout -b fix/your-bug-fix
   ```

3. **开发和测试**
   - 遵循项目的代码规范
   - 添加必要的测试
   - 确保所有测试通过

4. **提交更改**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   # 或
   git commit -m "fix: fix your bug description"
   ```

5. **推送分支**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **创建 Pull Request**
   - 提供清晰的 PR 标题和描述
   - 关联相关的 Issue
   - 等待代码审查

## 📝 代码规范

### 提交信息规范
使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

类型包括：
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

### JavaScript 代码规范
- 使用 ES6+ 语法
- 使用 2 空格缩进
- 使用分号结尾
- 使用单引号
- 变量和函数使用 camelCase
- 常量使用 UPPER_SNAKE_CASE

### 小程序代码规范
- 页面文件使用 kebab-case 命名
- 组件使用 PascalCase 命名
- 样式类名使用 kebab-case
- 遵循微信小程序开发规范

## 🧪 测试

### 运行测试
```bash
# 安装依赖
npm install

# 运行测试
npm test

# 运行测试覆盖率
npm run test:coverage
```

### 测试要求
- 新功能必须包含相应的测试
- Bug 修复应该包含回归测试
- 测试覆盖率应保持在 80% 以上

## 📚 文档

### 文档更新
- API 变更需要更新相应文档
- 新功能需要添加使用说明
- 重要变更需要更新 README.md

### 文档规范
- 使用 Markdown 格式
- 包含代码示例
- 提供清晰的步骤说明

## 🔍 代码审查

### 审查标准
- 代码质量和可读性
- 功能正确性
- 性能影响
- 安全性考虑
- 测试覆盖率

### 审查流程
1. 自动化检查（CI/CD）
2. 代码审查（至少一位维护者）
3. 测试验证
4. 合并到主分支

## 🏷️ 版本发布

### 版本号规范
遵循 [Semantic Versioning](https://semver.org/)：
- `MAJOR.MINOR.PATCH`
- MAJOR: 不兼容的 API 修改
- MINOR: 向下兼容的功能性新增
- PATCH: 向下兼容的问题修正

### 发布流程
1. 更新版本号
2. 更新 CHANGELOG.md
3. 创建 Release Tag
4. 发布到相应平台

## 🆘 获取帮助

如果您在贡献过程中遇到问题：

1. 查看 [FAQ](https://github.com/yourusername/douyin-monitor-miniprogram/wiki/FAQ)
2. 在 [Discussions](https://github.com/yourusername/douyin-monitor-miniprogram/discussions) 中提问
3. 联系维护者

## 📄 许可证

通过贡献代码，您同意您的贡献将在 [MIT License](LICENSE) 下授权。

---

再次感谢您的贡献！🎉