FROM node:20-alpine

WORKDIR /app

# Install dependencies first for layer caching
COPY package.json ./
RUN npm install

# Copy application and plugins
COPY . .

EXPOSE 5001

CMD ["npm", "start"]
