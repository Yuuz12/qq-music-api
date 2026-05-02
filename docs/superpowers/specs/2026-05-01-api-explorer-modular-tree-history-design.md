# API Explorer 模块化接口树与历史侧面板重构 Spec

## 1. 文档目标

本 Spec 定义 `.worktrees/api-explorer` 中 `explorer` 模块的新一轮全面重构方案。

本轮目标不是继续做局部样式微调，而是基于现有 API Explorer 能力，将其重构为一个具备清晰层次、标准接口、统一状态管理和可平滑迁移路径的模块化资源管理器。资源范围明确限定为：

1. 接口资源
2. 历史记录资源

本轮不扩展到代码文件资源、环境变量管理或收藏夹系统。

## 2. 背景与现状

当前 `explorer` 已具备以下基础能力：

- 通过 `/explorer/metadata` 提供接口元数据。
- 左侧支持搜索、方法过滤与接口切换。
- 右侧支持参数输入、请求摘要、响应展示与会话日志。
- 页面已具备稳定的 Header、Sidebar、Main 三段式基础布局。

当前实现的主要问题如下：

- `public/explorer/app.js` 以单文件方式同时承担状态管理、DOM 渲染、请求发送、日志记录和交互控制，职责耦合严重。
- 左侧接口区仍是列表式实现，尚未抽象为清晰的“接口树”资源模型。
- 历史记录虽然存在，但仍更接近日志输出，不是独立的资源视图。
- 右键菜单、节点级交互、键盘导航等增强能力缺少统一命令和状态入口。
- 搜索、过滤、切换接口和更新响应时，页面渲染逻辑边界不清晰，不利于性能优化和测试扩展。

## 3. 目标

本次工作的目标如下：

1. 采用模块化设计，分离视图层、业务逻辑层、领域状态层和基础设施层。
2. 将左侧导航重构为“接口树”，以分类分组和接口节点为核心资源模型。
3. 将历史记录重构为独立 `History Panel`，作为会话侧面板存在，而不是进入左侧主树。
4. 建立标准化接口规范，包括节点模型、命令入口、状态结构和菜单动作协议。
5. 保持现有核心接口调试功能完整，包括参数输入、请求发送、响应展示和历史记录。
6. 优化树渲染性能与页面局部更新策略。
7. 增强交互体验，至少覆盖右键菜单、键盘导航和更清晰的资源选择行为。
8. 提供与现有项目兼容的平滑迁移方案，不修改后端接口协议。
9. 补充必要的单元测试与集成验证，覆盖率维持在项目门禁要求之上。

## 4. 非目标

以下事项不在本轮范围内：

- 将 `explorer` 扩展为代码文件浏览器或 IDE 文件树。
- 新增环境变量管理、收藏夹体系或多工作区配置。
- 引入完整独立前端工程或新的页面路由体系。
- 修改 `/explorer/metadata` 协议结构。
- 修改后端业务路由、控制器和 QQ 音乐相关服务逻辑。
- 在本轮交付拖拽能力，本轮仅做架构预留，不做完整 DnD 实现。

## 5. 方案选型

本次采用 `方案 B：接口树 + 历史侧面板`。

### 5.1 方案 A：统一资源树 + 双资源适配器

- 左侧同一棵树同时承载接口资源和历史资源。

优点：

- 模型统一，扩展空间最大。

缺点：

- 首轮复杂度高。
- 历史记录与接口树的导航语义差异较大。
- 平滑迁移成本更高。

### 5.2 方案 B：接口树 + 历史侧面板

- 左侧主树只承载接口资源。
- 历史记录以独立面板形式存在于右侧工作区。

优点：

- 更符合当前页面的操作节奏。
- 不会把接口导航和历史回看混在一个树模型里。
- 兼顾资源管理能力和迁移成本。
- 与当前页面结构兼容性更好。

缺点：

- 资源系统不是全量统一树。
- 历史记录和接口资源分别拥有独立的可视容器。

### 5.3 方案 C：只做原生 JS 文件拆分

- 主要拆文件，不重构资源结构。

优点：

- 变更成本最低。

缺点：

- 资源边界不清晰。
- 只能缓解耦合，不能建立标准模型。
- 后续右键菜单和性能优化仍会受现有结构限制。

### 5.4 选择原因

选择方案 B 的原因如下：

- 用户明确希望只保留“接口 + 历史记录”两类资源。
- 用户明确表示本轮暂不做拖拽，因此更适合聚焦在树模型、状态设计和交互增强。
- 方案 B 能在不推翻当前主工作流的前提下建立清晰边界。
- 相比方案 A，方案 B 更适合当前代码基线的渐进式重构。

## 6. 总体架构

本轮重构后的前端结构采用五层分离：

1. `contracts`
2. `domain`
3. `application`
4. `infrastructure`
5. `view`

