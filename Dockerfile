# docker build -t pepmartinez/keuss-server:2.1.0 .
# docker push pepmartinez/keuss-server:2.1.0

FROM node:14.18.2-alpine

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --only=production

COPY . .

EXPOSE 3444 5672 61613
CMD [ "node", "index.js" ]
