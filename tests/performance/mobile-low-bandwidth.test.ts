import { test, expect, chromium, devices } from '@playwright/test'
import { readFileSync } from 'fs'
import path from 'path'

// Dominican mobile device profiles
const DOMINICAN_DEVICES = {
  lowEnd: {
    name: 'Dominican Low-End Android',
    userAgent: 'Mozilla/5.0 (Linux; Android 8.1.0; SM-J330F) AppleWebKit/537.36',
    viewport: { width: 360, height: 640 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    defaultBrowserType: 'chromium'
  },
  midRange: {
    name: 'Dominican Mid-Range Android',
    userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-A205F) AppleWebKit/537.36',
    viewport: { width: 393, height: 851 },
    deviceScaleFactor: 2.75,
    isMobile: true,
    hasTouch: true,
    defaultBrowserType: 'chromium'
  }
}

// Dominican network conditions
const DOMINICAN_NETWORKS = {
  '2G': {
    downloadThroughput: 56 * 1024 / 8, // 56 Kbps
    uploadThroughput: 14 * 1024 / 8,   // 14 Kbps
    latency: 300
  },
  '3G': {
    downloadThroughput: 500 * 1024 / 8, // 500 Kbps
    uploadThroughput: 150 * 1024 / 8,   // 150 Kbps
    latency: 100
  },
  '4G_weak': {
    downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
    uploadThroughput: 0.5 * 1024 * 1024 / 8,   // 0.5 Mbps
    latency: 50
  }
}

