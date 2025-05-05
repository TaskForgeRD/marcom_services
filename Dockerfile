FROM oven/bun:1.0.25-slim

WORKDIR /app

COPY package.json .
COPY bun.lock .

RUN bun install

COPY . .

RUN mkdir -p /app/uploads

EXPOSE 5000

CMD ["bun", "start"]