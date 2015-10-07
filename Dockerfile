FROM node:latest

WORKDIR /app
ADD . /app

RUN npm install
RUN cp config.default.js config.js

EXPOSE 8081

CMD ["npm", "start"]