test.describe('Dominican Mobile Performance', () => {
  
  test.describe('Low-End Android Performance', () => {
    test.use({ ...DOMINICAN_DEVICES.lowEnd })

    test('App loads under 3 seconds on 2G network', async ({ page, context }) => {
      await context.route('**/*', async (route) => {
        // Simulate 2G network conditions
        await new Promise(resolve => setTimeout(resolve, 300)) // Latency
        await route.continue()
      })

      const startTime = Date.now()
      
      await page.goto('/', { waitUntil: 'networkidle' })
      
      const loadTime = Date.now() - startTime
      
      // Should load within 3 seconds even on 2G
      expect(loadTime).toBeLessThan(3000)
      
      // Core UI should be visible
      await expect(page.getByText('WhatsOpí')).toBeVisible()
      await expect(page.locator('[data-testid="main-navigation"]')).toBeVisible()
    })

    test('Voice interface responds quickly on low-end device', async ({ page }) => {
      await page.goto('/')
      
      // Mock voice API for consistent testing
      await page.addInitScript(() => {
        let recognition: any
        ;(window as any).webkitSpeechRecognition = class {
          continuous = false
          interimResults = false
          lang = 'es-DO'
          
          start() {
            recognition = this
            // Simulate processing delay on low-end device
            setTimeout(() => {
              this.onresult?.({
                results: [{
                  0: { transcript: 'busco pollo barato' },
                  isFinal: true
                }]
              })
            }, 800) // Should be under 1 second
          }
          
          stop() {}
          abort() {}
          addEventListener() {}
          removeEventListener() {}
        }
      })

      const startTime = Date.now()
      
      await page.click('[data-testid="voice-button"]')
      await expect(page.getByText('busco pollo barato')).toBeVisible()
      
      const responseTime = Date.now() - startTime
      
      // Voice recognition should respond within 1 second
      expect(responseTime).toBeLessThan(1000)
    })

    test('Memory usage stays within 512MB limit', async ({ page }) => {
      await page.goto('/')
      
      // Simulate heavy usage
      for (let i = 0; i < 10; i++) {
        await page.click('[data-testid="products-tab"]')
        await page.click('[data-testid="orders-tab"]')
        await page.click('[data-testid="profile-tab"]')
        await page.waitForTimeout(100)
      }
      
      // Check memory usage
      const memoryUsage = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0
      })
      
      // Should stay under 512MB (536,870,912 bytes)
      expect(memoryUsage).toBeLessThan(536870912)
    })
  })

  test.describe('Network Optimization', () => {
    test('Critical resources load first on 2G', async ({ browser }) => {
      const context = await browser.newContext(DOMINICAN_DEVICES.lowEnd)
      
      // Throttle network to 2G speeds
      const client = await context.newCDPSession(await context.newPage())
      await client.send('Network.enable')
      await client.send('Network.emulateNetworkConditions', DOMINICAN_NETWORKS['2G'])
      
      const page = context.pages()[0]
      const loadTimes: Record<string, number> = {}
      
      page.on('response', response => {
        loadTimes[response.url()] = Date.now()
      })
      
      const startTime = Date.now()
      await page.goto('/')
      
      // Critical CSS should load first
      const criticalCssTime = loadTimes[page.url() + 'critical.css'] - startTime
      expect(criticalCssTime).toBeLessThan(1000)
      
      // Main app should be interactive within 2 seconds
      await expect(page.locator('[data-testid="app-shell"]')).toBeVisible()
      const interactiveTime = Date.now() - startTime
      expect(interactiveTime).toBeLessThan(2000)
      
      await context.close()
    })

    test('Images optimize for Dominican bandwidth', async ({ page, context }) => {
      const imageRequests: string[] = []
      
      page.on('request', request => {
        if (request.resourceType() === 'image') {
          imageRequests.push(request.url())
        }
      })
      
      await page.goto('/')
      await page.click('[data-testid="products-tab"]')
      
      // Wait for images to load
      await page.waitForTimeout(2000)
      
      // Check that images are optimized
      for (const imageUrl of imageRequests) {
        // Should use WebP format for better compression
        expect(imageUrl).toMatch(/\.(webp|avif)$/i)
        
        // Should include size parameters for responsive images
        expect(imageUrl).toMatch(/[?&]w=\d+/)
      }
    })

    test('API responses compress for bandwidth efficiency', async ({ page }) => {
      const apiResponses: any[] = []
      
      page.on('response', response => {
        if (response.url().includes('/api/')) {
          apiResponses.push({
            url: response.url(),
            size: parseInt(response.headers()['content-length'] || '0'),
            encoding: response.headers()['content-encoding']
          })
        }
      })
      
      await page.goto('/')
      await page.click('[data-testid="products-tab"]')
      
      // Wait for API calls
      await page.waitForTimeout(1000)
      
      for (const response of apiResponses) {
        // API responses should be compressed
        expect(response.encoding).toMatch(/gzip|br|deflate/)
        
        // Product list should be under 50KB compressed
        if (response.url.includes('/products')) {
          expect(response.size).toBeLessThan(50000)
        }
      }
    })
  })

  test.describe('PWA Performance', () => {
    test('Service worker caches effectively for offline use', async ({ page, context }) => {
      // First visit - populate cache
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      
      // Simulate offline
      await context.setOffline(true)
      
      // Should still load from cache
      const startTime = Date.now()
      await page.reload()
      const loadTime = Date.now() - startTime
      
      // Should load from cache within 500ms
      expect(loadTime).toBeLessThan(500)
      
      await expect(page.getByText('WhatsOpí')).toBeVisible()
      await expect(page.getByText('Sin conexión')).toBeVisible()
    })

    test('Background sync works efficiently', async ({ page, context }) => {
      await page.goto('/')
      
      // Create offline order
      await context.setOffline(true)
      await page.click('[data-testid="new-order"]')
      await page.fill('[data-testid="customer-name"]', 'Test Customer')
      await page.click('[data-testid="save-order"]')
      
      // Should queue for sync
      await expect(page.getByText('Guardado para sincronizar')).toBeVisible()
      
      // Go online and measure sync time
      const syncStartTime = Date.now()
      await context.setOffline(false)
      
      await expect(page.getByText('Sincronizado')).toBeVisible()
      const syncTime = Date.now() - syncStartTime
      
      // Sync should complete within 2 seconds
      expect(syncTime).toBeLessThan(2000)
    })
  })

  test.describe('Dominican Business Hours Load Testing', () => {
    test('Handles peak traffic (6-8 PM Dominican time)', async ({ page }) => {
      // Simulate concurrent users during peak hours
      const concurrentRequests = 50
      const requests = []
      
      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(
          page.request.get('/api/products')
        )
      }
      
      const startTime = Date.now()
      const responses = await Promise.all(requests)
      const totalTime = Date.now() - startTime
      
      // All requests should complete within 5 seconds
      expect(totalTime).toBeLessThan(5000)
      
      // All responses should be successful
      for (const response of responses) {
        expect(response.status()).toBe(200)
      }
      
      // Average response time should be under 100ms
      const avgResponseTime = totalTime / concurrentRequests
      expect(avgResponseTime).toBeLessThan(100)
    })

    test('Database queries optimize for Dominican product catalog', async ({ page }) => {
      let queryCount = 0
      let totalQueryTime = 0
      
      page.on('response', response => {
        if (response.url().includes('/api/')) {
          const timing = response.headers()['server-timing']
          if (timing && timing.includes('db;dur=')) {
            queryCount++
            const duration = parseFloat(timing.match(/db;dur=(\d+\.?\d*)/)?.[1] || '0')
            totalQueryTime += duration
          }
        }
      })
      
      await page.goto('/')
      await page.click('[data-testid="search-input"]')
      await page.fill('[data-testid="search-input"]', 'pollo')
      await page.press('[data-testid="search-input"]', 'Enter')
      
      await page.waitForTimeout(1000)
      
      // Database queries should be optimized
      expect(queryCount).toBeGreaterThan(0)
      const avgQueryTime = totalQueryTime / queryCount
      expect(avgQueryTime).toBeLessThan(50) // Under 50ms per query
    })
  })

  test.describe('Voice Processing Performance', () => {
    test('Dominican Spanish processing stays under 2 seconds', async ({ browser }) => {
      const context = await browser.newContext()
      const page = await context.newPage()
      
      // Mock voice input with Dominican Spanish
      await page.addInitScript(() => {
        ;(window as any).webkitSpeechRecognition = class {
          start() {
            setTimeout(() => {
              this.onresult?.({
                results: [{
                  0: { transcript: 'Klk tiguer, busco pollo barato en el colmado', confidence: 0.95 },
                  isFinal: true
                }]
              })
            }, 100)
          }
          stop() {}
          addEventListener() {}
          removeEventListener() {}
        }
      })
      
      await page.goto('/')
      
      const startTime = Date.now()
      await page.click('[data-testid="voice-search"]')
      
      // Wait for AI processing
      await expect(page.getByText('Encontré productos')).toBeVisible()
      
      const processingTime = Date.now() - startTime
      
      // Voice + AI processing should complete within 2 seconds
      expect(processingTime).toBeLessThan(2000)
      
      await context.close()
    })

    test('Haitian Creole translation performance', async ({ page }) => {
      await page.goto('/')
      
      // Mock Creole voice input
      await page.addInitScript(() => {
        ;(window as any).webkitSpeechRecognition = class {
          start() {
            setTimeout(() => {
              this.onresult?.({
                results: [{
                  0: { transcript: 'Mwen bezwen achte diri ak pwa', confidence: 0.92 },
                  isFinal: true
                }]
              })
            }, 100)
          }
          stop() {}
          addEventListener() {}
          removeEventListener() {}
        }
      })
      
      const startTime = Date.now()
      await page.click('[data-testid="voice-search"]')
      
      // Should detect language and translate
      await expect(page.getByText('Traducido del criollo')).toBeVisible()
      await expect(page.getByText('Necesito comprar arroz')).toBeVisible()
      
      const translationTime = Date.now() - startTime
      
      // Translation should complete within 3 seconds
      expect(translationTime).toBeLessThan(3000)
    })
  })

  test.describe('Battery Optimization', () => {
    test('Background tasks minimize battery drain', async ({ page }) => {
      await page.goto('/')
      
      // Monitor background activity
      const backgroundTasks = await page.evaluate(() => {
        let taskCount = 0
        const originalSetInterval = setInterval
        const originalSetTimeout = setTimeout
        
        ;(window as any).setInterval = function(...args: any[]) {
          taskCount++
          return originalSetInterval.apply(this, args)
        }
        
        ;(window as any).setTimeout = function(...args: any[]) {
          if (args[1] > 1000) taskCount++ // Only count long-running tasks
          return originalSetTimeout.apply(this, args)
        }
        
        return new Promise(resolve => {
          setTimeout(() => resolve(taskCount), 5000)
        })
      })
      
      // Background tasks should be minimal to preserve battery
      expect(backgroundTasks).toBeLessThan(5)
    })

    test('Location services used efficiently', async ({ page, context }) => {
      await context.grantPermissions(['geolocation'])
      await context.setGeolocation({
        latitude: 18.4861, // Santo Domingo
        longitude: -69.9312
      })
      
      let locationRequests = 0
      
      page.on('console', msg => {
        if (msg.text().includes('geolocation')) {
          locationRequests++
        }
      })
      
      await page.goto('/')
      await page.click('[data-testid="find-nearby-stores"]')
      
      await page.waitForTimeout(2000)
      
      // Should only request location once, not continuously
      expect(locationRequests).toBeLessThanOrEqual(1)
    })
  })
})

