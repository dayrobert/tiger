# Logging in Tiger

This application uses [electron-log](https://github.com/megahertz/electron-log) for comprehensive logging across both the main and renderer processes.

## Configuration

The logging system is configured in `src/logger.ts` with the following features:

- **Log Levels**: 
  - Development: `debug` (shows all logs)
  - Production: `info` (only important information and errors)
  
- **File Rotation**: Log files are automatically rotated when they exceed 5MB
- **Log Location**: Logs are stored in `app.getPath('userData')/logs/`
  - macOS: `~/Library/Logs/Tiger/`
  - Windows: `%USERPROFILE%\AppData\Roaming\Tiger\logs\`
  - Linux: `~/.config/Tiger/logs/`

## Usage

### Main Process (Node.js)

Import the logger in your main process files:

```typescript
import { logger } from './logger'

// General logging
logger.info('Application started')
logger.warn('This is a warning')
logger.error('An error occurred', error)
logger.debug('Debug information')

// Database operations
logger.db.info('Database connected')
logger.db.error('Query failed', error)
logger.db.debug('Executing query:', sql)

// API calls
logger.api.info('Calling eBay API')
logger.api.error('API request failed', error)
logger.api.debug('API response:', data)

// UI events
logger.ui.info('Window created')
logger.ui.error('Dialog error', error)
logger.ui.debug('Menu item clicked')
```

### Renderer Process (Browser)

The logger is exposed to the renderer process via the preload script:

```typescript
// In renderer.ts or other renderer files
window.electronAPI.log.info('User clicked button')
window.electronAPI.log.warn('Form validation warning')
window.electronAPI.log.error('Failed to load data', error)
window.electronAPI.log.debug('State updated:', state)
```

## Log Format

Logs are formatted as:

```
[YYYY-MM-DD HH:MM:SS.mmm] [LEVEL] message
```

Example:
```
[2024-01-15 14:30:45.123] [info] Application started
[2024-01-15 14:30:45.456] [debug] [DB] Database connected to 127.0.0.1:3306
[2024-01-15 14:30:46.789] [error] [API] eBay authentication failed: Invalid credentials
```

## Log Levels

- **error**: Critical errors that need immediate attention
- **warn**: Warning messages for potentially problematic situations
- **info**: General informational messages about application flow
- **debug**: Detailed debugging information (only in development mode)

## Best Practices

1. **Use appropriate log levels**:
   - Use `error` for exceptions and critical failures
   - Use `warn` for recoverable issues or deprecated features
   - Use `info` for significant application events (startup, shutdown, user actions)
   - Use `debug` for detailed diagnostic information

2. **Use specialized loggers**:
   - Use `logger.db.*` for database operations
   - Use `logger.api.*` for external API calls
   - Use `logger.ui.*` for user interface events

3. **Include context**:
   ```typescript
   // Good
   logger.error('Failed to create item:', itemTitle, error)
   
   // Not as helpful
   logger.error('Error occurred')
   ```

4. **Don't log sensitive information**:
   - Never log passwords, tokens, or API keys
   - Be careful with user personal information

5. **Performance considerations**:
   - Debug logs are disabled in production
   - File rotation prevents disk space issues
   - Console logs are also written to file for permanent record

## Viewing Logs

### During Development

Logs appear in:
1. VS Code's Debug Console
2. Terminal output (if running with `npm run start:dev`)
3. Electron DevTools Console (renderer process logs)
4. Log files in userData directory

### In Production

Users can find log files at:
- **macOS**: Open Finder → Go → Go to Folder → `~/Library/Logs/Tiger/`
- **Windows**: Open File Explorer → Navigate to `%APPDATA%\Tiger\logs\`
- **Linux**: Navigate to `~/.config/Tiger/logs/`

## Troubleshooting

If logs are not appearing:

1. Check the log level is appropriate for your environment
2. Verify `NODE_ENV` is set correctly (`development` or `production`)
3. Check file permissions on the logs directory
4. View the log file location at startup (logged as first message)

## Examples

### Logging a Database Query

```typescript
import { logger } from './logger'

export async function createItem(data: ItemData) {
  logger.db.debug('Creating item:', data.title)
  
  try {
    const result = await pool.query(sql, params)
    logger.db.info('Item created with ID:', result.insertId)
    return result.insertId
  } catch (error) {
    logger.db.error('Failed to create item:', error)
    throw error
  }
}
```

### Logging User Actions

```typescript
// In renderer process
async function handleLogin() {
  window.electronAPI.log.info('User attempting login')
  
  try {
    const result = await window.electronAPI.auth.login(username, password)
    window.electronAPI.log.info('Login successful')
  } catch (error) {
    window.electronAPI.log.error('Login failed:', error)
    alert('Login failed')
  }
}
```

### Logging API Calls

```typescript
import { logger } from './logger'

export async function fetchEbayItems() {
  logger.api.info('Fetching items from eBay API')
  logger.api.debug('API endpoint:', endpoint)
  
  try {
    const response = await fetch(endpoint, options)
    logger.api.debug('API response status:', response.status)
    
    const data = await response.json()
    logger.api.info('Successfully fetched', data.items.length, 'items')
    return data
  } catch (error) {
    logger.api.error('eBay API request failed:', error)
    throw error
  }
}
```
