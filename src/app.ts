import { exec } from 'node:child_process';
import path from 'node:path';
import chalk from 'chalk';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import serve from 'koa-static';

import cors from './middlewares/koa-cors';
import router from './routes/router';
import cookie from './util/cookie';
import { logger, loggerState } from './util/logger';
import './util/colors';
import pkg from '../package.json';
import { serverConfig, userInfo } from './config';

const app = new Koa();
const isTestEnv = loggerState.isTestEnv;

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
}

app.use(bodyParser());
app.use(cookie());
app.use(serve(path.join(__dirname, '../public')));

// logger
app.use(async (ctx: Koa.Context, next: Koa.Next) => {
  await next();
  const rt = ctx.response.get('X-Response-Time');
  const sanitizedUrl = encodeURI(ctx.url).replace(/%0D|%0A/gi, '');
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
  app.listen(serverConfig.port, () => {
    logger.info(chalk.white(`server running @ http://localhost:${serverConfig.port}`));
  });
}

export default app;
