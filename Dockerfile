FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port if needed for API or web interface
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Set the command to run the application
CMD ["npm", "run", "start"]