### 6.1 `contracts`

负责定义标准接口与类型契约，包括：

- 树节点模型
- 历史记录模型
- Store 状态接口
- 命令输入输出类型
- 右键菜单动作协议

### 6.2 `domain`

负责纯领域状态与无副作用逻辑，包括：

- 接口树节点构建
- 搜索与过滤选择器
- 分组展开状态管理
- 请求摘要生成
- 历史记录状态流转

### 6.3 `application`

负责页面命令编排与跨模块状态协调，包括：

- 初始化流程
- 切换接口
- 更新参数
- 发送请求
- 选择历史记录
- 执行树节点动作
- 控制上下文菜单开关

### 6.4 `infrastructure`

负责与外部系统或浏览器能力交互，包括：

- 元数据获取
- 请求发送
- 序列化和格式化工具
- DOM 事件适配
- 性能优化相关实现

### 6.5 `view`

负责纯视图装配与渲染，包括：

- Header
- 接口树
- 请求工作区
- Response 区
- History Panel
- Context Menu

设计原则如下：

- `view` 不直接决定业务规则。
- `application` 不直接操作具体 DOM 结构细节。
- `domain` 保持纯逻辑与可测试性。
- `infrastructure` 集中处理网络、浏览器和性能相关细节。

## 7. 页面信息架构

### 7.1 左侧主导航

左侧保持单一主树，仅承载接口资源：

- 分类分组节点
- 接口节点

左侧的职责为：

- 搜索接口
- 方法过滤
- 展开/收起分类
- 选择当前接口
- 打开接口节点右键菜单

左侧不承载：

- 历史记录
- 响应结果
- 请求体详情

### 7.2 右侧主工作区

右侧仍保持固定工作流布局，核心职责如下：

- 当前接口调试
- 最近一次请求响应展示
- 历史记录侧面板与详情查看

### 7.3 历史侧面板

历史记录不进入左侧树，而作为 `History Panel` 独立存在，职责如下：

- 展示当前会话的请求列表
- 展示当前选中历史记录的摘要与详情
- 支持基于历史项的轻量动作

语义约束如下：

- `Response` 只代表最近一次请求结果。
- `History Panel` 只代表历史轨迹和回看行为。
- 查看历史详情不覆盖 `Response` 当前状态。

## 8. 节点模型设计

### 8.1 接口树节点

左侧树只定义两类节点：

- `group`
- `endpoint`

其中：

- `group` 代表接口分类分组
- `endpoint` 代表具体接口资源

建议的类型契约如下：

```ts
export type ExplorerTreeNodeType = 'group' | 'endpoint'

export interface ExplorerTreeNodeBase {
  id: string
  type: ExplorerTreeNodeType
  label: string
}

export interface ExplorerGroupNode extends ExplorerTreeNodeBase {
  type: 'group'
  childIds: string[]
  isExpanded: boolean
  itemCount: number
}

export interface ExplorerEndpointNode extends ExplorerTreeNodeBase {
  type: 'endpoint'
  endpointId: string
  category: string
  method: 'GET' | 'POST'
  path: string
  searchableText: string
}
```

### 8.2 历史记录模型

历史面板使用独立模型，不复用左树节点：

```ts
export interface HistorySession {
  id: string
  label: string
  entryIds: string[]
}

export interface HistoryEntry {
  id: string
  endpointId: string
  endpointName: string
  method: string
  url: string
  status: number | 'error' | 'pending'
  duration: number | null
  requestBody: string
  responsePreview: string
  errorMessage: string
  createdAt: string
}
```

设计约束如下：

- 历史记录不以树形结构呈现。
- 历史详情面板与最新响应区语义隔离。
- 历史项点击默认只切换详情，不回填当前请求面板。

## 9. 状态模型设计

顶层状态建议分为四组：

- `resourceState`
- `viewState`
- `requestState`
- `historyState`

建议状态骨架如下：

```ts
export interface ExplorerState {
  resourceState: {
    metadata: ApiExplorerMetadata | null
    groupOrder: string[]
    groupMap: Record<string, ExplorerGroupNode>
    endpointMap: Record<string, ExplorerEndpointNode>
    visibleNodeIds: string[]
  }
  viewState: {
    activeEndpointId: string | null
    selectedHistoryEntryId: string | null
    searchKeyword: string
    methodFilter: 'ALL' | 'GET' | 'POST'
    expandedGroupIds: string[]
    isHistoryPanelOpen: boolean
    contextMenu: {
      isOpen: boolean
      nodeId: string | null
      x: number
      y: number
    }
  }
  requestState: {
    pathParams: Record<string, string>
    queryParams: Record<string, string>
    bodyText: string
    previewText: string
    isSending: boolean
    latestResponse: {
      statusText: string
      bodyText: string
      isError: boolean
    }
  }
  historyState: {
    sessions: Record<string, HistorySession>
    entries: Record<string, HistoryEntry>
    activeSessionId: string | null
    orderedEntryIds: string[]
  }
}
```

