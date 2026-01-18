import { contextBridge, ipcRenderer } from 'electron'
import log from 'electron-log/renderer'

// Configure renderer logger
log.transports.console.level = process.env.NODE_ENV === 'development' ? 'debug' : 'info'

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  ebay: {
    connect: () => ipcRenderer.invoke('ebay:connect'),
    checkConnection: () => ipcRenderer.invoke('ebay:check-connection')
  },
  item: {
    create: (data: any) => ipcRenderer.invoke('item:create', data),
    list: () => ipcRenderer.invoke('item:list'),
    get: (itemId: number) => ipcRenderer.invoke('item:get', itemId),
    update: (itemId: number, data: any) => ipcRenderer.invoke('item:update', itemId, data)
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (settings: any) => ipcRenderer.invoke('settings:update', settings)
  },
  log: {
    error: (...args: any[]) => log.error(...args),
    warn: (...args: any[]) => log.warn(...args),
    info: (...args: any[]) => log.info(...args),
    debug: (...args: any[]) => log.debug(...args)
  },
  onShowAddItemDialog: (callback: () => void) => {
    ipcRenderer.on('show-add-item-dialog', callback)
  },
  onConnectToEbay: (callback: () => void) => {
    ipcRenderer.on('connect-to-ebay', callback)
  },
  onShowPreferences: (callback: () => void) => {
    ipcRenderer.on('show-preferences', callback)
  }
})
