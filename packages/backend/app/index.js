import os from 'os';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import { logError, logInfo } from './utils/logger';
import logger from './middlewares/logger';
import headers from './middlewares/headers';
import route from './routes';
import { revokeAll } from './utils/token';
import state from './utils/state';

import * as Sentry from '@sentry/node';
import { plain_data, SENTRY_ID } from '../config';
import db from './db';
import puppeteer from 'puppeteer';
if (process.env.NODE_ENV !== 'development') {
  Sentry.init({
    dsn: SENTRY_ID,
    environment: process.env.NODE_ENV,
    serverName: `${os.hostname()}`
  });
}
if (plain_data) {
  logError('❌ 口座データが暗号化されていません');
  logError('  yarn b encrypt を使用して暗号化してください！');
  process.exit(1);
}

(async () => {
  const tables = Object.keys(db.tables).map(key => db.tables[key].sync());
  await Promise.all(tables);
  logInfo('Database sync completed ✔');

  await revokeAll();
  logInfo('Database cleanup completed 🧹');

  const browser = await puppeteer.launch({
    headless: process.env.NODE_ENV !== 'development',
    slowMo: 200,
    args: [
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding'
    ]
  });
  state.set('browser', browser);
  logInfo('Puppeteer started ✔');

  const app = new Koa();
  app.use(logger);
  app.use(headers);

  app.use(bodyParser());

  const router = route(app);
  app.use(router.routes());
  app.use(router.allowedMethods());

  app.listen(process.env.PORT || 5100);

  logInfo('Bank-Monitor: An open online-banking app.');
  logInfo('Server started >w<');
})();
