# Explorer 验证、入口统一与日志增强 Spec

## 1. 文档目标

本 Spec 定义 `.worktrees/api-explorer` 当前这一轮实现的范围与验收标准，目标是在保持现有 Explorer 页面结构方案不回退的前提下，完成以下三项工作：

1. 启动本地服务并验证新 Explorer 布局与搜索功能是否正常。
2. 将首页主入口统一调整为跳转到新的 Explorer 页面，保持导航一致性。
3. 在 `src/app.ts` 的请求日志更新链路中补充详细 `console.log`，方便排查日志显示异常问题。

本次改动属于“发布前可用性收口”和“排障辅助增强”，不改变 Explorer 元数据协议，也不扩展到服务层业务逻辑重构。

## 2. 背景与现状

当前 `.worktrees/api-explorer` 已经完成 Explorer 主页面的工作台化重构，具备以下基础能力：

- `public/explorer/index.html` 已采用左侧接口列表 + 右侧工作台布局。
- `public/explorer/app.js` 已支持接口搜索、方法过滤、请求发送与会话级请求日志展示。
- `src/app.ts` 已增加 `/explorer` 路由重定向、`/explorer/metadata` 输出与服务启动后自动打开 Explorer 的行为。

当前仍有三个实际使用层面的缺口：

- 新布局和搜索功能虽已落地，但仍需在本地实际启动后验证交互是否正常。
- 首页入口在 worktree 与主仓库中仍然偏旧，无法形成统一的“进入 Explorer 调试台”主路径。
- 现有 `app.ts` 请求日志只输出简要 `logger.info(...)`，不足以定位“为什么日志展示异常”这一类问题。

## 3. 目标

本次工作目标如下：

1. 确保本地服务可正常启动，并能直接打开新的 Explorer 页面。
2. 验证 Explorer 左侧布局、接口搜索、方法过滤、请求发送与请求日志区可用。
3. 同步改造 `.worktrees/api-explorer/public/index.html` 与主仓库 `public/index.html`，让首页主入口一致指向 `/explorer`。
4. 在 `.worktrees/api-explorer/src/app.ts` 的请求日志链路增加细粒度 `console.log`，帮助排查日志显示异常。
5. 保证改动通过静态检查、相关测试与功能验证，满足发布门禁。

## 4. 非目标

以下事项不在本次工作承诺范围内：

- 修改 `public/explorer/app.js` 的核心布局实现或搜索过滤规则。
- 重构 Explorer 为前端框架应用。
- 对主仓库根目录 `src/app.ts` 做同等日志增强，除非为保持入口行为一致确有必要。
- 引入新的日志库、持久化日志系统或浏览器埋点体系。
- 为所有控制器和服务补齐全量详细日志。

## 5. 方案选型

本次采用 `方案 A：以 worktree Explorer 为主验证链路，同时同步双首页入口`。

### 5.1 方案 A：worktree 主实施 + 双入口同步

- 以 `.worktrees/api-explorer` 作为本次启动、验证和日志增强的主实现对象。
- 同步修改 `.worktrees/api-explorer/public/index.html` 与主仓库 `public/index.html`，统一首页主入口。
- 不扩散到主仓库完整 Explorer 静态资源改造。

优点：

- 完全匹配当前用户要验证的 Explorer 页面。
- 改动集中、回归路径短。
- 可以在不放大风险的前提下保证导航一致性。

缺点：

- 主仓库首页会提前暴露 `/explorer` 入口，但主仓库本身若未挂载对应页面能力，仍需由后续链路保障。

### 5.2 方案 B：主仓库与 worktree 全量对齐

- 除了 worktree 以外，同时把主仓库的 Explorer 页、入口页和日志能力都完全对齐。

优点：

- 一致性最高。

缺点：

- 超出本轮需求边界。
- 需要同时验证两套页面资源与服务链路，实施成本更高。

### 5.3 选择原因

选择方案 A 的原因如下：

- 用户明确要验证“新的 Explorer 页面”，当前该页面存在于 `.worktrees/api-explorer`。
- 用户同时要求“刚才的首页入口也改成跳转到这个新的 Explorer 页面”，因此双首页入口需同步更新。
- 日志排查问题当前主要发生在 worktree 的 `src/app.ts`，以 worktree 为主补充日志最直接。

## 6. 页面与导航设计

### 6.1 首页入口统一

首页入口改造覆盖两个文件：

- `.worktrees/api-explorer/public/index.html`
- `public/index.html`

两者需满足以下一致性目标：

- 首页的主操作按钮明确表达“打开 API Explorer”。
- 文案强调服务已就绪，Explorer 是主要调试入口。
- 保留在线文档链接。
- 保留 2 至 3 个示例接口链接作为快速试用入口，但不再弱化 Explorer 的主导航地位。

