FROM node:18

# Install watchman (optional but helpful for React Native fast refresh)
RUN apt-get update && apt-get install -y watchman

WORKDIR /app

# Copy only package files first (faster caching)
COPY package*.json ./
RUN npm install

# Copy all project files
COPY . .

EXPOSE 19000 19001 19002 8081

# Use "npx expo start -c" as the start command
CMD ["npx", "expo", "start", "-c"]
