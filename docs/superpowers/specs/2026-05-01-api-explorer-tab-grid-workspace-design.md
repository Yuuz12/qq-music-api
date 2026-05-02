# API Explorer 顶部 Header 与右侧多选 Tab 网格工作区 Spec

## 1. 文档目标

本 Spec 定义 `.worktrees/api-explorer` 中 API Explorer 页面在当前版本基础上的三次增量重构方案。

本轮重点不是再做“右侧可折叠纵向面板”，而是将页面进一步调整为更清晰的三段式结构：

1. 顶部 `header`
2. 左侧 `section` 导航区
3. 右侧 `main` 工作区

其中，右侧工作区的核心交互从“主面板折叠/展开”升级为“顶部多选 tab 控制卡片显示 + 下方 2 列网格排布”。

## 2. 背景与现状

当前 Explorer 已完成以下改造：

- 左侧目录已整合为单一头区与统一筛选/列表区。
- 请求配置已经与请求摘要合并。
- 右侧已有四个主区域：
  - `overview`
  - `request`
  - `response`
  - `logs`
- 右侧四个区域目前采用纵向堆叠 + 独立折叠的交互。

当前版本仍然存在的问题：

- 页面整体层级仍然偏“侧栏 + 工作台”，而不是更明确的“顶部全局头区 + 左右主体”。
- 右侧四个区域虽然可以折叠，但在信息浏览时仍然是单列阅读路径。
- 用户希望右侧更接近“tab 控制 + 多块并列展示”的工作方式，并要求每行最多显示 2 个模块。

## 3. 目标

本次工作的目标如下：

1. 将页面顶层结构明确为 `header` 顶部、左侧 `section`、右侧 `main`。
2. 将品牌、标题、描述和外链入口统一放入顶部 `header`。
3. 将左侧区域收敛为纯导航区，只负责搜索、方法过滤和接口列表。
4. 将右侧区域从纵向折叠工作区改为“顶部多选 tab 控制条 + 2 列卡片网格”。
5. 保留四个核心内容模块：
   - `Overview`
   - `Request`
   - `Response`
   - `History`
6. 允许用户通过勾选同时显示多个模块，而不是只能查看单个 tab。
7. 限制右侧内容区每行最多展示 2 个模块。
8. 保持所有模块处于同一页面层级，不使用抽屉、浮层或覆盖式切换。

## 4. 非目标

以下事项不在本次工作范围内：

- 修改 `/explorer/metadata` 数据协议。
- 修改服务端路由、控制器或日志链路。
- 引入新的前端框架。
- 为右侧模块增加拖拽排序。
- 做跨会话的 tab 可见性持久化。

## 5. 方案选型

本次采用 `方案 A：右侧顶部多选 tab 控制 + 2 列网格工作区`。

### 5.1 方案 A：多选 tab + 2 列网格

- 顶部 `header` 负责全局信息。
- 左侧 `section` 保持接口筛选和列表。
- 右侧 `main` 顶部放一排可勾选的 tab chips。
- 右侧下方按网格展示当前勾选的模块，每行最多 2 个。

优点：

- 符合用户“tab 视觉 + 多选展示”的要求。
- 同时查看多个区域时比单列折叠更高效。
- 信息密度更高，但仍有清晰边界。

缺点：

- 需要替换当前主面板折叠状态模型。
- 需要重做右侧 DOM 结构与布局样式。

### 5.2 备选方案 B：传统单选 tab

- 顶部用 tab 切换，右侧一次只显示一个模块。

优点：

- 结构简单。

缺点：

- 不支持“同时看多个模块”。
- 不符合用户“勾选展示”的要求。

### 5.3 备选方案 C：继续沿用折叠卡片

- 保留当前纵向堆叠卡片，仅优化样式。

优点：

- 改动较小。

缺点：

- 无法满足“右侧四个 tab，通过勾选展示，每行最多展示 2 个”的新目标。

### 5.4 选择原因

选择方案 A 的原因如下：

- 用户已经明确要求右侧采用“多选 tab + 网格展示”。
- 该方案既保留 tab 的语义，又允许多个模块同时可见。
- 2 列网格比纵向折叠更适合并排对照 `Request`、`Response` 与 `History`。

## 6. 页面信息架构

### 6.1 顶部 Header

页面顶部新增独立的 `header.app-header`，承载全局信息：

- 品牌标识
- 页面标题
- 页面描述
- 返回首页链接
- 在线文档链接

设计原则：

- 顶部 `header` 只承载全局上下文，不混入接口筛选或右侧显示控制。
- 该区域不参与局部内容滚动。

### 6.2 左侧 Section

左侧导航区使用 `section.sidebar`，承载以下内容：

