FROM node:16.17.1-alpine3.15 AS builder

WORKDIR /app
COPY . .
RUN yarn install && yarn build

FROM nginx:alpine
WORKDIR /usr/share/nginx/html
RUN rm -rf ./*
COPY --from=builder /app/build .
RUN apk update && apk add openssl
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/nginx-selfsigned.key \
    -out /etc/ssl/certs/nginx-selfsigned.crt \
    -subj "/C=TW/ST=Taipei/L=Taipei/O=if/OU=if/CN=if.com"
COPY nginx/nginx.conf /etc/nginx/nginx.conf
ENTRYPOINT ["nginx", "-g", "daemon off;"]
