# Use an official Node.js runtime as a parent image
FROM node:20-slim

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies securely
RUN npm ci --only=production --ignore-scripts

# Copy the rest of the application code
COPY . .

# Set the entrypoint for the action
ENTRYPOINT ["node", "/app/dist/index.js"]