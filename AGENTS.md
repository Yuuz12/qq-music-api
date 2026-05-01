# 🤖 QQ Music API - AI Agents 指南 (AGENTS.md)

本文档旨在详细说明项目中各 AI 代理（Agents）的角色、功能和使用方式。该指南结构化编写，便于大语言模型（LLM）和开发者快速识别和理解。

## 🎯 目录

1. [代理概述](#代理概述)
2. [核心代理列表](#核心代理列表)
3. [使用方式与示例代码](#使用方式与示例代码)
4. [开发与扩展](#开发与扩展)

---

## 代理概述

在 `qq-music-api` 项目中，AI 代理被用于自动化处理复杂的音乐数据获取、歌词解析、以及辅助智能检索。这些代理封装了底层的 API 细节，通过统一的接口与基础框架（Koa2）进行交互，极大地简化了业务层的调用链路。

## 核心代理列表

### 1. 🎵 DataFetcherAgent (数据获取代理)
- **角色**: 负责与 QQ 音乐底层接口进行网络通信的核心执行者。
- **功能**: 
  - 处理复杂的鉴权机制（如 VKey 计算、Cookie 动态设置）。
  - 自动拦截并重试失败的网络请求。
  - 对返回的原始深层 JSON 数据进行提取和初步清理。
- **适用场景**: 获取歌曲链接、歌手信息、排行榜单、歌单详情等。

### 2. 📝 LyricParserAgent (歌词解析代理)
- **角色**: 专门处理音乐歌词数据的转化器。
- **功能**: 
  - 解析不同格式的歌词文件（如标准 LRC）。
  - 将时间戳与文本内容进行精准对齐。
  - 支持多语言翻译映射与音译合并。
- **适用场景**: 歌曲播放页面的歌词滚动展示、歌词高亮匹配。

### 3. 🔍 SearchOptimizerAgent (搜索优化代理)
- **角色**: 优化用户搜索体验的智能分析器。
- **功能**: 
  - 接收用户模糊搜索输入，分析潜在搜索意图。
  - 智能路由到最适合的 API 接口进行多维度匹配（如单曲、专辑、歌手、MV 等）。
  - 聚合多个接口的返回结果并进行相关性排序。
- **适用场景**: 首页全局搜索、关键字智能提示、热门词推荐。

---

## 使用方式与示例代码

### 初始化与调用代理

所有的代理实例均建议通过统一的调度器或工厂模式进行初始化，以下为通用调用规范：

```javascript
// 示例：初始化并调用 DataFetcherAgent
const { AgentFactory } = require('./agents');

async function fetchSingerInfo(singerId) {
  // 1. 获取对应代理实例
  const dataAgent = AgentFactory.create('DataFetcherAgent');
  
  // 2. 准备请求上下文 (Context)
  const context = {
    action: 'get_singer_info',
    params: { id: singerId },
    options: { retry: 3 }
  };
  
  // 3. 执行代理任务
  try {
    const result = await dataAgent.execute(context);
    console.log('Singer Info successfully fetched:', result);
    return result;
  } catch (error) {
    console.error('Agent execution failed:', error.message);
    throw error;
  }
}
```

### LLM 调用指令规范 (System Instructions)

如果你是大语言模型（LLM）或其他自动化工作流，请遵循以下 JSON 结构调用代理机制：

```json
{
  "agent_type": "SearchOptimizerAgent",
  "intent": "search_music",
  "payload": {
    "keyword": "周杰伦",
    "limit": 10,
    "type": "album"
  },
  "response_format": "json"
}
```

---

## 项目目录结构与代理集成

为了更好地理解代理在项目中的定位，以下是 `qq-music-api` 的核心目录结构说明。在实际开发中，AI 代理通常集成在服务层或独立作为核心模块：

```text
qq-music-api/
├── src/                  # 核心源代码
│   ├── app.ts            # 应用入口
│   ├── agents/           # 🤖 AI 代理核心逻辑（建议扩展目录）
│   ├── controllers/      # 控制器层（接收请求并调用代理）
│   ├── services/         # 基础业务服务（被代理编排调用）
│   ├── routes/           # 路由定义
│   └── util/             # 工具函数
├── tests/                # 单元测试（需包含代理的 Mock 测试）
└── docs/                 # 项目文档
```

在扩展新代理时，请将其逻辑归聚于 `src/agents/` 目录，并通过控制器层暴露调用入口。

---

## 开发与扩展

如需为本项目添加新的 AI 代理，请遵循以下规范进行开发：
1. **继承基类**: 必须继承基础的 `BaseAgent` 抽象类。
2. **实现接口**: 必须实现统一的 `async execute(context)` 异步方法。
3. **注册代理**: 在 `AgentFactory` 中注册新代理的类映射。
4. **文档更新**: 为新代理编写单元测试，并在本文件 (`AGENTS.md`) 中更新其角色和功能说明。