### 6.2 Explorer 页面验证目标

本次不重写 Explorer 页面结构，只验证现有实现满足以下行为：

- 左侧接口列表正常显示。
- 搜索框可以按接口名、分类或路径过滤列表。
- 方法过滤器可以正确切换 `All`、`GET`、`POST`。
- 选中接口后右侧详情、参数表单和请求预览正常刷新。
- 发起请求后响应区和请求日志区都会更新。

## 7. 请求日志增强设计

### 7.1 增强位置

日志增强仅针对 `.worktrees/api-explorer/src/app.ts` 中当前的请求日志中间件与 Explorer 静态路由分发链路。

### 7.2 详细日志目标

为便于排查“日志显示异常”，`console.log` 至少覆盖以下节点：

1. 请求进入中间件时的基础信息：
   - `method`
   - `path`
   - `url`
2. 命中 `/explorer` 重定向时：
   - 原始路径
   - 重定向目标
3. 命中 `/explorer/metadata` 时：
   - 原始路径
   - 返回类型
   - endpoint 数量摘要
4. 调用 `await next()` 前后：
   - 进入下游前时间戳
   - 返回上游后的状态码与响应时间
5. 最终日志输出前的摘要信息：
   - 规范化后的 URL
   - HTTP 方法
   - `X-Response-Time`
   - `ctx.status`

### 7.3 日志边界

详细 `console.log` 只记录请求级摘要，不记录敏感头、Cookie 原文或超大响应体。

设计约束如下：

- 不替代现有 `logger.info(...)`，而是作为排障期间的补充日志。
- 仅在服务端请求链路中输出，不往前端页面注入额外调试提示。
- 保持日志内容可读，优先输出结构化对象或稳定前缀。

## 8. 测试与验证设计

### 8.1 自动化验证

本次至少执行以下自动化检查：

- `npm run lint`
- 相关测试，优先覆盖与 Explorer 路由、首页入口或日志行为相关的测试文件
- 最近修改文件的诊断检查

如果现有测试覆盖不到首页静态入口文本变更，则以功能验证补足，而不新增低价值快照测试。

### 8.2 功能验证

本次手工功能验证至少覆盖以下场景：

1. 启动 `.worktrees/api-explorer` 本地服务。
2. 从首页进入 Explorer。
3. 验证左侧新布局正常渲染。
4. 在搜索框输入关键字后，接口列表正确过滤。
5. 切换方法过滤器后，接口列表正确更新。
6. 选择一个可请求的接口并发送请求。
7. 验证响应区和请求日志区同步更新。
8. 查看终端中的详细 `console.log`，确认包含关键节点信息。

## 9. 实施文件范围

本次优先改动以下文件：

- `.worktrees/api-explorer/public/index.html`
- `public/index.html`
- `.worktrees/api-explorer/src/app.ts`

本次默认不修改以下文件，除非在验证阶段发现阻断问题：

- `.worktrees/api-explorer/public/explorer/app.js`
- `.worktrees/api-explorer/public/explorer/index.html`
- `.worktrees/api-explorer/public/explorer/styles.css`

## 10. 风险与应对

### 风险 1：首页入口统一后主仓库 `/explorer` 链路不完整

应对：

- 仅同步首页入口文案和主按钮路径。
- 若验证发现主仓库本地链路不可用，则在交付说明中明确该入口一致性仅针对已接入 Explorer 的运行环境。

### 风险 2：详细日志过多影响终端可读性

应对：

- 使用稳定前缀区分日志阶段。
- 只打印请求摘要和状态信息，不打印大对象。

### 风险 3：功能验证依赖真实接口波动

应对：

- 优先选择稳定的 GET 接口做验证。
- 若上游接口波动，至少验证搜索、过滤、路由跳转与日志写入链路正常。

## 11. 完成定义

本次工作完成时需满足：

- `linter_result`: pass
- `unit_test_result`: pass
- `func_test_result`: pass
- `status`: 仅当以上全部通过时输出成功

补充判定：

- worktree 本地服务成功启动。
- Explorer 新布局与搜索功能完成实际验证。
- 双首页入口主路径保持一致。
- `src/app.ts` 中已增加可用于排障的详细 `console.log`。

## 12. Spec 自检结论

自检结论如下：

- 已明确 worktree 是本轮验证与日志增强主对象，没有把范围扩散到主仓库完整 Explorer 改造。
- 已明确双首页入口需要统一，同时保留功能验证边界说明。
- 已显式约束日志只输出请求摘要，不记录敏感信息。
- 已定义自动化检查与功能验证路径，无占位符或 `TODO` 残留。
