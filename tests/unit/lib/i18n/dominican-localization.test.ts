import { describe, it, expect, beforeEach } from 'vitest'
import { mockDominicanSpanish, validateDominicanTranslations } from '@/test/fixtures/i18n'

describe('Dominican Localization', () => {
  describe('Dominican Spanish Translations', () => {
    it('should contain all required Dominican Spanish keys', () => {
      const requiredKeys = [
        'app.name',
        'app.tagline', 
        'navigation.colmados',
        'colmados.title',
        'products.searchPlaceholder',
        'greetings.klk',
        'dominican.slang.klk'
      ]

      requiredKeys.forEach(key => {
        expect(mockDominicanSpanish).toHaveProperty(key)
      })
    })

    it('should use Dominican Spanish terminology', () => {
      // Check for Dominican-specific terms instead of general Spanish
      expect(mockDominicanSpanish.navigation.colmados).toBe('Colmados')
      expect(mockDominicanSpanish.colmados.title).toBe('Colmados Cercanos')
      
      // Should not use "tiendas" or "supermercados" as primary term
      expect(mockDominicanSpanish.navigation.colmados).not.toBe('Tiendas')
    })

    it('should include Dominican slang translations', () => {
      const slangTranslations = mockDominicanSpanish.dominican.slang
      
      expect(slangTranslations.klk).toBe('¿Qué tal?')
      expect(slangTranslations.loco).toBe('amigo/a')
      expect(slangTranslations.jevi).toBe('genial')
      expect(slangTranslations.brutal).toBe('excelente')
      expect(slangTranslations.manigua).toBe('lugar remoto')
      expect(slangTranslations.chin).toBe('un poco')
    })

    it('should have culturally appropriate greetings', () => {
      const greetings = mockDominicanSpanish.greetings
      
      expect(greetings.klk).toBe('¡Klk loco!')
      expect(greetings.queTal).toBe('¿Qué tal todo?')
      expect(greetings.welcomeBack).toBe('¡Bienvenido de vuelta!')
    })

    it('should use Dominican peso currency format', () => {
      const currency = mockDominicanSpanish.products.currency
      expect(currency).toBe('RD$')
      
      // Test currency formatting in context
      const deliveryFee = mockDominicanSpanish.cart.deliveryFee
      expect(deliveryFee).toContain('RD${{fee}}')
    })

    it('should include Dominican place names', () => {
      const places = mockDominicanSpanish.dominican.places
      
      expect(places.santodomingo).toBe('Santo Domingo')
      expect(places.santiago).toBe('Santiago')
      expect(places.puntacana).toBe('Punta Cana')
      expect(places.laromana).toBe('La Romana')
      expect(places.puertoplata).toBe('Puerto Plata')
    })

    it('should have appropriate time formats for Dominican culture', () => {
      // Dominican Republic uses 12-hour format typically
      const timeFormats = [
        mockDominicanSpanish.colmados.openUntil,
        mockDominicanSpanish.colmados.opensAt
      ]

      timeFormats.forEach(format => {
        expect(format).toContain('{{time}}')
        // Should support both formats but default to what Dominicans expect
        expect(format).not.toContain('24:00')
      })
    })

    it('should use familiar Dominican payment terms', () => {
      const paymentMethods = mockDominicanSpanish.payment.methods
      
      expect(paymentMethods.cash).toBe('Efectivo')
      expect(paymentMethods.tpago).toBe('tPago') // Dominican mobile payment
      expect(paymentMethods.digitalWallet).toBe('Billetera Digital')
    })
  })

  describe('Cultural Context Validation', () => {
    it('should validate cultural appropriateness of messages', () => {
      const testMessages = [
        'Klk tiguer, ¿cómo tú tá?',
        'Ey loco, ese colmado tá brutal',
        'Qué precio tan jevi tiene el pollo'
      ]

      testMessages.forEach(message => {
        expect(message).toContainDominicanSlang(['klk', 'tiguer', 'loco', 'tá', 'brutal', 'jevi'])
      })
    })

    it('should avoid inappropriate slang or offensive terms', () => {
      const appropriateMessages = [
        mockDominicanSpanish.greetings.klk,
        mockDominicanSpanish.greetings.queTal,
        mockDominicanSpanish.app.tagline
      ]

      appropriateMessages.forEach(message => {
        // Should not contain inappropriate terms
        expect(message.toLowerCase()).not.toContain('maldito')
        expect(message.toLowerCase()).not.toContain('jodido')
        expect(message.toLowerCase()).not.toContain('coño')
      })
    })

    it('should use inclusive language', () => {
      // Check that greetings don't assume gender
      expect(mockDominicanSpanish.greetings.welcome).toBe('¡Bienvenido!')
      expect(mockDominicanSpanish.greetings.welcomeBack).toBe('¡Bienvenido de vuelta!')
      
      // Note: In Spanish, default masculine form is grammatically correct and inclusive
      // But we should be mindful in contexts where we can be more specific
    })
  })

  describe('Dominican Business Context', () => {
    it('should use appropriate business terminology', () => {
      // Colmado is the preferred term over "tienda" or "supermercado"
      expect(mockDominicanSpanish.colmados.title).toContain('Colmados')
      
      // Should use "delivery" (borrowed from English) as it's commonly used
      expect(mockDominicanSpanish.colmados.services.delivery).toBe('Delivery')
      
      // Should use "pedido" for order, not "orden"
      expect(mockDominicanSpanish.orders.title).toBe('Mis Pedidos')
    })

    it('should reflect Dominican commerce practices', () => {
      // Cash-on-delivery is common in DR
      expect(mockDominicanSpanish.payment.cashOnDelivery).toBe('Pago contra entrega')
      
      // Pickup at store is also common
      expect(mockDominicanSpanish.cart.deliveryOptions.pickup).toBe('Recoger en tienda')
      
      // Phone contact is preferred
      expect(mockDominicanSpanish.auth.phone).toBe('Teléfono')
    })
  })

  describe('Voice Interface Localization', () => {
    it('should have appropriate voice command examples', () => {
      const voiceExamples = mockDominicanSpanish.voice.examples
      
      expect(voiceExamples.search).toBe('"Buscar arroz"')
      expect(voiceExamples.price).toBe('"¿Cuánto cuesta el pollo?"')
      expect(voiceExamples.colmado).toBe('"Colmado más cercano"')
      expect(voiceExamples.order).toBe('"Hacer un pedido"')
    })

    it('should provide helpful voice tips in Dominican Spanish', () => {
      const voiceTips = mockDominicanSpanish.voice.tips
      
      expect(voiceTips.clear).toBe('Habla claro y despacio')
      expect(voiceTips.quiet).toBe('Usa en un lugar silencioso')
      expect(voiceTips.close).toBe('Acércate al micrófono')
    })
  })

  describe('Error Messages', () => {
    it('should have user-friendly error messages in Dominican Spanish', () => {
      const errors = mockDominicanSpanish.errors
      
      expect(errors.network).toBe('Error de conexión. Verifica tu internet.')
      expect(errors.generic).toBe('Algo salió mal. Intenta de nuevo.')
      expect(errors.offline).toBe('Sin conexión a internet')
    })

    it('should use familiar terms for technical concepts', () => {
      // "Internet" is commonly used, not "red" or "conexión"
      expect(mockDominicanSpanish.errors.network).toContain('internet')
      expect(mockDominicanSpanish.errors.offline).toContain('internet')
    })
  })

  describe('Date and Number Formatting', () => {
    it('should support Dominican date formats', () => {
      // Test that date placeholders can handle DD/MM/YYYY format (common in DR)
      const dateFields = [
        mockDominicanSpanish.orders.placedOn,
        mockDominicanSpanish.profile.memberSince
      ]

      dateFields.forEach(field => {
        expect(field).toContain('{{date}}')
      })
    })

    it('should support Dominican number formatting', () => {
      // Dominican Republic uses periods for thousands, commas for decimals
      // e.g., 1.000,50 for one thousand point five
      const currencyString = 'RD$1.500,75'
      expect(currencyString).toBeValidCurrency('RD$')
    })
  })

  describe('Accessibility in Spanish', () => {
    it('should have proper screen reader labels', () => {
      // Alt text and labels should be in Spanish
      const accessibilityTerms = [
        mockDominicanSpanish.common.loading,
        mockDominicanSpanish.common.error,
        mockDominicanSpanish.common.success
      ]

      expect(accessibilityTerms[0]).toBe('Cargando...')
      expect(accessibilityTerms[1]).toBe('Error')
      expect(accessibilityTerms[2]).toBe('Éxito')
    })
  })
})

describe('Translation Validation Utils', () => {
  it('should validate translation completeness', () => {
    const result = validateDominicanTranslations(mockDominicanSpanish)
    
    expect(result.isComplete).toBe(true)
    expect(result.missingKeys).toEqual([])
    expect(result.emptyValues).toEqual([])
  })

  it('should detect missing cultural context', () => {
    const incompleteTrans = {
      greetings: {
        welcome: '¡Bienvenido!'
        // Missing Dominican-specific greetings
      }
    }

    const result = validateDominicanTranslations(incompleteTrans)
    expect(result.culturalGaps).toContain('dominican_greetings')
  })
})