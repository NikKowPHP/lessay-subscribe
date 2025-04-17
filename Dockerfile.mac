# Dockerfile.mac
FROM node:20.11-alpine3.19

# 1) Install psql (PostgreSQL client)
RUN apk add --no-cache postgresql-client

# 2) Set workdir and install app deps
WORKDIR /app
COPY package*.json ./
RUN npm install

# 3) Copy the rest of your code and generate Prisma client
COPY . .
RUN npx prisma generate

EXPOSE 3000
CMD ["npm", "run", "dev"]