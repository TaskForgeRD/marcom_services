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
    --network host \
    mysql:8.3

# Build the Bun app image
echo "Building Bun app image..."
podman build -t marcom_services .

# Run Bun app container
echo "Starting Bun app container..."
podman run -d \
    --name app \
    -p 3000:3000 \
    --restart always \
    --env-file .env \
    -v $(pwd)/src:/app \
    --network host \
    marcom_services

echo "Containers are up and running!"
