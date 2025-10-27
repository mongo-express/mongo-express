# Use official Node image
FROM node:20

# Set working directory
WORKDIR /usr/src/app

# Copy all files first so webpack finds everything
COPY . .

# Set environment
ENV NODE_ENV=development

# Install dependencies
RUN npm install

# Expose port for app
EXPOSE 8081

# Start the app
CMD ["npm", "start"]
