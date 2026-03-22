const cron = require('node-cron');
const { dispatchDiscovery } = require('../crawler/dispatcher');
const logger = require('../shared/logger');

// Run every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  logger.info('Running scheduled discovery job');
  try {
    // Only dispatch a few pages (1-5) for updates
    await dispatchDiscovery(5);
  } catch (err) {
    logger.error('Scheduled job failed', err);
  }
});

logger.info('Scheduler started: running every 30 minutes');
