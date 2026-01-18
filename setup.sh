#!/bin/bash

# Parse command line arguments
HARD_RESET=false
for arg in "$@"; do
  if [ "$arg" = "-h" ] || [ "$arg" = "--hard" ]; then
    HARD_RESET=true
  fi
done

# Load environment variables from .env file if it exists
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Check if required environment variables are set
if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_NAME" ]; then
  echo "Error: Missing required environment variables."
  echo "Please set DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME"
  echo "Either create a .env file or export them manually."
  exit 1
fi

# Set default port if not specified
DB_PORT=${DB_PORT:-3306}

# Prompt for root credentials to create database and user
echo "This script will create the database and user."
echo "Please provide MySQL root credentials:"
read -p "Root username (default: root): " ROOT_USER
ROOT_USER=${ROOT_USER:-root}
read -sp "Root password (press Enter if none): " ROOT_PASSWORD
echo ""

if [ "$HARD_RESET" = true ]; then
  echo "⚠️  Hard reset mode: Dropping database '$DB_NAME' if it exists..."
  
  if [ -z "$ROOT_PASSWORD" ]; then
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$ROOT_USER" -e "DROP DATABASE IF EXISTS $DB_NAME; DROP USER IF EXISTS '$DB_USER'@'%';"
  else
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$ROOT_USER" -p"$ROOT_PASSWORD" -e "DROP DATABASE IF EXISTS $DB_NAME; DROP USER IF EXISTS '$DB_USER'@'%';"
  fi
  
  if [ $? -ne 0 ]; then
    echo "Error: Failed to drop database/user."
    exit 1
  fi
  echo "Database and user dropped."
fi

echo "Creating database '$DB_NAME' and user '$DB_USER'..."

# Create database, user, and grant permissions
if [ -z "$ROOT_PASSWORD" ]; then
  mysql -h "$DB_HOST" -P "$DB_PORT" -u "$ROOT_USER" << EOF
CREATE DATABASE IF NOT EXISTS $DB_NAME;
CREATE USER IF NOT EXISTS '$DB_USER'@'%' IDENTIFIED WITH caching_sha2_password BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'%';
FLUSH PRIVILEGES;
EOF
else
  mysql -h "$DB_HOST" -P "$DB_PORT" -u "$ROOT_USER" -p"$ROOT_PASSWORD" << EOF
CREATE DATABASE IF NOT EXISTS $DB_NAME;
CREATE USER IF NOT EXISTS '$DB_USER'@'%' IDENTIFIED WITH caching_sha2_password BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'%';
FLUSH PRIVILEGES;
EOF
fi

if [ $? -ne 0 ]; then
  echo "Error: Failed to create database and user."
  exit 1
fi

echo "Database '$DB_NAME' and user '$DB_USER' ready."
echo "Running schema script..."

# Run the schema SQL file using the newly created user
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < src/db/schema.sql

if [ $? -ne 0 ]; then
  echo "Error: Failed to run schema script."
  exit 1
fi

echo "✓ Database setup complete!"
echo "Tables created successfully in database '$DB_NAME'."
