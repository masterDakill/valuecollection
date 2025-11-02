/**
 * eBay OAuth 2.0 Service
 * Handles authentication and token management for eBay API
 */

export interface EbayTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

export interface EbayEnvironment {
  authUrl: string;
  tokenUrl: string;
  apiUrl: string;
  name: 'sandbox' | 'production';
}

export class EbayOAuthService {
  private clientId: string;
  private clientSecret: string;
  private devId: string;
  private environment: EbayEnvironment;
  private redirectUri: string;
  
  // eBay OAuth endpoints
  private static readonly ENVIRONMENTS = {
    sandbox: {
      authUrl: 'https://auth.sandbox.ebay.com',
      tokenUrl: 'https://api.sandbox.ebay.com',
      apiUrl: 'https://api.sandbox.ebay.com',
      name: 'sandbox' as const
    },
    production: {
      authUrl: 'https://auth.ebay.com',
      tokenUrl: 'https://api.ebay.com',
      apiUrl: 'https://api.ebay.com',
      name: 'production' as const
    }
  };
  
  // OAuth scopes needed for listing items
  private static readonly REQUIRED_SCOPES = [
    'https://api.ebay.com/oauth/api_scope/sell.inventory',
    'https://api.ebay.com/oauth/api_scope/sell.inventory.readonly',
    'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
    'https://api.ebay.com/oauth/api_scope/sell.item',
    'https://api.ebay.com/oauth/api_scope'
  ];

  constructor(
    clientId: string,
    clientSecret: string,
    devId: string,
    environment: 'sandbox' | 'production' = 'sandbox',
    redirectUri?: string
  ) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.devId = devId;
    this.environment = EbayOAuthService.ENVIRONMENTS[environment];
    // Use RuName as redirect_uri for eBay OAuth
    this.redirectUri = redirectUri || 'Mathieu_Chamber-MathieuC-Collec-mpbzllj';
  }

  /**
   * Get authorization URL for user to grant access
   */
  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: EbayOAuthService.REQUIRED_SCOPES.join(' '),
      state: state || Math.random().toString(36).substring(7)
    });
    
    return this.environment.authUrl + '/oauth2/authorize?' + params.toString();
  }

  /**
   * Exchange authorization code for access token (Authorization Code Grant)
   */
  async exchangeCodeForToken(code: string): Promise<EbayTokenResponse> {
    const credentials = btoa(this.clientId + ':' + this.clientSecret);
    
    const response = await fetch(this.environment.tokenUrl + '/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + credentials
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: this.redirectUri
      }).toString()
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error('Failed to exchange code for token: ' + error);
    }
    
    return await response.json();
  }

  /**
   * Get application token (Client Credentials Grant) - for public data access
   */
  async getApplicationToken(): Promise<EbayTokenResponse> {
    const credentials = btoa(this.clientId + ':' + this.clientSecret);
    
    const response = await fetch(this.environment.tokenUrl + '/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + credentials
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'https://api.ebay.com/oauth/api_scope'
      }).toString()
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error('Failed to get application token: ' + error);
    }
    
    return await response.json();
  }

  /**
   * Refresh expired user token
   */
  async refreshToken(refreshToken: string): Promise<EbayTokenResponse> {
    const credentials = btoa(this.clientId + ':' + this.clientSecret);
    
    const response = await fetch(this.environment.tokenUrl + '/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + credentials
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        scope: EbayOAuthService.REQUIRED_SCOPES.join(' ')
      }).toString()
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error('Failed to refresh token: ' + error);
    }
    
    return await response.json();
  }

  /**
   * Create an inventory item on eBay
   */
  async createInventoryItem(accessToken: string, sku: string, itemData: any): Promise<any> {
    const response = await fetch(
      this.environment.apiUrl + '/sell/inventory/v1/inventory_item/' + sku,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + accessToken
        },
        body: JSON.stringify(itemData)
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error('Failed to create inventory item: ' + error);
    }
    
    // PUT returns 204 No Content on success
    return response.status === 204 ? { success: true, sku } : await response.json();
  }

  /**
   * Create an offer for an inventory item
   */
  async createOffer(accessToken: string, offerData: any): Promise<any> {
    const response = await fetch(
      this.environment.apiUrl + '/sell/inventory/v1/offer',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + accessToken
        },
        body: JSON.stringify(offerData)
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error('Failed to create offer: ' + error);
    }
    
    return await response.json();
  }

  /**
   * Publish an offer to create a live listing
   */
  async publishOffer(accessToken: string, offerId: string): Promise<any> {
    const response = await fetch(
      this.environment.apiUrl + '/sell/inventory/v1/offer/' + offerId + '/publish',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + accessToken
        }
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error('Failed to publish offer: ' + error);
    }
    
    return await response.json();
  }

  /**
   * Complete workflow: Create item, offer, and publish
   */
  async createAndPublishListing(
    accessToken: string,
    itemData: {
      sku: string;
      title: string;
      description: string;
      price: number;
      quantity: number;
      condition: string;
      categoryId: string;
      imageUrls?: string[];
      location?: {
        country: string;
        postalCode: string;
      };
    }
  ): Promise<{ listingId: string; listingUrl: string }> {
    
    // Step 1: Create inventory item
    const inventoryItemData = {
      product: {
        title: itemData.title,
        description: itemData.description,
        imageUrls: itemData.imageUrls || [],
        aspects: {}
      },
      condition: itemData.condition.toUpperCase(),
      availability: {
        shipToLocationAvailability: {
          quantity: itemData.quantity
        }
      }
    };
    
    await this.createInventoryItem(accessToken, itemData.sku, inventoryItemData);
    
    // Step 2: Create offer
    const offerData = {
      sku: itemData.sku,
      marketplaceId: this.environment.name === 'sandbox' ? 'EBAY_US' : 'EBAY_US',
      format: 'FIXED_PRICE',
      availableQuantity: itemData.quantity,
      categoryId: itemData.categoryId,
      listingDescription: itemData.description,
      listingPolicies: {
        fulfillmentPolicyId: 'default',
        paymentPolicyId: 'default',
        returnPolicyId: 'default'
      },
      pricingSummary: {
        price: {
          value: itemData.price.toFixed(2),
          currency: 'USD'
        }
      },
      merchantLocationKey: itemData.location ? 'default' : undefined
    };
    
    const offer = await this.createOffer(accessToken, offerData);
    
    // Step 3: Publish offer
    const publishResult = await this.publishOffer(accessToken, offer.offerId);
    
    return {
      listingId: publishResult.listingId,
      listingUrl: this.environment.name === 'sandbox'
        ? 'https://www.sandbox.ebay.com/itm/' + publishResult.listingId
        : 'https://www.ebay.com/itm/' + publishResult.listingId
    };
  }
}
