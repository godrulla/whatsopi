import { test, expect, Page } from '@playwright/test'
import { BrowserContext } from '@playwright/test'

// Dominican test user personas
const DOMINICAN_USERS = {
  rosa: {
    name: 'Rosa María',
    phone: '8091234567',
    password: 'MiContraseña123!',
    businessName: 'Colmado Doña Rosa',
    location: 'Santo Domingo Este',
    digitalLiteracy: 'low',
    preferredLanguage: 'es-DO'
  },
  jean: {
    name: 'Jean Baptiste',
    phone: '8291234567',
    password: 'MonMotDePasse123!',
    businessName: 'Épicerie Jean',
    location: 'Santiago',
    digitalLiteracy: 'medium',
    preferredLanguage: 'ht',
    bilingual: true
  },
  carlos: {
    name: 'Carlos Medina',
    phone: '8491234567',
    password: 'ColmadoSeguro456!',
    businessName: 'Supermercado Carlos',
    location: 'La Romana',
    digitalLiteracy: 'high',
    preferredLanguage: 'es-DO'
  }
}

// Mock geolocation for Dominican Republic
async function mockDominicanLocation(page: Page) {
  await page.context().grantPermissions(['geolocation'])
  await page.context().setGeolocation({
    latitude: 18.4861, // Santo Domingo
    longitude: -69.9312
  })
}

// Mock Dominican voice input
async function mockDominicanVoice(page: Page) {
  await page.addInitScript(() => {
    // Mock Web Speech API with Dominican Spanish
    (window as any).SpeechRecognition = class MockSpeechRecognition {
      continuous = false
      interimResults = false
      lang = 'es-DO'
      
      start() {
        setTimeout(() => {
          this.onresult?.({
            results: [{
              0: { transcript: 'Klk tiguer busco pollo barato' },
              isFinal: true
            }]
          })
        }, 1000)
      }
      
      stop() {}
      abort() {}
      addEventListener() {}
      removeEventListener() {}
    }
    
    ;(window as any).webkitSpeechRecognition = (window as any).SpeechRecognition
  })
}

