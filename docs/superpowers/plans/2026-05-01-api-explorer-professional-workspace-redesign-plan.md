# API Explorer 专业化工作台与首页视觉收敛实施计划

## 1. 计划目标

本计划用于承接已确认的设计文档 [2026-05-01-api-explorer-professional-workspace-redesign.md](file:///Users/bytedance/Desktop/MyWork/github/qq-music-api/.worktrees/api-explorer/docs/superpowers/specs/2026-05-01-api-explorer-professional-workspace-redesign.md)，将“压缩 Header、收敛首页视觉、重构 Explorer 工作区为固定专业布局”的方案拆解为可执行、可验证、可回滚的实施步骤。

本计划重点解决以下四件事：

1. 将 Explorer 从“多选 tab + 网格模块”切换为“固定主操作区 + 响应区 + 底部日志区”。
2. 将首页从临时入口页升级为更正式的产品入口页。
3. 统一首页与 Explorer 的视觉语言，提升专业感与一致性。
4. 删除旧状态模型与过时测试，补齐新的单元测试、功能验证和发布检查。

## 2. 实施原则

- 先结构后视觉：优先完成 DOM 结构和状态模型迁移，再做视觉收敛，避免样式反复推翻。
- 先 Explorer 后首页：先稳定核心调试工作台，再同步首页风格，保证功能区优先可用。
- 先删旧逻辑再接新布局：避免在旧的多选 workspace 模型上叠加新逻辑。
- 先保留业务能力再调整呈现：请求发送、响应更新和日志记录能力保持连续，不因重构丢失行为。
- 先补高价值测试再做发布验证：测试覆盖交互迁移点，避免出现“视觉改好了、行为回退了”的情况。

## 3. 交付范围

本次实施计划覆盖以下交付物：

- Explorer 新版固定工作区 DOM 结构
- Header 紧凑化与统一视觉样式
- 首页新版产品入口区
- `Overview + Request` 合并后的主操作区
- 底部整行日志区
- 删除 workspace 控制条后的状态与脚本重构
- 对应单元测试与页面行为验证

本计划不覆盖：

- 后端路由、控制器和数据协议调整
- Explorer 元数据结构扩展
- 新增拖拽布局或用户自定义面板能力
- 新增独立前端工程或路由系统

## 4. 里程碑概览

### 里程碑 M1：完成 Explorer 结构迁移

目标：

- 删除顶部 workspace 控制区
- 固定右侧工作区为双栏主区 + 底部日志区

完成标准：

- 页面不再出现 workspace tab chips
- `Overview` 与 `Request` 完成合并
- `History` 不再作为独立卡片出现

### 里程碑 M2：完成视觉收敛

目标：

- 缩小 Explorer Header
- 完成首页产品入口页改造
- 统一首页与 Explorer 视觉语言

完成标准：

- Explorer 首屏重心回到工作区
- 首页主 CTA、能力说明和快速入口层级清晰

### 里程碑 M3：完成交互与日志职责迁移

目标：

- 确保响应区与日志区职责分离
- 保证切换接口、发送请求和查看日志行为符合新模型

完成标准：

- `Response` 只代表最近一次结果
- `Logs` 承接原 `History` 能力且不回写覆盖 `Response`

### 里程碑 M4：完成测试与发布验证

目标：

- 重写失效测试
- 补齐新布局与交互测试
- 跑通 lint、单测与功能验证

完成标准：

- `npm run lint` 通过
- `npm test -- --runInBand` 通过
- 覆盖率保持 `>= 90%`
- 手工功能验证通过

## 5. 分阶段实施步骤

## 阶段 1：梳理并删除旧工作区模型

### 目标

清理掉当前与新方案冲突的顶层 workspace 逻辑，为固定工作流布局让路。

### 执行动作

1. 审查 `public/explorer/index.html` 中与旧布局相关的 DOM：
   - `workspace-toolbar`
   - `workspace-tab-list`
   - 独立 `overview`
   - 独立 `request`
   - 独立 `history`
2. 审查 `public/explorer/app.js` 中与旧模型相关的状态和 helper：
   - `visibleWorkspaceTabs`
   - tab 切换逻辑
   - workspace grid 显隐计算
3. 审查 `public/explorer/styles.css` 中与旧模型相关的样式：
   - toolbar 区域
   - tab chips
   - 可见卡片网格规则
4. 删除旧的顶层 workspace 控制逻辑，但暂时保留请求、响应和日志的数据能力。

### 产出

- 已剥离旧多选 workspace 结构的页面骨架
- 明确的待迁移逻辑清单

### 完成标准

- 顶层不再依赖 `visibleWorkspaceTabs`
- 页面骨架可承接新的固定布局

## 阶段 2：重构 Explorer DOM 为固定专业布局

### 目标

将 Explorer 主体重构为稳定的“左导航 + 右固定工作流”结构。

### 执行动作

1. 在 `public/explorer/index.html` 中重组右侧 DOM：
   - 新增 `workspace-main-grid`
   - 新增 `workspace-primary-card`
   - 新增 `workspace-response-card`
   - 新增 `workspace-log-card`
2. 将原 `Overview` 与 `Request` 标记位合并到主操作区容器下。
3. 将原 `History` 结构挪到底部日志区。
4. 删除不再需要的 workspace toolbar DOM。
5. 保留稳定锚点或新增必要的 `id` / `data-*` 标记，方便脚本与测试定位。

### 产出

- Explorer 固定布局 HTML 结构
- 可供脚本和测试稳定定位的新锚点

### 完成标准

- 右侧页面结构符合 Spec 中定义的固定双层布局
- 页面结构不再依赖“显示哪些卡片”的条件渲染

## 阶段 3：迁移主操作区渲染逻辑

### 目标

将接口概览与请求配置整合成一个完整的主操作区，保证阅读顺序即操作顺序。

### 执行动作

1. 在 `public/explorer/app.js` 中整合原 `Overview` 和 `Request` 的渲染入口。
2. 按以下顺序组织主操作区内容：
   - 当前接口头部
   - 参数配置区
   - 请求摘要区
   - 操作区
3. 保留并复用现有参数渲染、请求预览和发送请求逻辑。
4. 调整无参数接口的空状态表现，确保仍可直接发送请求。
5. 检查当前 `requestSectionState` 是否仍适合复用，如适合则仅保留在主操作区内部。

### 产出

- 合并后的主操作区渲染逻辑
- 保持原有请求能力的结构化交互流

### 完成标准

- 用户可在同一卡片内完成“看接口 -> 配参数 -> 发请求”
- 不再需要单独的 `Overview` 卡片

## 阶段 4：迁移响应区与底部日志区职责

### 目标

让 `Response` 与 `Logs` 各司其职，形成“最新结果 + 会话轨迹”的双轨模型。

### 执行动作

1. 保留现有响应渲染逻辑，但将其挂载到 `workspace-response-card`。
2. 将原 `History` 的渲染和事件绑定迁移到底部 `workspace-log-card`。
3. 调整日志点击行为：
   - 切换日志详情
   - 不覆盖 `Response` 当前显示结果
4. 调整切换接口时的行为：
   - 主操作区刷新
   - 响应区回到等待态
   - 日志保留
5. 调整发送请求后的行为：
   - 更新 `Response`
   - 追加日志
   - 自动选中新日志

### 产出

- 新的响应区与日志区职责实现
- 对齐 Spec 的交互行为

### 完成标准

- `Response` 只反映最近一次结果
- `Logs` 可查看会话历史而不污染响应区

## 阶段 5：完成 Explorer 视觉收敛

### 目标

在新结构稳定后统一完成 Header、卡片、表单、代码块和日志区的专业化样式升级。

### 执行动作

1. 在 `public/explorer/styles.css` 中收敛 Header：
   - 减小高度
   - 压缩标题与描述
   - 优化右侧链接样式
2. 新增并调整主区样式：
   - `workspace-main-grid`
   - `workspace-primary-card`
   - `workspace-response-card`
   - `workspace-log-card`
3. 删除旧 toolbar 和 tab chips 样式。
4. 统一以下元素的视觉语言：
   - badge
   - 按钮
   - 输入框
   - code block
   - 空状态
5. 补充桌面端、中屏和窄屏的响应式规则，确保布局按 Spec 平稳降级。

### 产出

- Explorer 新版完整样式
- 统一的专业工具台视觉语言

### 完成标准

- Explorer 页面视觉符合“极简专业、工具化、高对齐”的要求
- Header 不再抢占首屏重心

## 阶段 6：完成首页产品入口页改造

### 目标

让首页与 Explorer 建立统一的品牌与工具体验，形成更正式的入口页。

### 执行动作

1. 重构 `public/index.html` 的 Hero 区结构：
   - 收紧高度
   - 强化主 CTA
   - 弱化欢迎页式描述
2. 新增 2 到 3 个能力说明区块或专业化快捷入口。
3. 保留 `打开 API Explorer` 为主按钮，`在线文档` 为次按钮。
4. 优化快速试用区域的展示方式，避免裸链接列表的临时感。
5. 让首页视觉元素与 Explorer 保持同一套色彩、边框、圆角和按钮语言。

### 产出

- 新版首页入口页
- 与 Explorer 一致的视觉语言

### 完成标准

- 首页更像产品入口而不是服务占位页
- 用户能清楚识别主工作流入口

## 阶段 7：更新工具层与测试

### 目标

清理失效测试、补齐新交互覆盖，并确保工具函数与页面行为仍稳定。

### 执行动作

1. 更新 `src/util/apiExplorer.ts` 中与旧 workspace 模型耦合的工具逻辑。
2. 重写或删除失效测试：
   - workspace tab 显隐切换
   - 最后一个 tab 不可关闭
   - 旧网格显隐规则
3. 新增或更新以下测试：
   - `Overview + Request` 合并后的渲染/结构逻辑
   - 响应区与日志区职责分离逻辑
   - 切换接口时日志保留、响应等待态重置
   - 无参数接口仍可直接发送请求
   - 页面入口和路由响应验证
4. 检查覆盖率变化，必要时补充高价值用例，确保保持 `>= 90%`。

### 产出

- 更新后的工具函数
- 新旧行为切换后的测试集

### 完成标准

- 新测试覆盖关键交互迁移点
- 覆盖率不低于项目门禁要求

## 阶段 8：执行发布验证与回归检查

### 目标

在代码完成后进行完整的静态检查、单测和功能回归，确保达到可发布状态。

### 执行动作

1. 运行静态检查：
   - `npm run lint`
2. 运行单元测试与覆盖率检查：
   - `npm test -- --runInBand`
3. 使用本地 Explorer 做功能验证，重点覆盖：
   - 首页入口可打开 Explorer
   - Header 已缩小且导航清晰
   - 主操作区可完成接口选择、参数输入、发送请求
   - 响应区展示最近一次请求结果
   - 底部日志区可查看会话日志与详情
   - 无参数接口可直接请求
   - 切换接口不会清空会话日志
4. 使用 `GetDiagnostics` 检查最近改动文件的诊断问题，及时修复。

### 产出

- lint 结果
- 测试结果
- 功能验证结果

### 完成标准

- `linter_result`: pass
- `unit_test_result`: pass
- `func_test_result`: pass
- `status`: 成功

## 6. 文件改动映射

本次实施预计重点改动以下文件：

- `public/explorer/index.html`
- `public/explorer/styles.css`
- `public/explorer/app.js`
- `public/index.html`
- `src/util/apiExplorer.ts`
- `tests/apiExplorer.util.test.ts`
- `tests/explorer.routes.test.ts`

如现有测试结构需要拆分，可能新增以下文件：

- 新的 Explorer 结构或工具函数测试文件
- 覆盖率补强测试文件

## 7. 风险与应对

### 风险 1：结构与样式同时修改，回归面较大

应对：

- 按“先结构后样式”的顺序实施
- 每个阶段完成后立即做局部验证

### 风险 2：删除 workspace tab 逻辑后，脚本可能残留无用状态或事件绑定

应对：

- 先做旧逻辑清单
- 删除后跑一次静态检查与关键交互验证

### 风险 3：首页与 Explorer 风格同步时，容易出现视觉不一致

应对：

- 统一颜色、圆角、边框和按钮风格 token
- 优先复用相同样式语言，不做两套独立审美

### 风险 4：测试覆盖率因删除旧逻辑而波动

应对：

- 先删除低价值旧测试
- 再补足新布局和交互的高价值测试
- 以覆盖关键行为而非堆数量为目标

## 8. 完成定义

当以下条件全部满足时，本计划视为完成：

- Explorer 工作区已切换为固定专业布局
- Header 与首页已完成视觉收敛
- `Overview` 与 `Request` 已合并
- 独立 `History` 已删除并由底部 `Logs` 承接
- 所有静态检查和测试通过
- 覆盖率 `>= 90%`
- 本地功能验证通过且达到可发布状态
