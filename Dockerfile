FROM node:14-alpine
LABEL name "27v Helper Discord BOT"
LABEL version "0.0.1"

WORKDIR /usr/vh

COPY tsconfig.json package.json package-lock.json ./
RUN npm i

COPY src/ src/
RUN npm run build

CMD [ "node", "dist/index.js" ]
