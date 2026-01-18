export interface ElectronAPI {
  invoke: (channel: string, ...args: any[]) => Promise<any>
  ebay: {
    connect: () => Promise<{ success: boolean; token?: string; error?: string }>
    checkConnection: () => Promise<{ connected: boolean }>
  }
  item: {
    create: (data: any) => Promise<{ success: boolean; itemId?: number; error?: string }>
    list: () => Promise<{ success: boolean; items?: any[]; error?: string }>
    get: (itemId: number) => Promise<{ success: boolean; item?: any; error?: string }>
    update: (itemId: number, data: any) => Promise<{ success: boolean; error?: string }>
  }
  settings: {
    get: () => Promise<{ success: boolean; settings?: any; error?: string }>
    update: (settings: any) => Promise<{ success: boolean; error?: string }>
  }
  log: {
    error: (...args: any[]) => void
    warn: (...args: any[]) => void
    info: (...args: any[]) => void
    debug: (...args: any[]) => void
  }
  onShowAddItemDialog: (callback: () => void) => void
  onConnectToEbay: (callback: () => void) => void
  onShowPreferences: (callback: () => void) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
