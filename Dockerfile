FROM node:20-slim
RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends \
  fontconfig fonts-dejavu-core \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]