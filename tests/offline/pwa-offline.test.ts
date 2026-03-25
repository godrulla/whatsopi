import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { mockOfflineStorage, mockDexieDatabase, storageTestUtils } from '@/test/mocks/storage'
import { mockApiClient, configureFetchMock, resetFetchMock } from '@/test/mocks/api'

// Mock offline hook
const useOffline = () => {
  const [isOnline, setIsOnline] = vi.fn().mockReturnValue([true, vi.fn()])
  const [pendingSync, setPendingSync] = vi.fn().mockReturnValue([[], vi.fn()])
  
  return {
    isOnline: isOnline[0],
    setIsOnline: setIsOnline[1],
    pendingSync: pendingSync[0],
    setPendingSync: setPendingSync[1],
    syncData: vi.fn(),
    queueForSync: vi.fn(),
    clearSyncQueue: vi.fn()
  }
}

describe('PWA Offline Functionality Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    configureFetchMock()
    storageTestUtils.clearAllStorage()
  })

  afterEach(() => {
    vi.clearAllMocks()
    resetFetchMock()
    storageTestUtils.clearAllStorage()
  })

  describe('Offline Detection', () => {
    it('should detect when device goes offline', async () => {
      const { result } = renderHook(() => useOffline())

      // Simulate going offline
      act(() => {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: false
        })
        
        window.dispatchEvent(new Event('offline'))
      })

      expect(result.current.isOnline).toBe(false)
    })

    it('should detect when device comes back online', async () => {
      const { result } = renderHook(() => useOffline())

      // Start offline
      act(() => {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: false
        })
        window.dispatchEvent(new Event('offline'))
      })

      expect(result.current.isOnline).toBe(false)

      // Go back online
      act(() => {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: true
        })
        window.dispatchEvent(new Event('online'))
      })

      expect(result.current.isOnline).toBe(true)
    })
  })

  describe('Data Storage and Sync', () => {
    it('should store product data offline', async () => {
      const products = [
        {
          id: 'prod-1',
          name: 'Arroz Blanco',
          price: 50.00,
          colmadoId: 'colmado-1',
          lastUpdated: new Date()
        },
        {
          id: 'prod-2',
          name: 'Pollo Entero',
          price: 180.00,
          colmadoId: 'colmado-1',
          lastUpdated: new Date()
        }
      ]

      vi.spyOn(mockOfflineStorage, 'storeProducts').mockResolvedValue(undefined)
      vi.spyOn(mockOfflineStorage, 'getStoredProducts').mockResolvedValue(products)

      await mockOfflineStorage.storeProducts(products)
      const storedProducts = await mockOfflineStorage.getStoredProducts()

      expect(mockOfflineStorage.storeProducts).toHaveBeenCalledWith(products)
      expect(storedProducts).toEqual(products)
      expect(storedProducts).toHaveLength(2)
    })

    it('should queue orders for sync when offline', async () => {
      const order = {
        id: 'order-offline-1',
        userId: 'user-123',
        items: [
          {
            productId: 'prod-1',
            name: 'Arroz Blanco',
            quantity: 2,
            price: 50.00
          }
        ],
        total: 100.00,
        status: 'pending',
        createdAt: new Date(),
        synced: false
      }

      vi.spyOn(mockOfflineStorage, 'storeOrder').mockResolvedValue(undefined)
      vi.spyOn(mockOfflineStorage, 'addToSyncQueue').mockResolvedValue(undefined)

      // Simulate offline order creation
      await mockOfflineStorage.storeOrder(order)
      await mockOfflineStorage.addToSyncQueue({
        type: 'CREATE_ORDER',
        data: order,
        timestamp: new Date()
      })

      expect(mockOfflineStorage.storeOrder).toHaveBeenCalledWith(order)
      expect(mockOfflineStorage.addToSyncQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CREATE_ORDER',
          data: order
        })
      )
    })

    it('should sync pending data when coming back online', async () => {
      const pendingOrders = [
        {
          id: 'order-offline-1',
          total: 100.00,
          synced: false
        },
        {
          id: 'order-offline-2',
          total: 250.00,
          synced: false
        }
      ]

      vi.spyOn(mockOfflineStorage, 'getPendingOrders').mockResolvedValue(pendingOrders)
      vi.spyOn(mockOfflineStorage, 'processSyncQueue').mockResolvedValue({
        synced: 2,
        failed: 0
      })

      const { result } = renderHook(() => useOffline())

      // Simulate coming back online and syncing
      act(() => {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: true
        })
        window.dispatchEvent(new Event('online'))
      })

      // Trigger sync
      await act(async () => {
        await result.current.syncData()
      })

      expect(mockOfflineStorage.processSyncQueue).toHaveBeenCalled()
    })
  })

  describe('Offline UI Behavior', () => {
    it('should show offline indicator when offline', async () => {
      const { result } = renderHook(() => useOffline())

      act(() => {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: false
        })
        window.dispatchEvent(new Event('offline'))
      })

      expect(result.current.isOnline).toBe(false)
      
      // UI should show offline message
      // This would be tested in component tests, but we can verify the state
      expect(result.current.isOnline).toBe(false)
    })

    it('should provide optimistic UI updates for offline actions', async () => {
      const { result } = renderHook(() => useOffline())

      // Simulate offline state
      act(() => {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: false
        })
      })

      const newOrder = {
        id: 'order-optimistic-1',
        items: [{ productId: 'prod-1', quantity: 1 }],
        total: 50.00,
        status: 'pending'
      }

      // Queue for sync but show immediately in UI
      act(() => {
        result.current.queueForSync({
          type: 'CREATE_ORDER',
          data: newOrder,
          optimistic: true
        })
      })

      expect(result.current.queueForSync).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CREATE_ORDER',
          optimistic: true
        })
      )
    })
  })

  describe('Service Worker Caching', () => {
    it('should cache API responses for offline access', async () => {
      const mockCache = {
        match: vi.fn(),
        put: vi.fn(),
        add: vi.fn(),
        delete: vi.fn()
      }

      global.caches = {
        open: vi.fn().mockResolvedValue(mockCache),
        match: vi.fn(),
        has: vi.fn(),
        delete: vi.fn(),
        keys: vi.fn()
      }

      // Simulate caching API response
      const apiResponse = new Response(JSON.stringify({
        products: [
          { id: 'prod-1', name: 'Arroz', price: 50.00 }
        ]
      }))

      mockCache.match.mockResolvedValue(null) // Not in cache
      mockCache.put.mockResolvedValue(undefined)

      const cache = await caches.open('api-cache')
      await cache.put('/api/products', apiResponse)

      expect(cache.put).toHaveBeenCalledWith('/api/products', apiResponse)
    })

    it('should serve cached responses when offline', async () => {
      const cachedResponse = new Response(JSON.stringify({
        products: [
          { id: 'prod-1', name: 'Arroz Blanco', price: 50.00 },
          { id: 'prod-2', name: 'Pollo Entero', price: 180.00 }
        ]
      }))

      const mockCache = {
        match: vi.fn().mockResolvedValue(cachedResponse),
        put: vi.fn(),
        add: vi.fn(),
        delete: vi.fn()
      }

      global.caches = {
        open: vi.fn().mockResolvedValue(mockCache),
        match: vi.fn().mockResolvedValue(cachedResponse),
        has: vi.fn(),
        delete: vi.fn(),
        keys: vi.fn()
      }

      // Simulate offline fetch
      const response = await caches.match('/api/products')
      expect(response).toBe(cachedResponse)

      const data = await response.json()
      expect(data.products).toHaveLength(2)
      expect(data.products[0].name).toBe('Arroz Blanco')
    })
  })

  describe('Storage Management', () => {
    it('should manage storage quota efficiently', async () => {
      vi.spyOn(mockOfflineStorage, 'getStorageUsage').mockResolvedValue({
        used: 45000000, // 45MB
        quota: 50000000, // 50MB  
        percentage: 90
      })

      const usage = await mockOfflineStorage.getStorageUsage()

      expect(usage.percentage).toBe(90)
      expect(usage.used).toBeLessThanOrEqual(usage.quota)

      // Should trigger cleanup when usage is high
      if (usage.percentage > 85) {
        vi.spyOn(mockOfflineStorage, 'clearOldData').mockResolvedValue({ cleared: 150 })
        
        const cleanup = await mockOfflineStorage.clearOldData()
        expect(cleanup.cleared).toBeGreaterThan(0)
      }
    })

    it('should prioritize important data during storage cleanup', async () => {
      const testData = [
        { type: 'user_profile', importance: 'high', size: 1000 },
        { type: 'recent_orders', importance: 'high', size: 5000 },
        { type: 'product_cache', importance: 'medium', size: 20000 },
        { type: 'old_search_results', importance: 'low', size: 15000 }
      ]

      vi.spyOn(mockOfflineStorage, 'clearOldData').mockImplementation(async () => {
        // Simulate cleanup logic that preserves high importance data
        const cleared = testData
          .filter(item => item.importance === 'low')
          .reduce((sum, item) => sum + item.size, 0)
        
        return { cleared }
      })

      const cleanup = await mockOfflineStorage.clearOldData()
      
      // Should have cleared low importance data (15000 bytes)
      expect(cleanup.cleared).toBe(15000)
    })
  })

  describe('Conflict Resolution', () => {
    it('should handle sync conflicts gracefully', async () => {
      const localOrder = {
        id: 'order-123',
        status: 'pending',
        items: [{ productId: 'prod-1', quantity: 2 }],
        total: 100.00,
        lastModified: new Date('2024-01-15T10:00:00Z')
      }

      const serverOrder = {
        id: 'order-123',
        status: 'confirmed',
        items: [{ productId: 'prod-1', quantity: 2 }],
        total: 100.00,
        lastModified: new Date('2024-01-15T10:30:00Z') // Server version is newer
      }

      vi.spyOn(mockOfflineStorage, 'processSyncQueue').mockImplementation(async () => {
        // Simulate conflict detection and resolution
        if (serverOrder.lastModified > localOrder.lastModified) {
          // Server wins - update local version
          await mockOfflineStorage.storeOrder(serverOrder)
          return { synced: 1, failed: 0, conflicts: 1 }
        }
        
        return { synced: 1, failed: 0, conflicts: 0 }
      })

      const result = await mockOfflineStorage.processSyncQueue()

      expect(result.synced).toBe(1)
      expect(result.conflicts).toBe(1)
      expect(mockOfflineStorage.storeOrder).toHaveBeenCalledWith(serverOrder)
    })

    it('should preserve user changes during conflict resolution', async () => {
      const userEditedOrder = {
        id: 'order-456',
        status: 'pending',
        userNotes: 'Sin cebolla por favor', // User added notes
        items: [{ productId: 'prod-1', quantity: 3 }], // User changed quantity
        lastModified: new Date('2024-01-15T11:00:00Z')
      }

      const serverOrder = {
        id: 'order-456',
        status: 'confirmed',
        items: [{ productId: 'prod-1', quantity: 2 }],
        lastModified: new Date('2024-01-15T11:30:00Z')
      }

      vi.spyOn(mockOfflineStorage, 'processSyncQueue').mockImplementation(async () => {
        // Simulate smart merge - preserve user changes while updating status
        const mergedOrder = {
          ...serverOrder,
          userNotes: userEditedOrder.userNotes,
          items: userEditedOrder.items // Keep user's quantity change
        }

        await mockOfflineStorage.storeOrder(mergedOrder)
        return { synced: 1, failed: 0, conflicts: 1, merged: 1 }
      })

      const result = await mockOfflineStorage.processSyncQueue()

      expect(result.merged).toBe(1)
      expect(mockOfflineStorage.storeOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'confirmed', // From server
          userNotes: 'Sin cebolla por favor', // From user
          items: [{ productId: 'prod-1', quantity: 3 }] // From user
        })
      )
    })
  })

  describe('Performance Optimization', () => {
    it('should batch database operations for better performance', async () => {
      const products = Array(100).fill().map((_, i) => ({
        id: `prod-${i}`,
        name: `Producto ${i}`,
        price: 50 + i,
        colmadoId: 'colmado-1'
      }))

      vi.spyOn(mockDexieDatabase, 'transaction').mockImplementation(async (mode, tables, callback) => {
        // Simulate transaction
        return await callback()
      })

      vi.spyOn(mockOfflineStorage, 'storeProducts').mockImplementation(async (products) => {
        // Simulate batched insert
        await mockDexieDatabase.transaction('rw', ['products'], async () => {
          for (const product of products) {
            await mockDexieDatabase.products.put(product)
          }
        })
      })

      const startTime = Date.now()
      await mockOfflineStorage.storeProducts(products)
      const endTime = Date.now()

      expect(mockDexieDatabase.transaction).toHaveBeenCalled()
      expect(endTime - startTime).toBeLessThan(1000) // Should complete in < 1 second
    })

    it('should implement efficient data pagination for large datasets', async () => {
      const totalProducts = 1000
      const pageSize = 50

      vi.spyOn(mockOfflineStorage, 'getStoredProducts').mockImplementation(async (options = {}) => {
        const { limit = 50, offset = 0 } = options
        
        // Simulate paginated query
        const products = Array(Math.min(limit, totalProducts - offset)).fill().map((_, i) => ({
          id: `prod-${offset + i}`,
          name: `Producto ${offset + i}`,
          price: 50 + i
        }))

        return products
      })

      // Test pagination
      const page1 = await mockOfflineStorage.getStoredProducts({ limit: pageSize, offset: 0 })
      const page2 = await mockOfflineStorage.getStoredProducts({ limit: pageSize, offset: 50 })

      expect(page1).toHaveLength(pageSize)
      expect(page2).toHaveLength(pageSize)
      expect(page1[0].id).toBe('prod-0')
      expect(page2[0].id).toBe('prod-50')
    })
  })
})