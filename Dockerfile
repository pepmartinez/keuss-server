# run as 
# docker build -t pepmartinez/keuss-server:1.2.1 .
# docker push pepmartinez/keuss-server:1.2.1

FROM node:carbon

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --only=production

COPY . .

EXPOSE 3444 61613
CMD [ "node", "index.js" ]