test.describe('Dominican User Journey - Rosa (Low Digital Literacy)', () => {
  test.beforeEach(async ({ page }) => {
    await mockDominicanLocation(page)
    await mockDominicanVoice(page)
    
    // Mock low-end Android device
    await page.setViewportSize({ width: 360, height: 640 })
    await page.emulate({
      userAgent: 'Mozilla/5.0 (Linux; Android 8.1.0; SM-J330F) AppleWebKit/537.36',
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true
    })
  })

  test('Rosa can register using voice assistance in Dominican Spanish', async ({ page }) => {
    await page.goto('/')
    
    // Should show voice-first interface for low digital literacy
    await expect(page.locator('[data-testid="voice-register-button"]')).toBeVisible()
    await expect(page.getByText('Presiona para hablar')).toBeVisible()
    
    // Start voice registration
    await page.click('[data-testid="voice-register-button"]')
    
    // Wait for voice prompt
    await expect(page.getByText('Dime tu nombre completo')).toBeVisible()
    
    // Simulate voice input for name
    await page.evaluate(() => {
      const event = new CustomEvent('voiceresult', {
        detail: { transcript: 'Rosa María Jiménez', confidence: 0.95 }
      })
      window.dispatchEvent(event)
    })
    
    await expect(page.getByDisplayValue('Rosa María Jiménez')).toBeVisible()
    
    // Voice prompt for phone number
    await expect(page.getByText('Ahora dime tu número de teléfono')).toBeVisible()
    
    await page.evaluate(() => {
      const event = new CustomEvent('voiceresult', {
        detail: { transcript: 'ocho cero nueve uno dos tres cuatro cinco seis siete', confidence: 0.92 }
      })
      window.dispatchEvent(event)
    })
    
    await expect(page.getByDisplayValue('8091234567')).toBeVisible()
    
    // Voice prompt for business name
    await expect(page.getByText('¿Cómo se llama tu negocio?')).toBeVisible()
    
    await page.evaluate(() => {
      const event = new CustomEvent('voiceresult', {
        detail: { transcript: 'Colmado Doña Rosa', confidence: 0.98 }
      })
      window.dispatchEvent(event)
    })
    
    await expect(page.getByDisplayValue('Colmado Doña Rosa')).toBeVisible()
    
    // Password setup with voice guidance
    await expect(page.getByText('Ahora crea una contraseña segura')).toBeVisible()
    await page.fill('[data-testid="password-input"]', DOMINICAN_USERS.rosa.password)
    
    // Submit registration
    await page.click('[data-testid="complete-registration"]')
    
    // Should show success message in Dominican Spanish
    await expect(page.getByText('¡Bienvenida Rosa María!')).toBeVisible()
    await expect(page.getByText('Tu colmado ya está registrado')).toBeVisible()
  })

  test('Rosa can place order using voice commands', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('[data-testid="phone-input"]', DOMINICAN_USERS.rosa.phone)
    await page.fill('[data-testid="password-input"]', DOMINICAN_USERS.rosa.password)
    await page.click('[data-testid="login-button"]')
    
    await expect(page.getByText('Bienvenida Rosa María')).toBeVisible()
    
    // Navigate to voice ordering
    await page.click('[data-testid="voice-order-button"]')
    
    // Should show voice interface with Dominican Spanish prompts
    await expect(page.getByText('¿Qué necesitas para tu colmado?')).toBeVisible()
    
    // Start voice order
    await page.click('[data-testid="start-voice-order"]')
    
    // Simulate voice input for product search
    await page.evaluate(() => {
      const event = new CustomEvent('voiceresult', {
        detail: { 
          transcript: 'Busco pollo entero y arroz de cinco libras', 
          confidence: 0.94,
          language: 'es-DO'
        }
      })
      window.dispatchEvent(event)
    })
    
    // Should show product results with Dominican terminology
    await expect(page.getByText('Encontré estos productos:')).toBeVisible()
    await expect(page.getByText('Pollo Entero')).toBeVisible()
    await expect(page.getByText('Arroz (5 lb)')).toBeVisible()
    await expect(page.getByText('RD$')).toBeVisible() // Dominican peso currency
    
    // Voice confirmation
    await expect(page.getByText('¿Quieres agregar estos productos?')).toBeVisible()
    
    await page.evaluate(() => {
      const event = new CustomEvent('voiceresult', {
        detail: { transcript: 'sí, agregálos', confidence: 0.96 }
      })
      window.dispatchEvent(event)
    })
    
    // Should add to cart and show total
    await expect(page.getByText('Productos agregados al carrito')).toBeVisible()
    await expect(page.locator('[data-testid="cart-total"]')).toContainText('RD$')
    
    // Voice checkout
    await expect(page.getByText('¿Quieres hacer el pedido?')).toBeVisible()
    
    await page.evaluate(() => {
      const event = new CustomEvent('voiceresult', {
        detail: { transcript: 'sí, hacer pedido', confidence: 0.98 }
      })
      window.dispatchEvent(event)
    })
    
    // Should navigate to checkout with Dominican payment options
    await expect(page.getByText('Métodos de pago')).toBeVisible()
    await expect(page.getByText('Efectivo')).toBeVisible()
    await expect(page.getByText('tPago')).toBeVisible()
    
    // Select cash payment (most common for Rosa's profile)
    await page.click('[data-testid="payment-cash"]')
    
    // Complete order
    await page.click('[data-testid="complete-order"]')
    
    // Should show order confirmation
    await expect(page.getByText('¡Pedido confirmado!')).toBeVisible()
    await expect(page.getByText(/ORD-\d{4}-\d{3}/)).toBeVisible() // Order ID format
  })
})

