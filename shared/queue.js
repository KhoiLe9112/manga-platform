const { Queue } = require('bullmq');
const Redis = require('ioredis');

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const QUEUE_NAME = 'manga-tasks';
const mangaQueue = new Queue(QUEUE_NAME, { connection: redisConnection });

module.exports = {
  redisConnection,
  QUEUE_NAME,
  mangaQueue,
};
