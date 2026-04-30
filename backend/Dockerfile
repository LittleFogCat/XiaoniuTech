FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY src ./src
COPY files ./files

EXPOSE 3001

CMD ["node", "src/index.js"]
