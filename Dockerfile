# Этап сборки
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Этап production — nginx
FROM nginx:1.31.2
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
COPY certs /certs
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]