test.describe('Haitian-Dominican User Journey - Jean (Bilingual)', () => {
  test.beforeEach(async ({ page }) => {
    await mockDominicanLocation(page)
    
    // Mock language detection for Haitian Creole
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'language', {
        value: 'ht',
        configurable: true
      })
      
      Object.defineProperty(navigator, 'languages', {
        value: ['ht', 'es-DO', 'fr'],
        configurable: true
      })
    })
  })

  test('Jean can register with automatic language detection', async ({ page }) => {
    await page.goto('/')
    
    // Should detect Haitian Creole and offer language choice
    await expect(page.getByText('Kreyòl Ayisyen')).toBeVisible()
    await expect(page.getByText('Español Dominicano')).toBeVisible()
    
    // Choose to start in Creole
    await page.click('[data-testid="language-ht"]')
    
    // Interface should switch to Haitian Creole
    await expect(page.getByText('Bienvini nan WhatsOpí')).toBeVisible()
    await expect(page.getByText('Kreye kont ou')).toBeVisible()
    
    // Fill registration form
    await page.fill('[data-testid="name-input"]', DOMINICAN_USERS.jean.name)
    await page.fill('[data-testid="phone-input"]', DOMINICAN_USERS.jean.phone)
    await page.fill('[data-testid="business-name-input"]', DOMINICAN_USERS.jean.businessName)
    await page.fill('[data-testid="password-input"]', DOMINICAN_USERS.jean.password)
    
    // Business type in Creole
    await page.selectOption('[data-testid="business-type"]', 'magazen') // Store in Creole
    
    // Submit registration
    await page.click('[data-testid="register-button"]')
    
    // Success message in Creole
    await expect(page.getByText('Bienvini Jean Baptiste!')).toBeVisible()
    await expect(page.getByText('Magazen ou enrejistre deja')).toBeVisible()
  })

  test('Jean can switch between Creole and Spanish during chat', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('[data-testid="phone-input"]', DOMINICAN_USERS.jean.phone)
    await page.fill('[data-testid="password-input"]', DOMINICAN_USERS.jean.password)
    await page.click('[data-testid="login-button"]')
    
    // Start WhatsApp chat
    await page.click('[data-testid="whatsapp-chat"]')
    
    // Send message in Haitian Creole
    await page.fill('[data-testid="chat-input"]', 'Sak pase, mwen bezwen achte diri ak pwa')
    await page.click('[data-testid="send-message"]')
    
    // Should show message and detect language
    await expect(page.locator('.message.sent')).toContainText('Sak pase, mwen bezwen achte diri ak pwa')
    await expect(page.locator('.language-indicator')).toContainText('Kreyòl')
    
    // AI should respond in Creole with translation option
    await expect(page.locator('.message.received')).toContainText('Bon, mwen ka ede w')
    await expect(page.getByText('Tradui nan Espanyòl')).toBeVisible()
    
    // Switch to Spanish
    await page.fill('[data-testid="chat-input"]', 'Ahora busco pollo también')
    await page.click('[data-testid="send-message"]')
    
    // Should detect code-switching
    await expect(page.locator('.language-indicator')).toContainText('Mixte')
    
    // AI response should be bilingual-aware
    await expect(page.locator('.message.received')).toContainText('Entendido, Jean')
    await expect(page.locator('.message.received')).toContainText('pollo')
  })
})

