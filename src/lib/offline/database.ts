import Dexie, { Table } from 'dexie';
import type { 
  User, 
  Colmado, 
  Product, 
  Order, 
  Transaction, 
  OfflineAction,
  WhatsAppMessage,
  CreditAssessment,
  DigitalReputation
} from '@/types';

// IndexedDB database for offline-first functionality
export class WhatsOpiDatabase extends Dexie {
  // Core business entities
  users!: Table<User>;
  colmados!: Table<Colmado>;
  products!: Table<Product>;
  orders!: Table<Order>;
  transactions!: Table<Transaction>;
  
  // Communication and AI
  whatsappMessages!: Table<WhatsAppMessage>;
  creditAssessments!: Table<CreditAssessment>;
  digitalReputations!: Table<DigitalReputation>;
  
  // Offline functionality
  offlineActions!: Table<OfflineAction>;
  
  // Cache tables
  apiCache!: Table<{ key: string; data: any; timestamp: Date; expiresAt: Date }>;
  voiceCache!: Table<{ text: string; audioUrl: string; language: string; timestamp: Date }>;

  constructor() {
    super('WhatsOpiDB');
    
    this.version(1).stores({
      // Core entities with indexes for common queries
      users: '++id, phone, email, role, preferredLanguage, verificationStatus, digitalReputationScore',
      colmados: '++id, ownerId, name, [address.city+address.province], isVerified, rating',
      products: '++id, colmadoId, category, name, price, inStock, isActive',
      orders: '++id, customerId, colmadoId, status, paymentStatus, createdAt',
      transactions: '++id, userId, orderId, type, status, amount, createdAt',
      
      // Communication
      whatsappMessages: '++id, from, to, type, timestamp, status',
      
      // AI and financial
      creditAssessments: '++userId, score, assessmentDate, validUntil',
      digitalReputations: '++userId, overallScore, lastUpdated',
      
      // Offline functionality
      offlineActions: '++id, type, entity, entityId, timestamp, attempts',
      
      // Cache
      apiCache: '++key, timestamp, expiresAt',
      voiceCache: '++text, language, timestamp'
    });

    // Add hooks for automatic timestamp updates
    this.users.hook('creating', (primKey, obj, trans) => {
      obj.createdAt = new Date();
      obj.updatedAt = new Date();
    });

    this.users.hook('updating', (modifications, primKey, obj, trans) => {
      modifications.updatedAt = new Date();
    });

    this.colmados.hook('creating', (primKey, obj, trans) => {
      obj.createdAt = new Date();
      obj.updatedAt = new Date();
    });

    this.colmados.hook('updating', (modifications, primKey, obj, trans) => {
      modifications.updatedAt = new Date();
    });

    this.products.hook('creating', (primKey, obj, trans) => {
      obj.createdAt = new Date();
      obj.updatedAt = new Date();
    });

    this.products.hook('updating', (modifications, primKey, obj, trans) => {
      modifications.updatedAt = new Date();
    });

    this.orders.hook('creating', (primKey, obj, trans) => {
      obj.createdAt = new Date();
      obj.updatedAt = new Date();
    });

    this.orders.hook('updating', (modifications, primKey, obj, trans) => {
      modifications.updatedAt = new Date();
    });
  }

  // Utility methods for common operations
  
  /**
   * Get nearby colmados based on user location (offline-friendly)
   */
  async getNearbyColmados(userLat?: number, userLng?: number, radius: number = 5): Promise<Colmado[]> {
    const colmados = await this.colmados
      .where('isVerified')
      .equals(1)
      .toArray();

    if (!userLat || !userLng) {
      // Return all verified colmados if no location provided
      return colmados.slice(0, 20); // Limit for performance
    }

    // Simple distance calculation for offline use
    return colmados
      .filter(colmado => {
        const coords = colmado.address.coordinates;
        if (!coords) return false;
        
        const distance = this.calculateDistance(userLat, userLng, coords.lat, coords.lng);
        return distance <= radius;
      })
      .sort((a, b) => {
        const aCoords = a.address.coordinates!;
        const bCoords = b.address.coordinates!;
        const aDist = this.calculateDistance(userLat, userLng, aCoords.lat, aCoords.lng);
        const bDist = this.calculateDistance(userLat, userLng, bCoords.lat, bCoords.lng);
        return aDist - bDist;
      })
      .slice(0, 10);
  }

