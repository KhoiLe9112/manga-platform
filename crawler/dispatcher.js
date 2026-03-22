const { redisConnection, QUEUE_NAME, mangaQueue } = require('../shared/queue');
const logger = require('../shared/logger');

const DISCOVERY_ROOT = 'https://nettruyenviet1.com/tim-truyen?page=';

const dispatchDiscovery = async (pages = 100) => {
  logger.info(`Dispatching discovery for ${pages} pages`);
  for (let i = 1; i <= pages; i++) {
    await mangaQueue.add('discover-manga', { url: `${DISCOVERY_ROOT}${i}` }, {
      jobId: `discover-page-${i}`,
      removeOnComplete: true,
    });
  }
};

// Scheduler logic or initial trigger
if (require.main === module) {
  dispatchDiscovery().then(() => {
    logger.info('Dispatcher initiated');
    process.exit(0);
  }).catch(err => {
    logger.error('Dispatcher failed', err);
    process.exit(1);
  });
}

module.exports = { dispatchDiscovery };
