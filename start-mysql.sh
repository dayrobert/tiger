#!/bin/bash

# Load environment variables from .env file
if [ ! -f .env ]; then
  echo "Error: .env file not found. Please create one first."
  exit 1
fi

export $(cat .env | grep -v '^#' | xargs)

echo "Starting MySQL 9 container..."
docker-compose up -d mysql9

if [ $? -ne 0 ]; then
  echo "Error: Failed to start MySQL container."
  exit 1
fi

echo "Waiting for MySQL to be ready..."

# Wait for health check (up to 30 seconds)
for i in {1..30}; do
  if docker exec mysql9 mysqladmin ping -h localhost -uroot -prootpassword --silent 2>/dev/null; then
    echo "✓ MySQL 9 container is running!"
    echo ""
    echo "Container name: mysql9"
    echo "Port: ${DB_PORT:-3306}"
    echo "Database: $DB_NAME"
    echo "User: $DB_USER"
    echo "Root password: rootpassword"
    echo ""
    echo "You can now run ./setup.sh to create the database schema."
    exit 0
  fi
  echo "Waiting for MySQL to start... ($i/30)"
  sleep 2
done

echo "Error: MySQL failed to start within 60 seconds."
echo "Check logs with: docker logs mysql9"
exit 1
