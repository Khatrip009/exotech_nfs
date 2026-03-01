FROM node:20-alpine
WORKDIR /app
COPY backend/package.json ./backend/package.json
RUN npm --prefix backend install --production
COPY backend ./backend
COPY public ./public
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "backend/server.js"]