### 9.1 状态职责

- `resourceState` 负责接口树的原始资源和可见结果。
- `viewState` 负责选择状态、过滤条件和界面开关。
- `requestState` 负责参数输入、请求摘要和最新响应。
- `historyState` 负责历史记录与历史详情。

### 9.2 状态约束

- 切换接口不清空历史。
- 查看历史详情不修改当前接口。
- 请求完成后同时更新 `requestState.latestResponse` 与 `historyState.entries`。
- 右键菜单状态单独维护，不与树节点选中状态混用。

## 10. 数据流设计

### 10.1 初始化流程

页面初始化时，采用以下数据流：

1. `MetadataGateway` 拉取 `/explorer/metadata`
2. `ExplorerStore.initialize()` 处理元数据
3. 构建 `groupMap`、`endpointMap`、`visibleNodeIds`
4. 自动选中默认接口
5. 初始化请求面板默认值
6. 渲染左侧树、请求面板、响应区和历史面板

初始化失败时：

- 左侧树显示空态
- 右侧工作区显示“元数据加载失败”
- 历史面板保持空态

### 10.2 交互数据流

用户交互采用单向数据流：

`用户输入 -> application command -> store 更新 -> view 重渲染`

不允许：

- 视图层在多个位置直接修改共享状态
- DOM 成为状态的隐式事实来源

### 10.3 请求发送流

点击发送请求后，由命令层统一编排：

1. 校验参数
2. 构建请求 payload
3. 新增一条 `pending` 历史记录
4. 发起请求
5. 更新最新响应
6. 回填历史记录状态与摘要

## 11. 交互规则

### 11.1 接口树交互

- 点击分组节点：切换展开/收起，不影响当前接口选中。
- 点击接口节点：切换当前接口、重建请求面板、重算请求摘要、重置响应等待态。
- 搜索：匹配 `name`、`category`、`path`，只更新可见节点，不破坏原始结构。
- 方法过滤：与搜索条件叠加生效。
- 无结果：左侧显示空态，右侧保留当前接口上下文。

### 11.2 请求工作区交互

- 切换接口后按新元数据重建参数区。
- 无参数区块整块不渲染。
- 编辑参数后请求摘要实时更新。
- 不自动发请求。
- Body 非法 JSON 时发送前拦截，并展示明确错误提示。

### 11.3 响应与历史规则

- `Response` 只代表最近一次请求。
- `History Panel` 只展示历史记录和详情。
- 点击历史项只更新历史详情，不覆盖 `Response`。
- 如后续支持“回放请求”，必须通过显式动作触发，而不是点击历史项自动回写。

### 11.4 右键菜单规则

右键菜单只通过统一命令入口执行。

分组节点建议支持：

- 展开/收起
- 复制分组名
- 折叠其他分组

接口节点建议支持：

- 复制路径
- 复制请求模板
- 设为默认接口
- 在新会话中运行

历史项建议支持：

- 复制请求 URL
- 复制响应摘要
- 重新载入到请求面板

## 12. 性能优化策略

### 12.1 首轮优化重点

首轮优先实施以下性能策略：

- 增量渲染
- 计算缓存
- 事件委托
- 区域级局部更新

### 12.2 具体策略

- 元数据初始化后预先生成 `searchableText`，避免搜索时重复拼接字符串。
- 搜索与方法过滤结果缓存为 `visibleNodeIds`。
- 分组展开状态与选中状态分离存储，避免整棵树无意义重建。
- 树节点交互采用容器级事件委托，减少大量节点监听器。
- 请求区、响应区、历史区分别独立更新，避免单次状态变化触发整页重绘。
- 历史列表只渲染摘要，详情区按选中项单独渲染。
- 统一请求、响应和历史的序列化与格式化逻辑，减少重复 JSON 处理。

### 12.3 二阶段预留

若后续节点数量增长导致明显性能瓶颈，再补充：

- 树窗口化渲染
- 更细粒度的 selector 缓存
- 异步大列表绘制

本轮不将虚拟滚动作为强制前置。

## 13. 平滑迁移方案

迁移原则如下：

- 不改 `/explorer` 入口
- 不改 `/explorer/metadata` 协议
- 不改后端业务行为
- 以前端内部渐进替换为主

### 阶段 1：抽类型与纯逻辑

- 抽出节点类型、历史模型、请求构造与过滤逻辑
- 建立纯函数测试

### 阶段 2：引入 Store 与命令层

- 让现有页面开始通过 Store 驱动
- 把分散状态改为结构化状态

### 阶段 3：替换左侧接口树

