import { pool } from './db'
import { logger } from './logger'

export interface CreateItemData {
  title: string
  description?: string
  purchasePrice?: number
  purchaseDate?: string
  condition?: 'new' | 'good' | 'fair' | 'bad'
  shippingCost?: number
  notes?: string
  ebayItemId?: string
}

export async function createItem(title: string, ebayItemId?: string) {
  const [result] = await pool.query('INSERT INTO items (title, ebay_item_id) VALUES (?, ?)', [title, ebayItemId || null])
  // @ts-ignore
  return result.insertId
}

export async function createItemFull(data: CreateItemData) {
  logger.db.debug('Creating item:', data.title)
  const [result] = await pool.query(
    'INSERT INTO items (title, description, purchase_price, purchase_date, `condition`, shipping_cost, notes, ebay_item_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      data.title,
      data.description || null,
      data.purchasePrice || null,
      data.purchaseDate || null,
      data.condition || null,
      data.shippingCost || null,
      data.notes || null,
      data.ebayItemId || null
    ]
  )
  // @ts-ignore
  const insertId = result.insertId
  logger.db.info('Item created with ID:', insertId)
  return insertId
}

export async function addPurchase(itemId: number, purchasePrice: number, shipping: number, purchaseDate: string, notes?: string) {
  const [result] = await pool.query(
    'INSERT INTO purchases (item_id, purchase_price, shipping, purchase_date, notes) VALUES (?, ?, ?, ?, ?)',
    [itemId, purchasePrice, shipping, purchaseDate, notes || null]
  )
  // @ts-ignore
  return result.insertId
}

export async function listItems() {
  logger.db.debug('Fetching all items...')
  const [rows] = await pool.query('SELECT * FROM items')
  // @ts-ignore
  logger.db.debug(`Retrieved ${rows.length} items`)
  return rows
}

export async function getItemById(itemId: number) {
  logger.db.debug('Fetching item by ID:', itemId)
  const [rows] = await pool.query('SELECT * FROM items WHERE id = ?', [itemId])
  // @ts-ignore
  return rows[0]
}

export async function updateItem(itemId: number, data: CreateItemData) {
  logger.db.debug('Updating item:', itemId)
  const [result] = await pool.query(
    'UPDATE items SET title = ?, description = ?, purchase_price = ?, purchase_date = ?, `condition` = ?, shipping_cost = ?, notes = ?, ebay_item_id = ? WHERE id = ?',
    [
      data.title,
      data.description || null,
      data.purchasePrice || null,
      data.purchaseDate || null,
      data.condition || null,
      data.shippingCost || null,
      data.notes || null,
      data.ebayItemId || null,
      itemId
    ]
  )
  logger.db.info('Item updated:', itemId)
  return result
}

export async function getPurchasesForItem(itemId: number) {
  const [rows] = await pool.query('SELECT * FROM purchases WHERE item_id = ? ORDER BY purchase_date DESC', [itemId])
  return rows
}
