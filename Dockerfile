FROM node:8.1.0
MAINTAINER Ricardo Silverio
COPY . /var/www
WORKDIR /var/www
RUN npm install
ENTRYPOINT node src/index.js
EXPOSE 4000