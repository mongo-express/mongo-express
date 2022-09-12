FROM node:18-alpine3.16

# "localhost" doesn't mean much in a container, so we adjust our default to the common service name "mongo" instead
# (and make sure the server listens outside the container, since "localhost" inside the container is usually difficult to access)
ENV ME_CONFIG_MONGODB_URL="mongodb://mongo:27017" \
    ME_CONFIG_MONGODB_ENABLE_ADMIN="true" \
    VCAP_APP_HOST="0.0.0.0"

WORKDIR /opt/mongo-express
COPY . .

RUN apk -U add --no-cache \
        bash \
        # grab tini for signal processing and zombie killing
        tini \
    && yarn install
    # && yarn run build     # prepublish already run build

EXPOSE 8081
CMD ["/sbin/tini", "--", "yarn", "start"]