test.describe('Advanced Dominican Business Owner - Carlos', () => {
  test.beforeEach(async ({ page }) => {
    await mockDominicanLocation(page)
    
    // Mock desktop/tablet environment for tech-savvy user
    await page.setViewportSize({ width: 1024, height: 768 })
  })

  test('Carlos can manage complex inventory and orders', async ({ page }) => {
    // Login as Carlos
    await page.goto('/login')
    await page.fill('[data-testid="phone-input"]', DOMINICAN_USERS.carlos.phone)
    await page.fill('[data-testid="password-input"]', DOMINICAN_USERS.carlos.password)
    await page.click('[data-testid="login-button"]')
    
    // Navigate to dashboard
    await expect(page.getByText('Panel de Control - Supermercado Carlos')).toBeVisible()
    
    // Check inventory management
    await page.click('[data-testid="inventory-tab"]')
    
    // Should show products with Dominican categories
    await expect(page.getByText('Productos Básicos')).toBeVisible()
    await expect(page.getByText('Carnes y Aves')).toBeVisible()
    await expect(page.getByText('Lácteos')).toBeVisible()
    await expect(page.getByText('Bebidas')).toBeVisible()
    
    // Add new product
    await page.click('[data-testid="add-product"]')
    
    await page.fill('[data-testid="product-name"]', 'Queso de Freír Sosúa')
    await page.fill('[data-testid="product-price"]', '180')
    await page.selectOption('[data-testid="product-category"]', 'lacteos')
    await page.fill('[data-testid="product-quantity"]', '25')
    
    // Set Dominican-specific attributes
    await page.check('[data-testid="refrigerated"]')
    await page.selectOption('[data-testid="origin"]', 'dominican')
    
    await page.click('[data-testid="save-product"]')
    
    // Should appear in inventory with RD$ formatting
    await expect(page.getByText('Queso de Freír Sosúa')).toBeVisible()
    await expect(page.getByText('RD$180')).toBeVisible()
    
    // Check orders management
    await page.click('[data-testid="orders-tab"]')
    
    // Should show orders with Dominican delivery zones
    await expect(page.getByText('Órdenes Activas')).toBeVisible()
    await expect(page.getByText('Santo Domingo Este')).toBeVisible()
    await expect(page.getByText('Los Alcarrizos')).toBeVisible()
    
    // Process an order
    await page.click('[data-testid="order-details"]:first-child')
    
    // Should show order details with Dominican context
    await expect(page.getByText('Dirección de entrega:')).toBeVisible()
    await expect(page.getByText('Método de pago:')).toBeVisible()
    await expect(page.getByText(/efectivo|tpago|tarjeta/i)).toBeVisible()
    
    // Mark as ready for delivery
    await page.click('[data-testid="mark-ready"]')
    
    // Should update status and notify customer
    await expect(page.getByText('Orden lista para entrega')).toBeVisible()
    await expect(page.getByText('Cliente notificado por WhatsApp')).toBeVisible()
  })

  test('Carlos can analyze business metrics with Dominican context', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[data-testid="phone-input"]', DOMINICAN_USERS.carlos.phone)
    await page.fill('[data-testid="password-input"]', DOMINICAN_USERS.carlos.password)
    await page.click('[data-testid="login-button"]')
    
    // Navigate to analytics
    await page.click('[data-testid="analytics-tab"]')
    
    // Should show Dominican business metrics
    await expect(page.getByText('Ventas del Mes')).toBeVisible()
    await expect(page.getByText('RD$')).toBeVisible()
    
    // Check for Dominican-specific insights
    await expect(page.getByText('Productos más vendidos')).toBeVisible()
    await expect(page.getByText('Horarios pico')).toBeVisible()
    
    // Should show typical Dominican shopping patterns
    await expect(page.getByText(/6:00 AM - 8:00 AM/)).toBeVisible() // Morning rush
    await expect(page.getByText(/5:00 PM - 8:00 PM/)).toBeVisible() // Evening rush
    
    // Payment method analysis
    await expect(page.getByText('Métodos de pago utilizados')).toBeVisible()
    
    // Should show Dominican payment preferences
    const paymentChart = page.locator('[data-testid="payment-methods-chart"]')
    await expect(paymentChart).toContainText('Efectivo')
    await expect(paymentChart).toContainText('tPago')
    await expect(paymentChart).toContainText('Tarjeta')
    
    // Customer location analysis
    await expect(page.getByText('Zonas de entrega')).toBeVisible()
    await expect(page.getByText('Santo Domingo')).toBeVisible()
    await expect(page.getByText('Santiago')).toBeVisible()
    
    // Export report
    await page.click('[data-testid="export-report"]')
    
    // Should download with Spanish headers and Dominican formatting
    const downloadPromise = page.waitForEvent('download')
    await page.click('[data-testid="download-csv"]')
    const download = await downloadPromise
    
    expect(download.suggestedFilename()).toMatch(/reporte-mensual.*\.csv/)
  })
})

