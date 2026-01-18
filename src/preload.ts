import { contextBridge, ipcRenderer } from 'electron'

try {
  console.log('Preload script starting...')

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
      error: (...args: any[]) => console.error(...args),
      warn: (...args: any[]) => console.warn(...args),
      info: (...args: any[]) => console.info(...args),
      debug: (...args: any[]) => console.log(...args)
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
  
  console.log('Preload script completed successfully')
} catch (error) {
  console.error('Preload script failed:', error)
}