- 用新的接口树渲染器替换旧接口列表
- 接入搜索、过滤、分组与右键菜单

### 阶段 4：重构历史侧面板

- 将现有日志/历史能力迁移为独立 `History Panel`
- 明确历史详情与最新响应的职责边界

### 阶段 5：清理旧逻辑与完成回归

- 删除冗余旧状态
- 删除重复格式化与旧列表逻辑
- 完成 lint、测试与功能验证

## 14. 兼容性要求

本轮必须满足以下兼容性约束：

- `/explorer` 访问路径保持不变。
- `/explorer/metadata` 输出协议保持不变。
- 现有接口请求链路保持不变。
- 现有首页入口与工作流不因前端架构调整而失效。
- 历史记录字段语义保持兼容，优先重构呈现层。

## 15. 测试设计

### 15.1 单元测试

重点覆盖以下纯逻辑模块：

- 树节点构建
- 搜索与过滤选择器
- 请求 payload 构造
- 历史记录状态流转
- 命令处理器

### 15.2 视图逻辑测试

重点覆盖以下行为：

- 分组展开/收起
- 切换接口后请求面板重建
- 右键菜单按节点类型展示正确动作
- 历史面板列表与详情联动
- 响应区和历史区职责分离

### 15.3 路由与页面集成测试

继续覆盖：

- `/explorer` 重定向
- `/explorer/metadata` 正常返回
- `index.html` 正确引用入口资源

并新增验证：

- 页面包含接口树容器
- 页面包含历史面板容器
- 页面包含上下文菜单锚点

### 15.4 功能验证

至少手工验证以下场景：

1. 初始化后接口树可见
2. 搜索与方法过滤正确工作
3. 点击接口后请求面板正确刷新
4. 请求成功后 `Response` 与历史列表同时更新
5. 请求失败后历史仍保留失败记录
6. 点击历史记录不覆盖最近响应
7. 右键菜单动作可正确执行
8. 无参数接口不渲染空壳区块

### 15.5 发布门禁

需满足：

- `npm run lint`
- `npm test -- --runInBand`
- 覆盖率 `>= 90%`
- 本地功能验证通过

最终输出应满足：

- `linter_result`: pass
- `unit_test_result`: pass
- `func_test_result`: pass
- `status`: 成功

## 16. 文件改动范围

本轮预计重点改动以下文件：

- `public/explorer/index.html`
- `public/explorer/app.js`
- `public/explorer/styles.css`
- `src/util/apiExplorer.ts`
- `tests/apiExplorer.util.test.ts`
- `tests/explorer.routes.test.ts`

如需要建立新的模块化目录，建议新增：

- `src/explorer/contracts/`
- `src/explorer/domain/`
- `src/explorer/application/`
- `src/explorer/infrastructure/`
- `src/explorer/view/`
- `tests/explorer/`

## 17. 风险与应对

### 风险 1：新旧状态并存导致事实来源混乱

应对：

- 每个迁移阶段明确唯一状态来源
- 优先先抽逻辑、后切视图

### 风险 2：接口树替换后交互回归

应对：

- 锁定稳定 DOM 锚点
- 先补树选择与过滤测试，再切换实现

### 风险 3：历史侧面板与响应区语义混淆

应对：

- 在设计和测试中明确约束两者职责不同
- 禁止点击历史项默认回写最近响应

### 风险 4：覆盖率因重构下降

应对：

- 优先抽取可测试纯逻辑
- 用高价值测试替换低价值旧测试

## 18. 完成定义

当以下条件全部满足时，本 Spec 对应工作视为完成：

- 接口树已替代旧接口列表并具备清晰节点模型。
- 历史记录已迁移为独立 `History Panel`。
- `explorer` 前端已具备清晰的模块边界与标准接口。
- 响应区与历史区职责完全分离。
- 右键菜单、搜索过滤和请求主流程保持可用。
- 静态检查、单元测试与功能验证全部通过。
- 覆盖率达到项目门禁要求。

## 19. 与前序设计的关系

本 Spec 建立在现有 API Explorer 页面和若干前序布局设计之上，但本轮重点不再是页面样式收敛本身，而是前端结构与资源模型的系统化重构。

若与前序“纯布局调整型”文档存在冲突，应以本 Spec 中对以下内容的定义为准：

- 方案选型
- 模块边界
- 节点模型
- 状态模型
- 数据流
- 迁移策略

## 20. Spec 自检结论

自检结论如下：

- 已明确本轮只覆盖“接口 + 历史记录”，未扩展到文件资源。
- 已明确采用 `方案 B：接口树 + 历史侧面板`。
- 已明确本轮不交付拖拽，仅做架构预留。
- 已明确状态边界、数据流、交互规则、性能策略和测试设计。
- 文档中无 `TODO`、`TBD` 或范围未决项。
