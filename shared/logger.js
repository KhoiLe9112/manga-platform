const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: () => new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })
    }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
  ],
});

module.exports = logger;
