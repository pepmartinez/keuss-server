# docker build -t pepmartinez/keuss-server:1.6.6 .
# docker push pepmartinez/keuss-server:1.6.6

FROM node:14.18.2-alpine

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --only=production

COPY . .

EXPOSE 3444 61613
CMD [ "node", "index.js" ]
