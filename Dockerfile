FROM google/nodejs

WORKDIR /app
ADD . /app

RUN npm install
RUN cp config.default.js config.js

EXPOSE 8081

CMD ["/nodejs/bin/npm", "start"]

