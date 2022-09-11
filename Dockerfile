FROM node:18-alpine3.16

# grab tini for signal processing and zombie killing
RUN apk add --no-cache bash tini

EXPOSE 8081

# "localhost" doesn't mean much in a container, so we adjust our default to the common service name "mongo" instead
# (and make sure the server listens outside the container, since "localhost" inside the container is usually difficult to access)
ENV ME_CONFIG_MONGODB_URL="mongodb://mongo:27017" \
    ME_CONFIG_MONGODB_ENABLE_ADMIN="true" \
    VCAP_APP_HOST="0.0.0.0"

WORKDIR /opt/mongo-express
COPY . .
RUN yarn install
# RUN yarn run build	# prepublish already run build

CMD ["/sbin/tini", "--", "yarn", "run", "start"]
