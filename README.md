<h1 align="center">QQ Music API</h1>

<div align="center">

<img src='music.png' />

!\[GitHub watchers]\(https\://img.shields.io/github/watchers/rain120/qq-music-api?style=social null) !\[GitHub stars]\(https\://img.shields.io/github/stars/rain120/qq-music-api?style=social null) !\[GitHub forks]\(https\://img.shields.io/github/forks/rain120/qq-music-api?style=social null)

!\[node]\(https\://img.shields.io/node/v/koa?style=flat-square null)

!\[GitHub repo size]\(https\://img.shields.io/github/repo-size/rain120/qq-music-api?style=flat-square null) !\[GitHub package.json version]\(https\://img.shields.io/github/package-json/v/rain120/qq-music-api?style=flat-square null) !\[GitHub]\(https\://img.shields.io/github/license/rain120/qq-music-api?style=flat-square null) !\[GitHub open issues]\(https\://img.shields.io/github/issues/rain120/qq-music-api?style=flat-square null) !\[GitHub closed issues]\(https\://img.shields.io/github/issues-closed/rain120/qq-music-api null) !\[GitHub last commit]\(https\://img.shields.io/github/last-commit/rain120/qq-music-api?style=flat-square null) !\[GitHub top language]\(https\://img.shields.io/github/languages/top/rain120/qq-music-api?style=flat-square null)

</div>

> QQ音乐API koa2 版本, 通过Web网页版请求QQ音乐接口数据。本项目集成了自动化数据处理代理，提供高效、易用的接口服务。
> 有问题请提 [issue](https://github.com/Rain120/qq-music-api/issues)。欢迎阅读 [参与贡献指南](./CONTRIBUTING.md) 参与项目开发，并查阅 [AI 代理指南](./AGENTS.md) 了解自动化机制。

> ⚠️ 当前代码仅供学习，不可做商业用途。

### API结构图

> 目前暂时没有时间做登录模块的接口，欢迎各位大佬给我`PR`, 阿里嘎多

!\[qq-music]\(./screenshot/qq-music.png null)

### 环境要求

> 因为本项目采用的是`koa2`, 所以请确保你的`node`版本是7.6.0+

```
node -v
```

### 🚀 快速入门 (Quick Start)

#### 📦 安装

请确保您的本地 Node.js 版本满足 [环境要求](#环境要求)。

```sh
git clone git@github.com:Rain120/qq-music-api.git
cd qq-music-api
npm install
```

#### 🔨 项目启动

```sh
# 开发环境（支持热重载）
npm run dev

# 生产环境启动
npm start
```

项目默认监听端口是 `3200`，启动成功后可在浏览器访问 `http://localhost:3200` 体验接口服务。

### 🐳 Docker

```sh
# local local build
npm run build:local-images

# local remote build
npm run build:remote-images

# build images
npm run build:images

# local run
npm run run:images

# remote run
docker pull qq-music-api
```

### 功能特性

- [x] 获取歌曲播放链接 **2021-01-24**
- [x] 支持自定义设置 `cookie` **2021-01-23**
- [x] 获取歌曲 + 专辑图片 **2020-05-24**
- [x] 获取歌手热门歌曲 **2020-07-04**
- [x] 获取QQ音乐产品的下载地址
- [x] 获取歌单分类
- [x] 获取歌单列表
- [x] 获取歌单详情
- [x] 获取MV标签
- [x] 获取MV播放信息
- [x] 获取歌手MV
- [x] 获取相似歌手
- [x] 获取歌手信息
- [x] 获取歌手被关注数量信息
- [x] 获取电台列表
- [x] 获取专辑
- [x] 获取数字专辑
- [x] 获取歌曲歌词
- [x] 获取MV
- [x] 获取新碟信息
- [x] 获取歌手专辑
- [x] ~~获取歌曲VKey~~ **2021-01-24**
- [x] 获取搜索热词
- [x] 获取关键字搜索提示
- [x] 获取搜索结果
- [x] 获取首页推荐
- [x] 获取排行榜单列表
- [x] 获取排行榜单详情
- [x] 获取评论信息(cmd代表的意思没太弄明白)
- [x] 获取票务信息
- [x] 获取歌单详情
- [x] 获取歌手列表

### 使用文档

使用`apis`详见[文档](https://rain120.github.io/qq-music-api/#/)

### Star History

<a href="https://www.star-history.com/?repos=rain120%2Fqq-music-api&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/image?repos=rain120/qq-music-api&type=date&theme=dark&logscale&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/image?repos=rain120/qq-music-api&type=date&logscale&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/image?repos=rain120/qq-music-api&type=date&logscale&legend=top-left" />
 </picture>
</a>

### 关于项目

**灵感来自**

[Binaryify/NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi)

[Vue2.0开发企业级移动端音乐Web App](https://coding.imooc.com/class/107.html)

**参考内容**

[Koa 2](https://koa.bootcss.com/)

[Axios](https://github.com/axios/axios)

[阮一峰老师 - HTTP Referer 教程](http://www.ruanyifeng.com/blog/2019/06/http-referer.html)

### 项目不足

1. 因为本人没写过`unit test`, 所以本项目尚未添加`unit test`, 等有时间再添加;
2. 登录获取个人信息等接口都没做

### 🤖 AI 代理 (Agents)

本项目引入了智能化代理架构以优化数据获取和解析链路。详细了解各 AI 代理的角色、功能以及调用规范，请查阅我们的 **[AI 代理指南 (AGENTS.md)](./AGENTS.md)**。

#### 🤝 参与贡献 ![PR](https://img.shields.io/badge/PRs-Welcome-orange?style=flat-square&logo=appveyor)

我们非常欢迎并感激所有的贡献！无论是提交 Bug、改进文档还是新增功能，您的支持对项目发展至关重要。

详细的贡献流程、代码提交规范以及本地开发配置，请仔细阅读我们的 **[参与贡献指南 (CONTRIBUTING.md)](./CONTRIBUTING.md)**。您可以通过提交 [Pull Requests](https://github.com/Rain120/qq-music-api/pulls) 或发布 [Issue](https://github.com/Rain120/qq-music-api/issues) 来参与共建。

#### 👨‍🏭 作者

> Front-End development engineer, technology stack: React + Typescript + Mobx, also used Vue + Vuex for a while

- [Github](https://github.com/Rain120)
- [知乎](https://www.zhihu.com/people/yan-yang-nian-hua-120/activities)
- [掘金](https://juejin.im/user/57c616496be3ff00584f54db)

#### 📝 License

[MIT](https://github.com/Rain120/qq-music-api/blob/master/LICENSE)

Copyright © 2019-present [Rain120](https://github.com/Rain120).
