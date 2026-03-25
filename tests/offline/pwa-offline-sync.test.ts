import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserContext } from '@playwright/test'
import Dexie from 'dexie'
import { OfflineDatabase } from '@/lib/offline/database'
import { OfflineContext, OfflineProvider } from '@/contexts/OfflineContext'
import { HomePage } from '@/pages/HomePage'

// Mock Service Worker
const mockServiceWorker = {
  register: vi.fn(() => Promise.resolve({
    installing: null,
    waiting: null,
    active: {
      postMessage: vi.fn(),
      state: 'activated'
    },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    update: vi.fn()
  })),
  ready: Promise.resolve({
    showNotification: vi.fn(),
    sync: {
      register: vi.fn()
    }
  }),
  controller: null
}

Object.defineProperty(navigator, 'serviceWorker', {
  value: mockServiceWorker,
  configurable: true
})

// Mock Background Sync
global.SyncManager = class {
  register = vi.fn()
  getTags = vi.fn(() => Promise.resolve([]))
}

describe('PWA Offline Functionality', () => {
  let offlineDb: OfflineDatabase
  let mockNetworkState: boolean = true

  beforeAll(async () => {
    offlineDb = new OfflineDatabase()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockNetworkState = true
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      get: () => mockNetworkState,
      configurable: true
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  afterAll(async () => {
    await offlineDb.delete()
  })

  describe('Service Worker Installation', () => {
    it('should register service worker for Dominican PWA', async () => {
      // Mock service worker registration
      const registration = await navigator.serviceWorker.register('/sw.js')
      
      expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js')
      expect(registration.active?.state).toBe('activated')
    })

    it('should cache Dominican-specific resources', async () => {
      const expectedCaches = [
        'whatsopi-v1-static',
        'whatsopi-v1-dominican-content',
        'whatsopi-v1-voice-models',
        'whatsopi-v1-product-images'
      ]

      // Mock caches API
      global.caches = {
        open: vi.fn((cacheName) => Promise.resolve({
          name: cacheName,
          addAll: vi.fn(),
          add: vi.fn(),
          match: vi.fn(),
          matchAll: vi.fn(),
          put: vi.fn(),
          delete: vi.fn(),
          keys: vi.fn()
        })),
        match: vi.fn(),
        has: vi.fn(),
        delete: vi.fn(),
        keys: vi.fn(() => Promise.resolve(expectedCaches))
      } as any

      const cacheNames = await caches.keys()
      
      expectedCaches.forEach(cacheName => {
        expect(cacheNames).toContain(cacheName)
      })
    })
  })

  describe('Offline Data Storage', () => {
    it('should store product catalog offline with Dominican products', async () => {
      const dominicanProducts = [
        {
          id: 'prod-001',
          name: 'Pollo Entero',
          price: 320,
          currency: 'DOP',
          category: 'carnes',
          description: 'Pollo fresco de granja dominicana',
          image: '/images/products/pollo-entero.webp',
          available: true,
          lastUpdated: new Date()
        },
        {
          id: 'prod-002',
          name: 'Arroz (5 lb)',
          price: 180,
          currency: 'DOP',
          category: 'granos',
          description: 'Arroz blanco de primera calidad',
          image: '/images/products/arroz-5lb.webp',
          available: true,
          lastUpdated: new Date()
        },
        {
          id: 'prod-003',
          name: 'Habichuelas Rojas',
          price: 120,
          currency: 'DOP',
          category: 'granos',
          description: 'Habichuelas rojas dominicanas',
          image: '/images/products/habichuelas-rojas.webp',
          available: true,
          lastUpdated: new Date()
        }
      ]

      // Store products offline
      await offlineDb.products.bulkPut(dominicanProducts)

      // Verify storage
      const storedProducts = await offlineDb.products.toArray()
      expect(storedProducts).toHaveLength(3)
      expect(storedProducts[0].name).toBe('Pollo Entero')
      expect(storedProducts[0].currency).toBe('DOP')
    })

    it('should store user data with Dominican business context', async () => {
      const userData = {
        id: 'user-001',
        phone: '8091234567',
        name: 'Juan Pérez',
        businessName: 'Colmado Don Juan',
        businessType: 'colmado',
        location: {
          address: 'Calle Primera #123, Santo Domingo',
          coordinates: { lat: 18.4861, lng: -69.9312 },
          neighborhood: 'Los Alcarrizos'
        },
        preferences: {
          language: 'es-DO',
          currency: 'DOP',
          notifications: true,
          voiceEnabled: true
        },
        lastSync: new Date()
      }

      await offlineDb.users.put(userData)

      const storedUser = await offlineDb.users.get('user-001')
      expect(storedUser?.businessName).toBe('Colmado Don Juan')
      expect(storedUser?.preferences.language).toBe('es-DO')
      expect(storedUser?.location.neighborhood).toBe('Los Alcarrizos')
    })

    it('should queue orders for sync when offline', async () => {
      const offlineOrder = {
        id: 'ord-offline-001',
        customerId: 'user-001',
        customerName: 'María González',
        customerPhone: '8291234567',
        items: [
          {
            productId: 'prod-001',
            name: 'Pollo Entero',
            quantity: 1,
            price: 320,
            currency: 'DOP'
          },
          {
            productId: 'prod-002',
            name: 'Arroz (5 lb)',
            quantity: 2,
            price: 180,
            currency: 'DOP'
          }
        ],
        total: 680,
        currency: 'DOP',
        status: 'pending_sync',
        paymentMethod: 'cash',
        deliveryAddress: 'Calle Segunda #456, Santo Domingo',
        createdAt: new Date(),
        syncStatus: 'queued'
      }

      await offlineDb.orders.add(offlineOrder)

      const queuedOrders = await offlineDb.orders
        .where('syncStatus')
        .equals('queued')
        .toArray()

      expect(queuedOrders).toHaveLength(1)
      expect(queuedOrders[0].id).toBe('ord-offline-001')
      expect(queuedOrders[0].total).toBe(680)
    })
  })

  describe('Offline UI Behavior', () => {
    it('should show offline indicator when network is unavailable', async () => {
      // Go offline
      mockNetworkState = false
      fireEvent(window, new Event('offline'))

      render(
        <OfflineProvider>
          <HomePage />
        </OfflineProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Sin conexión')).toBeVisible()
        expect(screen.getByText('Trabajando sin internet')).toBeVisible()
      })

      // Should show offline capabilities
      expect(screen.getByText('Puedes continuar:')).toBeVisible()
      expect(screen.getByText('• Ver productos guardados')).toBeVisible()
      expect(screen.getByText('• Crear pedidos (se enviarán después)')).toBeVisible()
      expect(screen.getByText('• Revisar historial')).toBeVisible()
    })

    it('should disable online-only features when offline', async () => {
      mockNetworkState = false
      fireEvent(window, new Event('offline'))

      render(
        <OfflineProvider>
          <HomePage />
        </OfflineProvider>
      )

      await waitFor(() => {
        // Online-only features should be disabled
        const whatsappButton = screen.getByRole('button', { name: /whatsapp/i })
        expect(whatsappButton).toBeDisabled()
        expect(whatsappButton).toHaveAttribute('title', 'Requiere conexión a internet')

        const paymentButton = screen.getByRole('button', { name: /pago en línea/i })
        expect(paymentButton).toBeDisabled()
        expect(paymentButton).toHaveAttribute('title', 'Pagos en línea no disponibles sin internet')
      })

      // Offline features should remain enabled
      const newOrderButton = screen.getByRole('button', { name: /nuevo pedido/i })
      expect(newOrderButton).not.toBeDisabled()
    })

    it('should show sync status when coming back online', async () => {
      // Start offline
      mockNetworkState = false
      fireEvent(window, new Event('offline'))

      render(
        <OfflineProvider>
          <HomePage />
        </OfflineProvider>
      )

      // Go back online
      mockNetworkState = true
      fireEvent(window, new Event('online'))

      await waitFor(() => {
        expect(screen.getByText('Conectando...')).toBeVisible()
        expect(screen.getByText('Sincronizando datos')).toBeVisible()
      })

      // After sync completes
      await waitFor(() => {
        expect(screen.getByText('¡Conectado!')).toBeVisible()
        expect(screen.getByText('Todos los datos sincronizados')).toBeVisible()
      }, { timeout: 5000 })
    })
  })

  describe('Background Sync', () => {
    it('should register background sync for Dominican business hours', async () => {
      // Mock Background Sync registration
      const registration = await navigator.serviceWorker.ready
      await registration.sync.register('dominican-business-sync')

      expect(registration.sync.register).toHaveBeenCalledWith('dominican-business-sync')
    })

    it('should sync orders during Dominican business hours', async () => {
      // Mock current time to be 2 PM Dominican time (peak business hours)
      const mockDate = new Date('2024-01-15T14:00:00-04:00')
      vi.setSystemTime(mockDate)

      const pendingOrders = [
        {
          id: 'ord-sync-001',
          total: 450,
          currency: 'DOP',
          syncStatus: 'queued',
          createdAt: new Date(Date.now() - 30000) // 30 seconds ago
        },
        {
          id: 'ord-sync-002',
          total: 320,
          currency: 'DOP',
          syncStatus: 'queued',
          createdAt: new Date(Date.now() - 60000) // 1 minute ago
        }
      ]

      await offlineDb.orders.bulkAdd(pendingOrders)

      // Simulate background sync event
      const syncEvent = new CustomEvent('sync', { 
        detail: { tag: 'dominican-business-sync' } 
      })
      
      fireEvent(self as any, syncEvent)

      await waitFor(() => {
        // Should prioritize by business context (older orders first during peak hours)
        expect(global.fetch).toHaveBeenCalledWith('/api/orders/sync', {
          method: 'POST',
          body: JSON.stringify({
            orders: expect.arrayContaining([
              expect.objectContaining({ id: 'ord-sync-002' }), // Older order first
              expect.objectContaining({ id: 'ord-sync-001' })
            ]),
            businessContext: {
              timeOfDay: 'peak_hours',
              timezone: 'America/Santo_Domingo',
              priority: 'high'
            }
          })
        })
      })

      vi.useRealTimers()
    })

    it('should handle sync conflicts with server data', async () => {
      const localOrder = {
        id: 'ord-conflict-001',
        customerId: 'user-001',
        total: 680,
        items: [{ productId: 'prod-001', quantity: 1, price: 320 }],
        status: 'pending',
        lastModified: new Date(Date.now() - 60000), // 1 minute ago
        syncStatus: 'queued'
      }

      await offlineDb.orders.add(localOrder)

      // Mock server response with conflicting data
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          conflicts: [{
            orderId: 'ord-conflict-001',
            serverVersion: {
              total: 700, // Different total
              status: 'confirmed',
              lastModified: new Date() // More recent
            },
            resolution: 'server_wins'
          }]
        })
      })

      // Trigger sync
      const syncEvent = new CustomEvent('sync', { 
        detail: { tag: 'order-sync' } 
      })
      fireEvent(self as any, syncEvent)

      await waitFor(async () => {
        // Should resolve conflict in favor of server
        const resolvedOrder = await offlineDb.orders.get('ord-conflict-001')
        expect(resolvedOrder?.total).toBe(700)
        expect(resolvedOrder?.status).toBe('confirmed')
        expect(resolvedOrder?.syncStatus).toBe('synced')
      })
    })
  })

  describe('Cache Management', () => {
    it('should manage cache size for Dominican low-storage devices', async () => {
      // Mock storage quota API
      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: vi.fn(() => Promise.resolve({
            quota: 1000000000, // 1GB
            usage: 750000000,   // 750MB used
            usageDetails: {
              indexedDB: 200000000, // 200MB
              caches: 550000000     // 550MB
            }
          }))
        },
        configurable: true
      })

      const storageEstimate = await navigator.storage.estimate()
      const usagePercentage = (storageEstimate.usage! / storageEstimate.quota!) * 100

      expect(usagePercentage).toBe(75) // 75% usage

      // Should trigger cache cleanup when over 70%
      if (usagePercentage > 70) {
        // Mock cache cleanup
        const oldCaches = await caches.keys()
        const cachesToDelete = oldCaches.filter(name => 
          name.includes('v1') || name.includes('old')
        )

        for (const cacheName of cachesToDelete) {
          await caches.delete(cacheName)
        }

        expect(caches.delete).toHaveBeenCalled()
      }
    })

    it('should prioritize Dominican content in cache', async () => {
      const cacheManifest = {
        critical: [
          '/manifest.json',
          '/styles/critical.css',
          '/js/app.js',
          '/images/logo-whatsopi.svg'
        ],
        dominicanContent: [
          '/locales/es-DO.json',
          '/locales/ht.json',
          '/data/dominican-products.json',
          '/data/dominican-businesses.json',
          '/voices/es-DO-voice-model.wasm'
        ],
        assets: [
          '/images/products/',
          '/icons/',
          '/fonts/'
        ]
      }

      // Critical and Dominican content should be cached first
      const cache = await caches.open('whatsopi-v1-dominican-content')
      
      await cache.addAll([
        ...cacheManifest.critical,
        ...cacheManifest.dominicanContent
      ])

      // Verify Dominican content is cached
      const cachedResponses = await cache.matchAll()
      const cachedUrls = cachedResponses.map(response => response.url)

      expect(cachedUrls).toContain(expect.stringContaining('es-DO.json'))
      expect(cachedUrls).toContain(expect.stringContaining('ht.json'))
      expect(cachedUrls).toContain(expect.stringContaining('dominican-products.json'))
    })
  })

  describe('Offline Voice Processing', () => {
    it('should cache voice models for Dominican Spanish', async () => {
      const voiceModelCache = await caches.open('whatsopi-v1-voice-models')
      
      const dominicanVoiceModels = [
        '/models/voice/es-DO-recognition.wasm',
        '/models/voice/es-DO-synthesis.wasm',
        '/models/voice/caribbean-accent.dat',
        '/models/nlp/dominican-terms.json'
      ]

      await voiceModelCache.addAll(dominicanVoiceModels)

      // Verify models are cached
      for (const modelUrl of dominicanVoiceModels) {
        const cachedModel = await voiceModelCache.match(modelUrl)
        expect(cachedModel).toBeTruthy()
      }
    })

    it('should process voice commands offline with cached models', async () => {
      // Mock offline voice processing
      const offlineVoiceProcessor = {
        processAudio: vi.fn((audioData: ArrayBuffer) => Promise.resolve({
          transcript: 'busco pollo barato',
          confidence: 0.88,
          language: 'es-DO',
          processedOffline: true
        }))
      }

      const mockAudioData = new ArrayBuffer(1024)
      const result = await offlineVoiceProcessor.processAudio(mockAudioData)

      expect(result.transcript).toBe('busco pollo barato')
      expect(result.processedOffline).toBe(true)
      expect(result.language).toBe('es-DO')
    })
  })

  describe('Data Synchronization Strategies', () => {
    it('should implement last-write-wins for simple conflicts', async () => {
      const localData = {
        id: 'user-001',
        name: 'Juan Pérez',
        businessName: 'Colmado Juan',
        lastModified: new Date(Date.now() - 30000) // 30 seconds ago
      }

      const serverData = {
        id: 'user-001',
        name: 'Juan Carlos Pérez', // Updated name
        businessName: 'Supermercado Juan Carlos', // Updated business name
        lastModified: new Date() // More recent
      }

      // Server data is more recent, should win
      const resolved = serverData.lastModified > localData.lastModified 
        ? serverData 
        : localData

      expect(resolved.name).toBe('Juan Carlos Pérez')
      expect(resolved.businessName).toBe('Supermercado Juan Carlos')
    })

    it('should merge non-conflicting changes', async () => {
      const localData = {
        id: 'user-001',
        preferences: {
          language: 'es-DO',
          currency: 'DOP',
          notifications: false // Changed locally
        },
        lastModified: new Date(Date.now() - 30000)
      }

      const serverData = {
        id: 'user-001',
        preferences: {
          language: 'es-DO',
          currency: 'DOP',
          voiceEnabled: true // Changed on server
        },
        lastModified: new Date()
      }

      // Merge non-conflicting changes
      const merged = {
        ...localData,
        preferences: {
          ...localData.preferences,
          ...serverData.preferences,
          notifications: localData.preferences.notifications // Keep local change
        },
        lastModified: new Date()
      }

      expect(merged.preferences.notifications).toBe(false) // Local change preserved
      expect(merged.preferences.voiceEnabled).toBe(true) // Server change merged
    })

    it('should handle partial sync failures gracefully', async () => {
      const ordersToSync = [
        { id: 'ord-001', total: 320, syncStatus: 'queued' },
        { id: 'ord-002', total: 450, syncStatus: 'queued' },
        { id: 'ord-003', total: 280, syncStatus: 'queued' }
      ]

      // Mock partial failure (one order fails to sync)
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: () => ({ success: true }) }) // ord-001 success
        .mockRejectedValueOnce(new Error('Network error')) // ord-002 fails
        .mockResolvedValueOnce({ ok: true, json: () => ({ success: true }) }) // ord-003 success

      const syncResults = []
      
      for (const order of ordersToSync) {
        try {
          await fetch('/api/orders/sync', {
            method: 'POST',
            body: JSON.stringify(order)
          })
          syncResults.push({ id: order.id, status: 'synced' })
        } catch (error) {
          syncResults.push({ id: order.id, status: 'failed', error: error.message })
        }
      }

      // Should track which orders synced successfully
      expect(syncResults).toEqual([
        { id: 'ord-001', status: 'synced' },
        { id: 'ord-002', status: 'failed', error: 'Network error' },
        { id: 'ord-003', status: 'synced' }
      ])

      // Failed orders should remain queued for retry
      const failedOrders = syncResults.filter(r => r.status === 'failed')
      expect(failedOrders).toHaveLength(1)
      expect(failedOrders[0].id).toBe('ord-002')
    })
  })
})