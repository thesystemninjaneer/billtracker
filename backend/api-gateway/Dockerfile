# backend/api-gateway/Dockerfile
FROM node:18-alpine
WORKDIR /usr/src/app
COPY package*.json ./
COPY version.txt ./

RUN npm install
COPY . .
EXPOSE 5000
CMD [ "npm", "start" ]