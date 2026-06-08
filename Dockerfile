FROM node:20-slim
RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends \
  fontconfig fonts-dejavu-core fonts-noto-core fonts-noto-cjk fonts-noto-color-emoji \
  && rm -rf /var/lib/apt/lists/* && fc-cache -f
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]