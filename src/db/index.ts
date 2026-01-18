import mysql from 'mysql2/promise'
import fs from 'fs'
import path from 'path'
import { getDatabaseSettings } from '../settings'
import { logger } from '../logger'

let pool: any = null

export function createPool() {
  const dbSettings = getDatabaseSettings()
  
  logger.db.info('Creating database connection pool...', {
    host: dbSettings.host,
    port: dbSettings.port,
    database: dbSettings.database,
    user: dbSettings.user
  })
  
  pool = mysql.createPool({
    host: dbSettings.host,
    port: dbSettings.port,
    user: dbSettings.user,
    password: dbSettings.password,
    database: dbSettings.database,
    waitForConnections: true,
    connectionLimit: 10,
  })
  
  logger.db.info('Database pool created successfully')
  return pool
}

// Initialize pool on first import
if (!pool) {
  pool = createPool()
}

export async function initDb() {
  logger.db.info('Initializing database...')
  
  // Run simple migration if needed
  const schemaPath = path.join(__dirname, 'schema.sql')
  logger.db.debug('Loading schema from:', schemaPath)
  
  if (!fs.existsSync(schemaPath)) {
    logger.db.error('Schema file not found at:', schemaPath)
    throw new Error(`Schema file not found: ${schemaPath}`)
  }
  
  const sql = fs.readFileSync(schemaPath, 'utf8')
  const conn = await pool.getConnection()
  try {
    // Split by semicolon and execute each statement separately
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0)
    logger.db.info(`Executing ${statements.length} schema statements...`)
    
    for (const statement of statements) {
      try {
        await conn.query(statement)
      } catch (error: any) {
        // Ignore "table already exists" errors
        if (!error.message.includes('already exists')) {
          logger.db.error('Schema statement failed:', statement.substring(0, 100))
          throw error
        } else {
          logger.db.debug('Table already exists (skipped)')
        }
      }
    }
    logger.db.info('Database schema initialized successfully')
  } catch (err) {
    logger.db.error('Error during DB initialization:', err)
    throw err
  } finally {
    conn.release()
  }
}

export { pool }
