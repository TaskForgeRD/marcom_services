#!/bin/bash

# Stop and remove existing containers if any
podman stop mysql app
podman rm mysql app

# Create volumes if they don't exist
echo "Creating volumes..."
podman volume create marcom_data || echo "Volume 'marcom_data' already exists"

# Run MySQL container
echo "Starting MySQL container..."
podman run -d \
    --name mysql \
    --env-file .env \
    -v $(pwd)/init.sql:/docker-entrypoint-initdb.d/init.sql \
    -v marcom_data:/var/lib/mysql \
    -p 3306:3306 \
    --restart always \
    --network bridge \
    mysql:8.3

# Wait for MySQL to be ready
echo "Waiting for MySQL to be ready..."
until podman exec mysql mysqladmin --user=root --password="$MYSQL_ROOT_PASSWORD" --host=localhost --silent status; do
    echo "Waiting for MySQL to initialize..."
    sleep 5
done

# Build the Bun app image
echo "Building Bun app image..."
podman build -t marcom_services .

# Run Bun app container
echo "Starting Bun app container..."
podman run -d \
    --name app \
    -p 5000:5000 \
    --restart always \
    --env-file .env \
    -v $(pwd)/src:/app \
    --network bridge \
    marcom_services

echo "Containers are up and running!"

