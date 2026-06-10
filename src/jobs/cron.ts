import cron from 'node-cron';
import { logger } from '../utils/logger.js';
import { syncAll } from '../services/syncService.js';
export function startCron() {
  cron.schedule('0 */4 * * *', async () => {
    try {
      logger.info('Starting scheduled sync');
      await syncAll();
      logger.info('Scheduled sync completed');
    } catch (error) {
      logger.error({ error }, 'Scheduled sync failed');
    }
  });
}