  /**
   * Search products with fuzzy matching (offline-friendly)
   */
  async searchProducts(query: string, colmadoId?: string): Promise<Product[]> {
    const normalizedQuery = query.toLowerCase().trim();
    
    let collection = this.products.where('isActive').equals(1);
    
    if (colmadoId) {
      collection = collection.and(product => product.colmadoId === colmadoId);
    }

    const products = await collection.toArray();

    // Simple fuzzy search implementation
    return products.filter(product => {
      const name = product.name.toLowerCase();
      const description = product.description?.toLowerCase() || '';
      const category = product.category.toLowerCase();

      return name.includes(normalizedQuery) || 
             description.includes(normalizedQuery) || 
             category.includes(normalizedQuery) ||
             this.fuzzyMatch(name, normalizedQuery) ||
             this.fuzzyMatch(description, normalizedQuery);
    }).slice(0, 50); // Limit results for performance
  }

  /**
   * Get user's order history with pagination
   */
  async getUserOrders(userId: string, limit: number = 20, offset: number = 0): Promise<Order[]> {
    return await this.orders
      .where('customerId')
      .equals(userId)
      .reverse()
      .offset(offset)
      .limit(limit)
      .toArray();
  }

  /**
   * Cache API response with expiration
   */
  async cacheApiResponse(key: string, data: any, ttlMinutes: number = 60): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);
    
    await this.apiCache.put({
      key,
      data,
      timestamp: now,
      expiresAt
    });
  }

  /**
   * Get cached API response if not expired
   */
  async getCachedApiResponse(key: string): Promise<any | null> {
    const cached = await this.apiCache.get(key);
    
    if (!cached) return null;
    
    if (new Date() > cached.expiresAt) {
      // Expired, remove from cache
      await this.apiCache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Add offline action to queue
   */
  async queueOfflineAction(
    type: 'create' | 'update' | 'delete',
    entity: 'order' | 'product' | 'user' | 'message',
    entityId: string,
    payload: any
  ): Promise<void> {
    await this.offlineActions.add({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      entity,
      entityId,
      payload,
      timestamp: new Date(),
      attempts: 0
    });
  }

  /**
   * Get pending offline actions
   */
  async getPendingOfflineActions(): Promise<OfflineAction[]> {
    return await this.offlineActions
      .orderBy('timestamp')
      .toArray();
  }

  /**
   * Mark offline action as completed
   */
  async completeOfflineAction(actionId: string): Promise<void> {
    await this.offlineActions.delete(actionId);
  }

  /**
   * Update offline action with error info
   */
  async updateOfflineActionError(actionId: string, error: string): Promise<void> {
    const action = await this.offlineActions.get(actionId);
    if (action) {
      action.attempts += 1;
      action.lastAttempt = new Date();
      action.error = error;
      await this.offlineActions.put(action);
    }
  }

  /**
   * Clear expired cache entries
   */
  async clearExpiredCache(): Promise<void> {
    const now = new Date();
    await this.apiCache.where('expiresAt').below(now).delete();
  }

  // Utility functions
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private fuzzyMatch(text: string, query: string): boolean {
    if (query.length === 0) return true;
    if (text.length === 0) return false;

    const threshold = Math.floor(query.length * 0.8); // 80% similarity
    let matches = 0;

    for (let i = 0; i < query.length; i++) {
      if (text.includes(query[i])) {
        matches++;
      }
    }

    return matches >= threshold;
  }
}

// Create singleton database instance
export const db = new WhatsOpiDatabase();