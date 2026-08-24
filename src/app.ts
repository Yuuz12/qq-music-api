import { exec } from 'node:child_process';
import path from 'node:path';
import chalk from 'chalk';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import serve from 'koa-static';

import {
  API_EXPLORER_INDEX_PATH,
  API_EXPLORER_METADATA_PATH,
  API_EXPLORER_ROUTE_PATH,
  apiExplorerMetadata,
} from './config/apiExplorer';
import cors from './middlewares/koa-cors';
import router from './routes/router';
import cookie from './util/cookie';
import { logger, loggerState } from './util/logger';
import { autoOpenExplorer } from './util/openExplorer';
import './util/colors';
import pkg from '../package.json';
import { serverConfig, userInfo } from './config';

const app = new Koa();
const isTestEnv = loggerState.isTestEnv;
const publicDirectory = path.join(__dirname, '../public');
const isExplorerDebugRequest = (pathName: string): boolean =>
  pathName === API_EXPLORER_ROUTE_PATH ||
  pathName === API_EXPLORER_METADATA_PATH ||
  pathName.startsWith(`${API_EXPLORER_ROUTE_PATH}/`);

const logExplorerRequestDebug = (stage: string, details: Record<string, unknown>): void => {
  logger.debug(`[explorer.server] ${stage}`, details);
};

logger.info(chalk.green('\n🥳🎉 We had supported config the user cookies. \n'));

if (!(userInfo.loginUin || userInfo.uin)) {
  logger.info(
    chalk.yellow(
      `😔 The configuration ${chalk.red('loginUin')} or your ${chalk.red('cookie')} in file ${chalk.green('config/user-info')} has not configured. \n`,
    ),
  );
}

if (!userInfo.cookie) {
  logger.info(
    chalk.yellow(
      `😔 The configuration ${chalk.red('cookie')} in file ${chalk.green('config/user-info')} has not configured. \n`,
    ),
  );
}

if (!isTestEnv) {
  // 本播放器项目适配：try/catch 防止 exec 失败（如无 npm 环境/沙箱限制）导致服务启动崩溃
  try {
    const versionCheckProcess = exec('npm info qq-music-api version', (err, stdout) => {
      if (!err) {
        const version = stdout.trim();
        if (pkg.version < version) {
          logger.info(
            chalk.white(
              `Current Version: ${version}, Local Version: ${pkg.version}, Please update it.`,
            ),
          );
        }
      }
    });

    versionCheckProcess.unref();
  } catch (e) {
    logger.warn('version check skipped:', String(e));
  }
}

app.use(bodyParser());
app.use(cookie());
app.use(async (ctx: Koa.Context, next: Koa.Next) => {
  if (isExplorerDebugRequest(ctx.path)) {
    logExplorerRequestDebug('request-enter', {
      method: ctx.method,
      path: ctx.path,
      url: ctx.url,
    });
  }

  if (ctx.path === API_EXPLORER_ROUTE_PATH) {
    logExplorerRequestDebug('route-redirect', {
      from: ctx.path,
      to: API_EXPLORER_INDEX_PATH,
      method: ctx.method,
    });
    ctx.redirect(API_EXPLORER_INDEX_PATH);
    return;
  }

  if (ctx.path === API_EXPLORER_METADATA_PATH) {
    logExplorerRequestDebug('route-metadata', {
      endpointCount: apiExplorerMetadata.endpoints.length,
      method: ctx.method,
      path: ctx.path,
      type: 'application/json',
    });
    ctx.type = 'application/json';
    ctx.body = apiExplorerMetadata;
    return;
  }

  const requestStartAt = Date.now();
  if (isExplorerDebugRequest(ctx.path)) {
    logExplorerRequestDebug('next-before', {
      method: ctx.method,
      path: ctx.path,
      startedAt: requestStartAt,
    });
  }
  await next();
  if (isExplorerDebugRequest(ctx.path)) {
    logExplorerRequestDebug('next-after', {
      durationMs: Date.now() - requestStartAt,
      method: ctx.method,
      path: ctx.path,
      responseTime: ctx.response.get('X-Response-Time') || `${Date.now() - requestStartAt}ms`,
      status: ctx.status,
    });
  }
});
app.use(serve(publicDirectory));

// logger
app.use(async (ctx: Koa.Context, next: Koa.Next) => {
  const requestStartAt = Date.now();
  await next();
  const rt = ctx.response.get('X-Response-Time');
  const sanitizedUrl = encodeURI(ctx.url).replace(/%0D|%0A/gi, '');

  if (isExplorerDebugRequest(ctx.path)) {
    logExplorerRequestDebug('request-summary', {
      durationMs: Date.now() - requestStartAt,
      method: ctx.method,
      responseTime: rt || `${Date.now() - requestStartAt}ms`,
      sanitizedUrl,
      status: ctx.status,
    });
  }

  logger.info(chalk.white(`${ctx.method} ${sanitizedUrl} - ${rt}`));
});

// cors
app.use(
  cors({
    origin: '*',
    ...serverConfig.cors,
  }),
);

// x-response-time
app.use(async (ctx: Koa.Context, next: Koa.Next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.set('X-Response-Time', `${ms}ms`);
});

app.use(router.routes()).use(router.allowedMethods());

if (!isTestEnv) {
  // 本播放器项目适配（2026-08）：API 仅监听 127.0.0.1（内部服务），
  // 对外统一走 8080 的 /api 反向代理（server.mjs），避免多端口暴露。
  app.listen(serverConfig.port, '127.0.0.1', () => {
    logger.info(chalk.white(`server running @ http://127.0.0.1:${serverConfig.port}`));
    autoOpenExplorer(serverConfig.port);
  });
}

export default app;
