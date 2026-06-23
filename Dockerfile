FROM node:22-slim

WORKDIR /app

COPY scraper-service/package.json scraper-service/package.json
COPY package.json package-lock.json ./
COPY scraper-service/tsconfig.json scraper-service/tsconfig.json

RUN npm install --production
RUN cd scraper-service && npm install

COPY . .

EXPOSE 3100

CMD ["npx", "tsx", "scraper-service/server.ts"]
