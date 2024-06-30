# docker build -t pepmartinez/keuss-server:3.0.0 .
# docker push pepmartinez/keuss-server:3.0.0

FROM node:20-slim

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --only=production

COPY . .

EXPOSE 3444 5672 61613
CMD [ "node", "index.js" ]
