#!/bin/bash

# Load environment variables from .env file if it exists
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Check if required environment variables are set
if [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
  echo "Error: Missing required environment variables."
  echo "Please set DB_USER and DB_PASSWORD"
  exit 1
fi

echo "Available MySQL containers:"
docker ps --format "{{.Names}}\t{{.Image}}" | grep -i mysql
echo ""
read -p "Enter the container name to use (default: mysql8): " CONTAINER_NAME
CONTAINER_NAME=${CONTAINER_NAME:-mysql8}

echo "Fixing user authentication in container '$CONTAINER_NAME'..."

# Execute the ALTER USER command directly in the container
docker exec -i "$CONTAINER_NAME" mysql -uroot << EOF
ALTER USER '$DB_USER'@'%' IDENTIFIED WITH caching_sha2_password BY '$DB_PASSWORD';
FLUSH PRIVILEGES;
EOF

if [ $? -eq 0 ]; then
  echo "✓ User authentication method updated successfully!"
  echo "You can now run ./setup.sh"
else
  echo "Error: Failed to update user authentication method."
  exit 1
fi
