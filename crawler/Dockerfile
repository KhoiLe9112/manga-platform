FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY ./crawler/package.json ./package.json
RUN npm install
COPY ./shared ./shared
COPY ./parser ./parser
COPY ./crawler ./crawler
COPY bot.js bot.js
CMD ["node", "crawler/worker.js"]
