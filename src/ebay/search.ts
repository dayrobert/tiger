import axios from 'axios'
import { logger } from '../logger'

export interface EbaySearchResult {
  itemId: string
  title: string
  price?: {
    value: string
    currency: string
  }
  condition?: string
  itemWebUrl?: string
  image?: {
    imageUrl: string
  }
  seller?: {
    username: string
    feedbackPercentage: string
  }
}

export interface EbaySearchParams {
  keywords: string
  limit?: number
  categoryIds?: string[]
  filter?: string
}

export class EbaySearchService {
  private clientId: string
  private clientSecret: string
  private accessToken: string | null = null

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId
    this.clientSecret = clientSecret
  }

  // Get application token (for public search, no user auth required)
  private async getAppToken(): Promise<string> {
    if (this.accessToken) {
      return this.accessToken
    }

    logger.debug('Getting eBay application token...')
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')
    
    try {
      const response = await axios.post(
        'https://api.ebay.com/identity/v1/oauth2/token',
        'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${credentials}`
          }
        }
      )

      this.accessToken = response.data.access_token
      logger.info('eBay application token obtained')
      
      if (!this.accessToken) {
        throw new Error('No access token received from eBay')
      }
      
      return this.accessToken
    } catch (error: any) {
      logger.error('Failed to get eBay app token:', error.response?.data || error.message)
      throw new Error(`Failed to get eBay app token: ${error.response?.data?.error_description || error.message}`)
    }
  }

  // Search for items on eBay
  async search(params: EbaySearchParams): Promise<EbaySearchResult[]> {
    logger.info('Searching eBay for:', params.keywords)
    
    const token = await this.getAppToken()
    
    const searchParams = new URLSearchParams({
      q: params.keywords,
      limit: (params.limit || 50).toString()
    })

    if (params.categoryIds && params.categoryIds.length > 0) {
      searchParams.append('category_ids', params.categoryIds.join(','))
    }

    if (params.filter) {
      searchParams.append('filter', params.filter)
    }

    try {
      const response = await axios.get(
        `https://api.ebay.com/buy/browse/v1/item_summary/search?${searchParams.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
            'X-EBAY-C-ENDUSERCTX': 'affiliateCampaignId=<ePNCampaignId>,affiliateReferenceId=<referenceId>'
          }
        }
      )

      const items = response.data.itemSummaries || []
      logger.info(`Found ${items.length} items on eBay`)
      
      return items.map((item: any) => ({
        itemId: item.itemId,
        title: item.title,
        price: item.price,
        condition: item.condition,
        itemWebUrl: item.itemWebUrl,
        image: item.image,
        seller: item.seller
      }))
    } catch (error: any) {
      logger.error('eBay search failed:', error.response?.data || error.message)
      throw new Error(`eBay search failed: ${error.response?.data?.errors?.[0]?.message || error.message}`)
    }
  }
}