- 搜索框
- 请求方法过滤器
- 结果统计摘要
- 当前激活接口提示
- 接口列表
- 空状态提示

设计原则：

- 左侧只承担接口发现与切换，不承载右侧模块显示控制。
- 保持“顶部筛选固定、接口列表滚动”的既有规则。

### 6.3 右侧 Main

右侧工作区使用 `main.workspace`，内部包含两层：

1. `workspace-toolbar`
2. `workspace-grid`

#### `workspace-toolbar`

顶部控制条承载四个可勾选 tab：

- `Overview`
- `Request`
- `Response`
- `History`

这些 tab 不是传统互斥切换，而是“多选显示开关”。

#### `workspace-grid`

内容区承载四个模块卡片：

- `workspace-card-overview`
- `workspace-card-request`
- `workspace-card-response`
- `workspace-card-history`

网格规则：

- 默认 2 列
- 每行最多 2 个卡片
- 选中 1 个时，该卡片独占一整行
- 选中 2 个时，一行展示 2 个
- 选中 3 或 4 个时，自动分成多行，但仍保持每行最多 2 个

## 7. 右侧交互设计

### 7.1 多选 Tab 规则

右侧顶部 tab 的交互规则如下：

- tab 使用“选中 / 未选中”两种状态。
- 点击 tab 可切换对应模块是否显示。
- 至少保留一个 tab 处于选中状态。
- 当用户试图关闭最后一个可见模块时，系统应忽略该操作。

### 7.2 模块状态保留规则

当模块被隐藏时：

- 只是从当前网格视图中不显示。
- 不清空该模块的数据和内部状态。

重新显示后应恢复：

- `Overview`：当前接口信息
- `Request`：已输入参数、Body JSON、请求摘要
- `Response`：最近一次响应结果
- `History`：请求日志列表与当前选中日志

### 7.3 接口切换规则

点击左侧接口后：

- `Overview` 与 `Request` 立即刷新为新接口内容。
- `Response` 恢复到该页面统一的初始等待态。
- `History` 保留当前会话日志，不因为切换接口而清空。
- `visibleWorkspaceTabs` 状态不重置。

### 7.4 请求行为规则

发送请求时：

- 即使 `Response` 或 `History` 当前被隐藏，请求仍正常执行。
- `Response` 的内容照常更新。
- `History` 的日志照常记录。
- 用户重新显示这些模块后，可以看到最新结果。

## 8. 四个工作区模块定义

### 8.1 Overview

展示当前接口的静态信息：

- 接口名称
- 描述
- 分类
- 方法
- 路径

### 8.2 Request

作为核心交互模块，展示：

- 路径参数
- 查询参数
- Body JSON
- 请求摘要
- 发送请求按钮

其中，“请求摘要”继续与参数输入处于同一模块内，不拆成独立第五块。

### 8.3 Response

展示最近一次请求结果：

- 状态码
- 耗时
- 响应正文

### 8.4 History

展示当前会话历史：

- 请求日志列表
- 当前选中日志的详情

## 9. 状态模型设计

### 9.1 保留的状态

继续保留以下业务状态：

- `metadata`
- `endpointMap`
- `activeEndpointId`
- `searchKeyword`
- `methodFilter`
- `visibleEndpointIds`
- `requestLogs`
- `selectedLogId`

### 9.2 替换的状态

删除上一版主面板折叠状态：

```js
panelState
```

改为新的右侧模块显示状态：

```js
visibleWorkspaceTabs = {
  overview: true,
  request: true,
  response: true,
  history: true,
}
```

规则如下：

- 默认四项全部显示。
- 至少有一项必须为 `true`。
- 切换接口时不重置。
- 发送请求时不重置。

### 9.3 Request 内部状态

继续保留 `Request` 模块内的子区块状态：

```js
requestSectionState = {
  pathParams: true,
  queryParams: true,
  body: true,
  preview: true,
}
```

说明：

- 子区块状态只作用于 `Request` 模块内部。
- 不再承担顶层模块显示控制。

## 10. HTML 结构设计

`public/explorer/index.html` 改造后应满足以下结构：

- `header.app-header`
- `div.app-shell`
  - `section.sidebar`
  - `main.workspace`

其中：

- `header.app-header` 放全局头区内容。
- `section.sidebar` 放搜索、过滤和列表。
- `main.workspace` 内部包含：
  - `div.workspace-toolbar`
  - `section.workspace-grid`

`workspace-toolbar` 中需要稳定锚点：

- `data-workspace-tab="overview"`
- `data-workspace-tab="request"`
- `data-workspace-tab="response"`
- `data-workspace-tab="history"`

`workspace-grid` 中需要稳定锚点：

- `data-workspace-card="overview"`
- `data-workspace-card="request"`
- `data-workspace-card="response"`
- `data-workspace-card="history"`

