import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import path from 'path'
import { initDb, createPool } from './db'
import { EbayAuthManager } from './ebay/auth'
import { createItemFull, CreateItemData } from './models'
import { getSettings, updateSettings, AppSettings } from './settings'
import { logger } from './logger'
import dotenv from 'dotenv'

dotenv.config({ path: process.env.NODE_ENV === 'development' ? '.env.dev' : '.env' })

// Initialize settings from .env if they don't exist
const currentSettings = getSettings()
if (process.env.DB_HOST && !currentSettings.database.host) {
  updateSettings({
    database: {
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'tiger'
    },
    ebay: {
      clientId: process.env.EBAY_CLIENT_ID || '',
      clientSecret: process.env.EBAY_CLIENT_SECRET || '',
      token: process.env.EBAY_TOKEN || ''
    }
  })
}

let mainWindow: BrowserWindow | null = null
let ebayAuthManager: EbayAuthManager | null = null

async function createWindow() {
  logger.info('Creating main window...')
  
  try {
    await initDb()
    logger.info('Database initialized successfully')
  } catch (error) {
    logger.error('Database initialization failed:', error)
    // Continue anyway - show the window even if DB fails
  }
  
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'))
  
  // Create application menu
  const template: any[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Add New Item',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow?.webContents.send('show-add-item-dialog')
          }
        },
        { type: 'separator' },
        {
          label: 'Connect to eBay',
          click: () => {
            mainWindow?.webContents.send('connect-to-ebay')
          }
        },
        { type: 'separator' },
        {
          label: 'Preferences...',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            mainWindow?.webContents.send('show-preferences')
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => {
            mainWindow?.webContents.toggleDevTools()
          }
        }
      ]
    }
  ]
  
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
  
  logger.info('Application window created and ready')
}

app.whenReady().then(() => {
  logger.info('App is ready, creating window...')
  createWindow()
})

app.on('window-all-closed', () => {
  logger.info('All windows closed')
  if (process.platform !== 'darwin') {
    logger.info('Quitting application...')
    app.quit()
  }
})

app.on('activate', () => {
  logger.debug('App activated')
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// IPC Handlers for eBay authentication
ipcMain.handle('ebay:connect', async () => {
  logger.info('eBay connect requested')
  
  if (!mainWindow) {
    logger.error('Main window not available for eBay connection')
    throw new Error('Main window not available')
  }

  const ebaySettings = getSettings().ebay

  if (!ebaySettings.clientId || !ebaySettings.clientSecret) {
    logger.error('eBay credentials not configured')
    throw new Error('eBay credentials not configured. Please set them in Preferences.')
  }

  ebayAuthManager = new EbayAuthManager(ebaySettings.clientId, ebaySettings.clientSecret)
  
  try {
    logger.debug('Starting eBay authentication...')
    const token = await ebayAuthManager.authenticate(mainWindow)
    logger.info('eBay authentication successful')
    return { success: true, token }
  } catch (error: any) {
    logger.error('eBay authentication failed:', error.message)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('ebay:check-connection', async () => {
  const ebaySettings = getSettings().ebay
  const connected = !!ebaySettings.token && ebaySettings.token !== ''
  logger.debug('eBay connection status checked:', connected)
  return { connected }
})

// IPC Handler for creating items
ipcMain.handle('item:create', async (event, data: CreateItemData) => {
  logger.info('Creating new item:', data.title)
  try {
    const itemId = await createItemFull(data)
    logger.info('Item created successfully with ID:', itemId)
    return { success: true, itemId }
  } catch (error: any) {
    logger.error('Failed to create item:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('item:list', async () => {
  logger.debug('Listing items...')
  try {
    const { listItems } = await import('./models')
    const items = await listItems()
    logger.debug(`Retrieved ${items.length} items`)
    return { success: true, items }
  } catch (error: any) {
    logger.error('Failed to list items:', error)
    return { success: false, error: error.message, items: [] }
  }
})

ipcMain.handle('item:get', async (event, itemId: number) => {
  logger.debug('Getting item with ID:', itemId)
  try {
    const { getItemById } = await import('./models')
    const item = await getItemById(itemId)
    logger.debug('Item retrieved successfully')
    return { success: true, item }
  } catch (error: any) {
    logger.error('Failed to get item:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('item:update', async (event, itemId: number, data: CreateItemData) => {
  logger.info('Updating item:', itemId)
  try {
    const { updateItem } = await import('./models')
    await updateItem(itemId, data)
    logger.info('Item updated successfully')
    return { success: true }
  } catch (error: any) {
    logger.error('Failed to update item:', error)
    return { success: false, error: error.message }
  }
})

// Settings handlers
ipcMain.handle('settings:get', async () => {
  logger.debug('Getting settings...')
  try {
    const settings = getSettings()
    return { success: true, settings }
  } catch (error: any) {
    logger.error('Failed to get settings:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('settings:update', async (event, newSettings: Partial<AppSettings>) => {
  logger.info('Updating settings...')
  try {
    updateSettings(newSettings)
    // Recreate database pool with new settings
    createPool()
    logger.info('Settings updated and database pool recreated')
    return { success: true }
  } catch (error: any) {
    logger.error('Failed to update settings:', error)
    return { success: false, error: error.message }
  }
})
