#!/bin/bash

# Load environment variables from .env file if it exists
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Check if required environment variables are set
if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
  echo "Error: Missing required environment variables."
  echo "Please set DB_HOST, DB_USER, and DB_PASSWORD"
  exit 1
fi

# Set default port if not specified
DB_PORT=${DB_PORT:-3306}

echo "Fixing MySQL user authentication method..."
echo "You'll need to connect as root or an admin user."
echo ""
read -p "Enter MySQL admin username (default: root): " ADMIN_USER
ADMIN_USER=${ADMIN_USER:-root}

read -sp "Enter MySQL admin password (press Enter if no password): " ADMIN_PASSWORD
echo ""

# Fix the user's authentication method
if [ -z "$ADMIN_PASSWORD" ]; then
  # No password - connect without -p flag
  mysql -h "$DB_HOST" -P "$DB_PORT" -u "$ADMIN_USER" << EOF
ALTER USER '$DB_USER'@'%' IDENTIFIED WITH caching_sha2_password BY '$DB_PASSWORD';
FLUSH PRIVILEGES;
EOF
else
  # With password
  mysql -h "$DB_HOST" -P "$DB_PORT" -u "$ADMIN_USER" -p"$ADMIN_PASSWORD" << EOF
ALTER USER '$DB_USER'@'%' IDENTIFIED WITH caching_sha2_password BY '$DB_PASSWORD';
FLUSH PRIVILEGES;
EOF
fi

if [ $? -eq 0 ]; then
  echo "✓ User authentication method updated successfully!"
  echo "You can now run ./setup.sh"
else
  echo "Error: Failed to update user authentication method."
  exit 1
fi
