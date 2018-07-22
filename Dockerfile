FROM node:carbon-alpine

WORKDIR /opt
RUN npm install --only=production keuss-server@1.1.2
WORKDIR /opt/node_modules/keuss-server

EXPOSE 3444 61613
CMD [ "node", "index.js" ]