test.describe('Performance Budgets', () => {
  test('JavaScript bundle size stays under budget', async ({ page }) => {
    const bundleSize = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[src]'))
      return Promise.all(
        scripts.map(script => 
          fetch((script as HTMLScriptElement).src)
            .then(response => response.blob())
            .then(blob => blob.size)
        )
      ).then(sizes => sizes.reduce((total, size) => total + size, 0))
    })
    
    // Total JS bundle should be under 500KB
    expect(bundleSize).toBeLessThan(500000)
  })

  test('CSS bundle optimized for Dominican mobile', async ({ page }) => {
    const cssSize = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      return Promise.all(
        links.map(link => 
          fetch((link as HTMLLinkElement).href)
            .then(response => response.blob())
            .then(blob => blob.size)
        )
      ).then(sizes => sizes.reduce((total, size) => total + size, 0))
    })
    
    // CSS should be under 100KB
    expect(cssSize).toBeLessThan(100000)
  })

  test('Total page weight optimized for 2G networks', async ({ page }) => {
    const resourceSizes = await page.evaluate(() => {
      return (performance as any).getEntriesByType('resource')
        .reduce((total: number, resource: any) => total + (resource.transferSize || 0), 0)
    })
    
    // Total page weight should be under 1MB for initial load
    expect(resourceSizes).toBeLessThan(1000000)
  })
})

