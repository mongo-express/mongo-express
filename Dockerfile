# Dockerfile
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm ci --production

# Bundle app source
COPY . .

# Build/prepare (if you have build steps, e.g. front-end or transpile)
# RUN npm run build   # uncomment if applicable

ENV PORT=8081
EXPOSE 8081

# start command (ensure it matches package.json "start")
CMD ["npm", "start"]
