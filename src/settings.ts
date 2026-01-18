import Store from 'electron-store'

export interface AppSettings {
  database: {
    host: string
    port: number
    user: string
    password: string
    database: string
  }
  ebay: {
    clientId: string
    clientSecret: string
    token: string
  }
}

const defaults: AppSettings = {
  database: {
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'tiger'
  },
  ebay: {
    clientId: '',
    clientSecret: '',
    token: ''
  }
}

const store = new Store<AppSettings>({
  defaults,
  name: 'tiger-settings'
})

export function getSettings(): AppSettings {
  return {
    database: store.get('database'),
    ebay: store.get('ebay')
  }
}

export function updateSettings(settings: Partial<AppSettings>): void {
  if (settings.database) {
    const currentDb = store.get('database')
    store.set('database', { ...currentDb, ...settings.database })
  }
  if (settings.ebay) {
    const currentEbay = store.get('ebay')
    store.set('ebay', { ...currentEbay, ...settings.ebay })
  }
}

export function getDatabaseSettings() {
  return store.get('database')
}

export function getEbaySettings() {
  return store.get('ebay')
}

export { store }
