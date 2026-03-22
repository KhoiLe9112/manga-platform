FROM node:20-alpine
WORKDIR /app
COPY ./scheduler/package.json ./package.json
RUN npm install
COPY ./shared ./shared
COPY ./crawler ./crawler
COPY ./parser ./parser
COPY ./scheduler ./scheduler
CMD ["node", "scheduler/index.js"]