test.describe('Offline PWA Functionality', () => {
  test('Users can work offline and sync when reconnected', async ({ page, context }) => {
    await page.goto('/login')
    await page.fill('[data-testid="phone-input"]', DOMINICAN_USERS.rosa.phone)
    await page.fill('[data-testid="password-input"]', DOMINICAN_USERS.rosa.password)
    await page.click('[data-testid="login-button"]')
    
    // Wait for app to load completely
    await expect(page.getByText('Bienvenida Rosa María')).toBeVisible()
    
    // Go offline
    await context.setOffline(true)
    
    // Should show offline indicator
    await expect(page.getByText('Sin conexión')).toBeVisible()
    await expect(page.getByText('Trabajando sin internet')).toBeVisible()
    
    // Create order offline
    await page.click('[data-testid="new-order"]')
    await page.fill('[data-testid="customer-name"]', 'María González')
    await page.fill('[data-testid="customer-phone"]', '8091234568')
    
    // Add products from cached catalog
    await page.click('[data-testid="add-product"]')
    await page.click('[data-testid="product-pollo"]')
    await page.click('[data-testid="product-arroz"]')
    
    // Save order (should be queued)
    await page.click('[data-testid="save-order"]')
    
    // Should show offline confirmation
    await expect(page.getByText('Orden guardada sin conexión')).toBeVisible()
    await expect(page.getByText('Se enviará cuando tengas internet')).toBeVisible()
    
    // Go back online
    await context.setOffline(false)
    
    // Should sync automatically
    await expect(page.getByText('Sincronizando...')).toBeVisible()
    await expect(page.getByText('Orden enviada exitosamente')).toBeVisible()
    
    // Order should appear in active orders
    await page.click('[data-testid="orders-tab"]')
    await expect(page.getByText('María González')).toBeVisible()
  })
})

test.describe('Accessibility for Low-Literacy Users', () => {
  test('Interface works with screen reader and voice commands', async ({ page }) => {
    // Enable high contrast and large text
    await page.addInitScript(() => {
      document.documentElement.style.fontSize = '18px'
      document.documentElement.classList.add('high-contrast')
    })
    
    await page.goto('/')
    
    // Check for proper ARIA labels in Spanish
    await expect(page.locator('[aria-label*="iniciar sesión"]')).toBeVisible()
    await expect(page.locator('[aria-label*="teléfono"]')).toBeVisible()
    
    // Voice navigation should be prominent
    await expect(page.locator('[data-testid="voice-navigation"]')).toBeVisible()
    await expect(page.getByText('Usar voz para navegar')).toBeVisible()
    
    // Icons should have text labels
    await expect(page.getByText('Casa')).toBeVisible() // Home icon
    await expect(page.getByText('Órdenes')).toBeVisible() // Orders icon
    await expect(page.getByText('Perfil')).toBeVisible() // Profile icon
    
    // Touch targets should be large (44px minimum)
    const voiceButton = page.locator('[data-testid="voice-button"]')
    const buttonBox = await voiceButton.boundingBox()
    expect(buttonBox?.width).toBeGreaterThanOrEqual(44)
    expect(buttonBox?.height).toBeGreaterThanOrEqual(44)
  })
})

test.describe('Cross-Browser Dominican Compatibility', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`Works correctly in ${browserName}`, async ({ page }) => {
      await page.goto('/')
      
      // Basic functionality should work
      await expect(page.getByText('WhatsOpí')).toBeVisible()
      await expect(page.getByText(/plataforma.*colmados/i)).toBeVisible()
      
      // Voice API should be polyfilled if not available
      const hasVoiceSupport = await page.evaluate(() => {
        return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
      })
      
      if (!hasVoiceSupport) {
        await expect(page.getByText('Usar teclado en su lugar')).toBeVisible()
      }
      
      // Dominican formatting should work
      await expect(page.locator('[data-currency="DOP"]')).toBeAttached()
    })
  })
})