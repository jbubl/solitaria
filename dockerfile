FROM node:lts-alpine
RUN apk add --no-cache python3 make g++
USER node
WORKDIR /home/node/app
COPY --chown=node package*.json ./
RUN npm install
COPY --chown=node . .
EXPOSE 7860
CMD ["node", "index.js"]