## 11. 前端代码结构设计

`public/explorer/app.js` 本次应做如下调整：

### 11.1 删除或替换的逻辑

- 删除主面板折叠相关状态
- 删除 `togglePanel()` 与 `renderPanelState()` 相关逻辑
- 删除右侧主面板点击头部折叠的事件绑定

### 11.2 新增的逻辑

新增右侧可见性控制 helper：

- `toggleWorkspaceTab(tabKey)`
- `renderWorkspaceToolbar()`
- `renderWorkspaceGrid()`
- `isWorkspaceTabVisible(tabKey)`

新增约束 helper：

- 保证至少保留一个可见模块
- 根据当前可见模块数控制网格显示类名

### 11.3 保留并复用的逻辑

继续复用：

- 搜索和过滤逻辑
- 接口列表渲染逻辑
- 请求配置渲染逻辑
- 请求发送逻辑
- 请求日志逻辑

## 12. 样式设计边界

`public/explorer/styles.css` 本次重点包括：

- 新增顶部 `app-header` 样式
- 调整页面主体为“顶部头区 + 左右主体”
- 为右侧新增 `workspace-toolbar`
- 为右侧新增 `workspace-grid` 双列样式
- 删除对顶层 `panel-collapsible` 的依赖

样式要求：

- tab 控制条需具备清晰的选中态与未选中态
- 内容卡片保持统一高度基线与边距风格
- 2 列布局在中等屏幕下保持稳定
- 窄屏时降级为单列

## 13. 错误处理与边界条件

### 13.1 最后一个模块不可关闭

如果用户试图关闭最后一个已显示模块：

- 阻止该次状态变更
- 保持当前最后一个模块继续显示

### 13.2 隐藏 Response 与 History

如果用户隐藏了 `Response` 或 `History`：

- 请求仍照常执行
- 响应和日志仍照常更新
- 重新显示时可看到最新内容

### 13.3 Request 为空接口

当当前接口无需参数时：

- `Request` 模块显示空态提示
- `请求摘要` 继续展示可发送的请求结果

## 14. 测试设计

### 14.1 单元测试

新增或更新纯函数测试，重点覆盖：

- 切换单个 workspace tab 的显隐状态
- 尝试关闭最后一个可见 tab 时被拒绝
- tab 显隐切换不影响其他业务状态
- `Request` 内部子区块状态仍正确同步

### 14.2 功能验证

手工验证至少覆盖：

1. 页面顶部独立 `header` 正常显示
2. 左侧只承担接口筛选与列表功能
3. 右侧 `main` 顶部存在 4 个可勾选 tab
4. 右侧内容按 2 列网格展示
5. 隐藏和重新显示 `Response` 后，最近响应仍然存在
6. 隐藏和重新显示 `History` 后，请求日志仍然存在
7. 任意时刻至少保留一个模块可见

### 14.3 发布门禁

需满足：

- `npm run lint`
- `npm test -- --runInBand`
- 本地 explorer 页面功能验证

并确保：

- `linter_result`: pass
- `unit_test_result`: pass
- `func_test_result`: pass
- `status`: 成功

## 15. 文件改动范围

本次优先改动：

- `public/explorer/index.html`
- `public/explorer/styles.css`
- `public/explorer/app.js`
- `src/util/apiExplorer.ts`
- `tests/apiExplorer.util.test.ts`

本次不应改动：

- `src/app.ts`
- 后端路由和 controller 逻辑
- `/explorer/metadata` 协议

## 16. 与前两版 Spec 的关系

本 Spec 是对以下文档的进一步增量更新：

- `2026-05-01-api-explorer-layout-refactor-design.md`
- `2026-05-01-api-explorer-postman-workspace-design.md`

继承内容：

- 左侧继续采用统一导航与单滚动列表设计。
- `Request` 继续保留“参数输入 + 请求摘要”的合并结构。
- 不使用抽屉、浮层或层级跳转。

替换内容：

- 不再使用“右侧四个主面板纵向堆叠 + 折叠”的顶层交互。
- 顶层交互改为“右侧顶部多选 tab + 下方 2 列网格模块”。
- 顶层状态从 `panelState` 替换为 `visibleWorkspaceTabs`。

如后续实现发生冲突，应以本 Spec 对右侧工作区结构和交互的定义为准。

## 17. Spec 自检结论

自检结论如下：

- 已明确这轮是对右侧顶层交互的替换，而不是在折叠面板之上再叠加 tab。
- 已明确顶部 `header`、左侧 `section` 和右侧 `main` 的职责边界。
- 已明确定义“多选显示”和“至少保留一个模块可见”的约束。
- 已明确文件范围、状态模型和验证路径，无占位符和未决策项残留。