test.describe('Real User Monitoring Simulation', () => {
  test('Measures Core Web Vitals for Dominican users', async ({ page }) => {
    await page.goto('/')
    
    const webVitals = await page.evaluate(() => {
      return new Promise(resolve => {
        const vitals: any = {}
        
        // Largest Contentful Paint
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]
          vitals.lcp = lastEntry.startTime
        }).observe({ entryTypes: ['largest-contentful-paint'] })
        
        // First Input Delay
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach(entry => {
            if (entry.name === 'first-input') {
              vitals.fid = (entry as any).processingStart - entry.startTime
            }
          })
        }).observe({ entryTypes: ['first-input'] })
        
        // Cumulative Layout Shift
        let cumulativeScore = 0
        new PerformanceObserver((list) => {
          list.getEntries().forEach(entry => {
            if (!(entry as any).hadRecentInput) {
              cumulativeScore += (entry as any).value
            }
          })
          vitals.cls = cumulativeScore
        }).observe({ entryTypes: ['layout-shift'] })
        
        setTimeout(() => resolve(vitals), 3000)
      })
    })
    
    const { lcp, fid, cls } = webVitals as any
    
    // Core Web Vitals thresholds for good user experience
    if (lcp) expect(lcp).toBeLessThan(2500) // LCP under 2.5s
    if (fid) expect(fid).toBeLessThan(100)  // FID under 100ms
    if (cls) expect(cls).toBeLessThan(0.1)  // CLS under 0.1
  })
})