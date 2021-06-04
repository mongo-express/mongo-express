FROM node:12-buster-slim

# grab tini for signal processing and zombie killing
RUN set -eux; \
	apt-get update; \
	apt-get install -y --no-install-recommends tini; \
	rm -rf /var/lib/apt/lists/*

EXPOSE 8081

# "localhost" doesn't mean much in a container, so we adjust our default to the common service name "mongo" instead
# (and make sure the server listens outside the container, since "localhost" inside the container is usually difficult to access)
ENV ME_CONFIG_MONGODB_URL="mongodb://mongo:27017" \
    VCAP_APP_HOST="0.0.0.0"

WORKDIR /opt/mongo-express
COPY . .
RUN yarn install
RUN yarn run build

CMD ["tini", "--", "yarn", "run", "start"]
