# Use an appropriate Node.js version base image Zby+FC4Kw(SVgJB<a=e{um
FROM node:18-bullseye-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
COPY .env ./

# Build the application
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
