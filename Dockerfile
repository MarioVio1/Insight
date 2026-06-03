FROM node:20-slim
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
RUN npm install ws
COPY . .
EXPOSE 7860
CMD ["node", "src/server.js"]
