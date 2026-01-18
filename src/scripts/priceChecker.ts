import { pool } from '../db'
import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

// Placeholder for fetching current price for an item.
// Prefer using eBay Browse API. Provide `EBAY_APP_ID` / OAuth creds in env.
async function fetchCurrentPrice(ebayItemId?: string, title?: string): Promise<number | null> {
  // If ebayItemId is provided, call the eBay API. This is a placeholder.
  if (!ebayItemId) return null
  // Example: use eBay Browse API - replace with real credentials and endpoint
  const token = process.env.EBAY_TOKEN
  if (!token) return null
  try {
    const res = await axios.get(`https://api.ebay.com/buy/browse/v1/item/${encodeURIComponent(ebayItemId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const price = res.data?.price?.value
    if (price) return Number(price)
  } catch (err) {
    console.error('price fetch error', (err as Error)?.message || err)
  }
  return null
}

async function main() {
  const conn = await pool.getConnection()
  try {
    const [items]: any = await conn.query('SELECT id, title, ebay_item_id FROM items')
    for (const item of items) {
      const price = await fetchCurrentPrice(item.ebay_item_id, item.title)
      if (price !== null) {
        await conn.query('UPDATE items SET current_price = ?, last_checked_at = NOW() WHERE id = ?', [price, item.id])
        console.log(`Updated item ${item.id} -> ${price}`)
      } else {
        console.log(`No price for item ${item.id}`)
      }
    }
  } finally {
    conn.release()
  }
}

if (require.main === module) {
  main().then(() => process.exit(0)).catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
