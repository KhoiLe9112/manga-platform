FROM node:20-alpine
WORKDIR /app
COPY ./api/package.json ./package.json
RUN npm install
COPY ./shared ./shared
COPY ./api ./api
CMD ["node", "api/index.js"]
