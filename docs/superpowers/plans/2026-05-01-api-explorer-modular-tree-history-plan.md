# API Explorer 模块化接口树与历史侧面板 Implementation Plan

## 1. 计划目标

本计划用于承接已确认的设计文档 [2026-05-01-api-explorer-modular-tree-history-design.md](file:///Users/bytedance/Desktop/MyWork/github/qq-music-api/.worktrees/api-explorer/docs/superpowers/specs/2026-05-01-api-explorer-modular-tree-history-design.md)，将 `explorer` 从当前单文件原生脚本实现，迁移为“接口树 + 历史侧面板”的模块化资源管理器。

本计划重点解决以下六件事：

1. 抽离标准节点模型、状态接口和命令协议。
2. 用结构化 Store 替换当前分散的全局页面状态。
3. 将左侧接口列表升级为真正的接口树。
4. 将现有日志记录重构为独立 `History Panel`。
5. 在不修改后端协议的前提下完成平滑迁移。
6. 通过测试、lint 和功能验证将结果提升到可发布状态。

## 2. 实施原则

- 先抽逻辑再切 UI：先把类型、纯函数和状态逻辑从 `app.js` 中剥离，再替换视图层。
- 先建标准边界再补交互：右键菜单、键盘导航等能力必须建立在统一节点模型和命令入口之上。
- 先保留功能闭环再重构表现：请求发送、响应展示、历史记录能力必须在所有阶段保持可用。
- 先兼容旧协议再演进内部结构：不修改 `/explorer/metadata` 和既有路由入口。
- 先补高价值测试再做清理：避免删掉旧逻辑后没有等价的新测试兜底。

## 3. 交付范围

本计划覆盖以下交付物：

- 模块化 `explorer` 前端目录结构
- 接口树节点模型与历史记录模型
- `ExplorerStore` 与应用层命令
- 新版接口树视图
- 新版 `History Panel`
- 右键菜单与基础键盘交互
- 性能优化基础设施
- 对应测试与文档更新

本计划不覆盖：

- 代码文件资源管理
- 环境变量系统
- 收藏夹系统
- 完整拖拽交互
- 新独立前端工程

## 4. 里程碑概览

### 里程碑 M1：完成可测试核心抽离

目标：

- 从现有页面脚本中抽出类型与纯逻辑模块。

完成标准：

- 树构建、过滤、请求构造、历史映射逻辑已有独立测试。

### 里程碑 M2：完成 Store 与命令层接入

目标：

- 用结构化状态和统一命令替代分散状态修改。

完成标准：

- 页面核心行为通过 Store 驱动。

### 里程碑 M3：完成接口树替换

目标：

- 左侧从接口列表切换为分组接口树。

完成标准：

- 分类分组、搜索过滤、展开收起和接口选择全部接入新树。

### 里程碑 M4：完成历史侧面板替换

目标：

- 将历史记录从现有日志实现迁移为独立面板。

完成标准：

- `Response` 和 `History Panel` 职责完全分离。

### 里程碑 M5：完成交互增强与性能优化

目标：

- 接入右键菜单、基础键盘导航和局部更新优化。

完成标准：

- 树节点动作、事件委托和区域级重渲染全部稳定工作。

### 里程碑 M6：完成测试与发布验证

目标：

- 跑通 lint、测试、覆盖率与手工验证。

完成标准：

- 发布门禁全部通过。

## 5. 建议目录结构

建议新增如下目录结构：

```text
src/explorer/
├── contracts/
│   ├── nodes.ts
│   ├── history.ts
│   ├── state.ts
│   └── actions.ts
├── domain/
│   ├── buildTree.ts
│   ├── selectors.ts
│   ├── requestPreview.ts
│   └── historyReducer.ts
├── application/
│   ├── ExplorerStore.ts
│   ├── commands/
│   │   ├── initializeExplorer.ts
│   │   ├── selectEndpoint.ts
│   │   ├── updateRequestField.ts
│   │   ├── sendRequest.ts
│   │   ├── selectHistoryEntry.ts
│   │   └── invokeTreeAction.ts
│   └── controllers/
│       └── contextMenuController.ts
├── infrastructure/
│   ├── metadataGateway.ts
│   ├── requestClient.ts
│   ├── formatters.ts
│   └── browserEvents.ts
└── view/
    ├── renderExplorerShell.ts
    ├── renderTree.ts
    ├── renderRequestPanel.ts
    ├── renderResponsePanel.ts
    ├── renderHistoryPanel.ts
    └── renderContextMenu.ts
```

对应测试目录建议为：

```text
tests/explorer/
├── domain/
├── application/
├── infrastructure/
└── view/
```

## 6. 分阶段实施步骤

## 阶段 1：盘点现有实现与锚点

### 目标

在改造前明确现有页面结构、状态入口、测试覆盖点和可复用逻辑，避免盲拆。

### 执行动作

1. 审查当前 `public/explorer/app.js` 中以下逻辑：
   - 状态对象
   - 过滤与搜索
   - 请求构造
   - 日志创建与更新
   - DOM 渲染入口
2. 审查当前 `public/explorer/index.html` 中可复用锚点：
   - 左侧搜索与过滤区域
   - 请求区
   - 响应区
   - 日志区
3. 审查当前 `tests/explorer.routes.test.ts` 与 `tests/apiExplorer.util.test.ts` 的断言范围。
4. 列出：
   - 可直接复用的函数
   - 必须迁移的函数
   - 需要废弃的旧逻辑

### 产出

- 现有逻辑映射清单
- 迁移优先级清单

### 完成标准

- 明确哪些逻辑先抽离、哪些逻辑后替换。

## 阶段 2：建立 `contracts` 与 `domain` 基础模块

### 目标

先形成稳定的类型契约和可测试纯逻辑，建立重构的可控核心。

### 执行动作

1. 新增节点类型定义：
   - `ExplorerGroupNode`
   - `ExplorerEndpointNode`
   - `HistorySession`
   - `HistoryEntry`
2. 新增状态接口定义：
   - `ExplorerState`
   - `ResourceState`
   - `ViewState`
   - `RequestState`
   - `HistoryState`
3. 抽出纯逻辑模块：
   - 从 metadata 构建树
   - 生成 `searchableText`
   - 过滤和排序可见节点
   - 生成请求预览文本
   - `pending -> success/error` 历史状态流转
4. 为上述模块编写单元测试。

### 产出

- `contracts` 目录
- `domain` 目录
- 对应纯逻辑测试

### 完成标准

- 树构建、过滤与历史流转都可脱离 DOM 独立测试。

## 阶段 3：建立 `ExplorerStore` 和命令层

### 目标

建立统一状态入口，替代当前页面对全局状态对象的散落修改。

### 执行动作

1. 新建 `ExplorerStore`，至少支持：
   - `getState()`
   - `setState()`
   - `subscribe()`
2. 新建应用层命令：
   - `initializeExplorer`
   - `selectEndpoint`
   - `toggleGroup`
   - `updateSearchKeyword`
   - `updateMethodFilter`
   - `updateRequestField`
   - `sendRequest`
   - `selectHistoryEntry`
   - `invokeTreeAction`
3. 将现有页面逻辑中的关键状态改动迁移到命令层。
4. 增加命令层测试，重点覆盖：
   - 接口切换
   - 搜索过滤
   - 请求发送前后状态
   - 历史记录追加

### 产出

- `ExplorerStore`
- 命令层实现
- 命令层测试

### 完成标准

- 页面不再通过多个散落函数直接改全局状态。

## 阶段 4：替换左侧接口列表为接口树

### 目标

让左侧从列表式导航迁移为真正的接口树，并具备更清晰的资源交互能力。

### 执行动作

1. 新建接口树渲染器：
   - 分组节点
   - 接口节点
2. 接入以下能力：
   - 搜索
   - 方法过滤
   - 分组展开/收起
   - 当前接口高亮
3. 使用事件委托处理：
   - 点击
   - 右键
   - 键盘导航
4. 保持搜索与方法过滤行为与当前体验兼容。
5. 更新 `index.html` 中左侧锚点或容器结构，使其适配树渲染。

### 产出

- 新版接口树视图
- 接口树事件绑定

### 完成标准

- 左侧接口导航已切换为树模型且核心操作稳定。

## 阶段 5：重构请求工作区绑定逻辑

### 目标

让右侧请求工作区只消费 Store 状态，并与左树的接口选择保持清晰联动。

### 执行动作

1. 重构请求面板渲染器，输入来源改为：
   - 当前 `activeEndpointId`
   - `requestState`
2. 保留现有能力：
   - 路径参数
   - 查询参数
   - Body JSON
   - 请求摘要
   - 发送请求
3. 确保以下行为成立：
   - 切换接口后参数区重建
   - 默认值自动填充
   - 无参数区块整块不渲染
   - Body 非法 JSON 会阻止请求
4. 将请求区与响应区的更新拆开，避免切换接口时整页重绘。

### 产出

- Store 驱动的请求工作区
- 请求区交互测试

### 完成标准

- 请求区可完全通过当前状态重渲染，不依赖隐式 DOM 状态。

## 阶段 6：重构 `Response` 与 `History Panel`

### 目标

把当前日志/历史实现升级为独立历史侧面板，并保证其与最新响应区职责分离。

### 执行动作

1. 拆分当前日志逻辑：
   - 最近一次请求结果留在 `Response`
   - 会话历史迁移到 `History Panel`
2. 历史面板至少包含：
   - 历史列表
   - 当前选中历史详情
3. 保证以下交互：
   - 新请求完成后更新 `Response`
   - 同时新增或回填历史记录
   - 点击历史项只更新历史详情
4. 如保留“重新加载到请求面板”动作，必须通过显式按钮或菜单触发。

### 产出

- 独立 `History Panel`
- 历史列表与详情联动逻辑

### 完成标准

- 历史详情和最新响应不会互相覆盖。

## 阶段 7：接入右键菜单与基础键盘导航

### 目标

在标准节点模型基础上补充资源级交互增强。

### 执行动作

1. 新增树节点上下文菜单控制器。
2. 接口分组节点接入动作：
   - 展开/收起
   - 折叠其他分组
   - 复制分组名
3. 接口节点接入动作：
   - 复制路径
   - 复制请求模板
   - 设为默认接口
   - 在新会话中运行
4. 历史项接入轻量动作：
   - 复制 URL
   - 复制响应摘要
   - 重新加载到请求面板
5. 补充键盘支持：
   - `ArrowUp/ArrowDown`
   - `ArrowLeft/ArrowRight`
   - `Enter`
   - `Escape`

### 产出

- 右键菜单模块
- 键盘交互模块
- 对应测试

### 完成标准

- 树与历史项具备基础增强交互且行为可测试。

## 阶段 8：落实性能优化策略

### 目标

在结构稳定后完成首轮高价值性能优化。

### 执行动作

1. 引入搜索与过滤结果缓存。
2. 将树交互改为事件委托。
3. 将视图更新收敛为区域级渲染：
   - 树区域
   - 请求区
   - 响应区
   - 历史区
4. 统一格式化工具：
   - 请求摘要格式化
   - 响应格式化
   - 历史详情格式化
5. 评估是否需要窗口化渲染：
   - 若当前数据规模无明显瓶颈，则仅保留结构预留，不立即实现。

### 产出

- 首轮性能优化实现
- 性能相关测试或行为验证

### 完成标准

- 高频搜索、切换接口和查看历史时无明显多余重渲染。

## 阶段 9：更新 HTML 与样式结构

### 目标

让页面结构与新的模块边界保持一致，并为新交互提供稳定容器。

### 执行动作

1. 更新 `public/explorer/index.html`：
   - 左侧树容器
   - 请求工作区容器
   - 响应区容器
   - 历史面板容器
   - 上下文菜单锚点
2. 更新 `public/explorer/styles.css`：
   - 树节点样式
   - 右键菜单样式
   - 历史面板样式
   - 焦点与键盘导航态
3. 避免一次性打碎现有样式层级，优先兼容旧类名，再逐步收敛。

### 产出

- 新版 `explorer` DOM 与样式

### 完成标准

- 页面结构与模块边界对齐，样式无明显冲突。

## 阶段 10：测试迁移与补强

### 目标

用新的高价值测试覆盖取代旧的低价值耦合测试。

### 执行动作

1. 更新或新增以下测试：
   - 树节点构建测试
   - 搜索和方法过滤测试
   - `selectEndpoint` 命令测试
   - `sendRequest` 状态流转测试
   - 历史详情与最新响应职责分离测试
   - 右键菜单动作测试
2. 更新 `explorer.routes.test.ts`，验证：
   - 页面引用新的结构锚点
   - `/explorer/metadata` 仍正常返回
3. 删除或替换不再适用的旧测试断言。
4. 跟踪覆盖率，补齐高价值空白。

### 产出

- 新版 Explorer 测试集
- 覆盖率结果

### 完成标准

- 新测试覆盖核心重构风险点，覆盖率满足门禁。

## 阶段 11：执行回归与发布验证

### 目标

确保所有重构成果满足可发布标准。

### 执行动作

1. 运行静态检查：
   - `npm run lint`
2. 运行测试：
   - `npm test -- --runInBand`
3. 检查覆盖率结果。
4. 通过本地 Explorer 做功能验证，至少覆盖：
   - 页面初始化
   - 树筛选
   - 接口切换
   - 请求发送
   - 历史记录新增
   - 历史详情查看
   - 右键菜单动作
5. 使用 `GetDiagnostics` 检查最近改动文件的诊断问题并修复。

### 产出

- lint 结果
- test 结果
- 覆盖率结果
- 功能验证记录

### 完成标准

- `linter_result`: pass
- `unit_test_result`: pass
- `func_test_result`: pass
- `status`: 成功

## 7. 文件改动映射

预计重点改动文件如下：

- `public/explorer/index.html`
- `public/explorer/app.js`
- `public/explorer/styles.css`
- `src/util/apiExplorer.ts`
- `tests/apiExplorer.util.test.ts`
- `tests/explorer.routes.test.ts`

预计新增文件如下：

- `src/explorer/contracts/*`
- `src/explorer/domain/*`
- `src/explorer/application/*`
- `src/explorer/infrastructure/*`
- `src/explorer/view/*`
- `tests/explorer/*`

## 8. 风险与回退策略

### 风险 1：Store 接入后新旧状态双轨并存

回退策略：

- 每个阶段保留旧入口，但只允许一个状态来源为真。
- 若出现回归，优先回退到前一阶段可工作的 Store 接入点。

### 风险 2：树替换后导航体验下降

回退策略：

- 在树稳定前保留旧列表实现备份分支。
- 优先保住搜索和选中行为，不急于叠加右键菜单。

### 风险 3：历史面板替换影响请求主流程

回退策略：

- 保留现有历史数据结构。
- 若详情联动出现问题，优先保留记录列表，再逐步恢复详情联动。

### 风险 4：模块化后样式与 DOM 锚点变化导致测试脆弱

回退策略：

- 尽量基于稳定容器和角色断言，而不是脆弱文案。
- 阶段性更新测试，避免最终一次性大面积修复。

## 9. 验收清单

以下全部满足时，本计划可视为完成：

- `contracts`、`domain`、`application`、`infrastructure`、`view` 已建立并承担明确职责。
- 左侧接口树已替代旧接口列表。
- 历史记录已迁移为独立 `History Panel`。
- `Response` 与 `History Panel` 职责分离。
- 右键菜单和基础键盘导航可用。
- 搜索、过滤、请求发送、历史查看等核心流程可用。
- `npm run lint` 通过。
- `npm test -- --runInBand` 通过。
- 覆盖率 `>= 90%`。
- 手工功能验证通过。

## 10. 计划自检结论

自检结论如下：

- 计划与已确认的 `方案 B：接口树 + 历史侧面板` 保持一致。
- 已显式约束本轮不做拖拽、文件资源和环境变量管理。
- 已给出可执行的阶段拆分、目录建议、测试策略和回退路径。
- 已覆盖从设计落地到发布验证的完整闭环。
