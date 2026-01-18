import { BrowserWindow } from 'electron'
import axios from 'axios'
import crypto from 'crypto'

interface EbayAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes: string[]
}

interface EbayTokenResponse {
  access_token: string
  expires_in: number
  refresh_token?: string
  refresh_token_expires_in?: number
  token_type: string
}

export class EbayAuthManager {
  private config: EbayAuthConfig
  private codeVerifier: string = ''
  
  constructor(clientId: string, clientSecret: string, redirectUri: string = 'http://localhost:3000/oauth/callback') {
    this.config = {
      clientId,
      clientSecret,
      redirectUri,
      scopes: [
        'https://api.ebay.com/oauth/api_scope',
        'https://api.ebay.com/oauth/api_scope/buy.order.readonly',
        'https://api.ebay.com/oauth/api_scope/buy.guest.order'
      ]
    }
  }

  // Generate PKCE code verifier and challenge
  private generatePKCE() {
    this.codeVerifier = crypto.randomBytes(32).toString('base64url')
    const codeChallenge = crypto
      .createHash('sha256')
      .update(this.codeVerifier)
      .digest('base64url')
    return { codeVerifier: this.codeVerifier, codeChallenge }
  }

  // Build the authorization URL
  getAuthUrl(): string {
    const { codeChallenge } = this.generatePKCE()
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state: crypto.randomBytes(16).toString('hex')
    })

    return `https://auth.ebay.com/oauth2/authorize?${params.toString()}`
  }

  // Open authentication window and handle OAuth flow
  async authenticate(parentWindow: BrowserWindow): Promise<string> {
    return new Promise((resolve, reject) => {
      const authUrl = this.getAuthUrl()
      
      const authWindow = new BrowserWindow({
        width: 800,
        height: 600,
        parent: parentWindow,
        modal: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      })

      authWindow.loadURL(authUrl)

      // Listen for redirect
      authWindow.webContents.on('will-redirect', async (event, url) => {
        if (url.startsWith(this.config.redirectUri)) {
          event.preventDefault()
          authWindow.close()

          const urlParams = new URL(url).searchParams
          const code = urlParams.get('code')
          const error = urlParams.get('error')

          if (error) {
            reject(new Error(`eBay auth error: ${error}`))
            return
          }

          if (!code) {
            reject(new Error('No authorization code received'))
            return
          }

          try {
            const token = await this.exchangeCodeForToken(code)
            resolve(token)
          } catch (err) {
            reject(err)
          }
        }
      })

      authWindow.on('closed', () => {
        reject(new Error('Authentication window closed'))
      })
    })
  }

  // Exchange authorization code for access token
  private async exchangeCodeForToken(code: string): Promise<string> {
    const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')
    
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.redirectUri,
      code_verifier: this.codeVerifier
    })

    try {
      const response = await axios.post<EbayTokenResponse>(
        'https://api.ebay.com/identity/v1/oauth2/token',
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${credentials}`
          }
        }
      )

      return response.data.access_token
    } catch (error: any) {
      throw new Error(`Failed to exchange code for token: ${error.response?.data?.error_description || error.message}`)
    }
  }

  // Refresh an expired access token
  async refreshToken(refreshToken: string): Promise<string> {
    const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')
    
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      scope: this.config.scopes.join(' ')
    })

    try {
      const response = await axios.post<EbayTokenResponse>(
        'https://api.ebay.com/identity/v1/oauth2/token',
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${credentials}`
          }
        }
      )

      return response.data.access_token
    } catch (error: any) {
      throw new Error(`Failed to refresh token: ${error.response?.data?.error_description || error.message}`)
    }
  }
}
