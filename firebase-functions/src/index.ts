import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { runDailyOrchestration } from './orchestrate';

export const health = onRequest((req, res) => {
  logger.info('health check', { method: req.method, path: req.path });
  res.status(200).send('ok');
});

export const dailyPipeline = onSchedule(
  {
    schedule: '0 7 * * *',
    timeZone: 'Asia/Seoul'
  },
  async () => {
    await runDailyOrchestration();
  }
);
