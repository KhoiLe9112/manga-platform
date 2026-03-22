const { Queue } = require('bullmq');
const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisOptions = {
  maxRetriesPerRequest: null,
  ...(redisUrl.startsWith('rediss://') ? { tls: { rejectUnauthorized: false } } : {})
};
const redisConnection = new Redis(redisUrl, redisOptions);

const QUEUE_NAME = 'manga-tasks';
const mangaQueue = new Queue(QUEUE_NAME, { connection: redisConnection });

module.exports = {
  redisConnection,
  QUEUE_NAME,
  mangaQueue,
};
