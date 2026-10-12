FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --include=dev
COPY . .
RUN npm run build
ENV NODE_ENV=production PORT=3000 TZ=Europe/Madrid
EXPOSE 3000
CMD ["node", "server.js"]
