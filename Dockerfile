# docker build -t pepmartinez/keuss-server:1.6.0 .
# docker push pepmartinez/keuss-server:1.6.0

FROM node:12.15.0-alpine

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --only=production

COPY . .

EXPOSE 3444 61613
CMD [ "node", "index.js" ]
