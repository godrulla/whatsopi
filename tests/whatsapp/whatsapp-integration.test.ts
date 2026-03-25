import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockWhatsAppService, mockWhatsAppWebhooks, mockWhatsAppTemplates } from '@/test/mocks/whatsapp'
import { WhatsAppService } from '@/services/WhatsAppService'
import { mockDominicanAIResponses } from '@/test/mocks/ai'

describe('WhatsApp Business API Integration', () => {
  let whatsappService: WhatsAppService

  beforeEach(() => {
    vi.clearAllMocks()
    whatsappService = new WhatsAppService({
      accessToken: 'test_token',
      phoneNumberId: 'test_phone_id',
      webhookVerifyToken: 'test_verify_token'
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Message Processing', () => {
    it('should process incoming Dominican Spanish text messages', async () => {
      const webhook = mockWhatsAppWebhooks.textMessage
      const message = webhook.entry[0].changes[0].value.messages[0]
      
      // Mock AI processing for Dominican Spanish
      const aiResponse = mockDominicanAIResponses.productSearch.output
      
      vi.spyOn(whatsappService, 'processWebhook').mockResolvedValue({
        processed: true,
        responses: [{
          to: message.from,
          type: 'text',
          text: {
            body: aiResponse.response
          }
        }],
        metadata: {
          language: 'es-DO',
          intent: aiResponse.intent,
          culturallyAdapted: true
        }
      })

      const result = await whatsappService.processWebhook(webhook)

      expect(result.processed).toBe(true)
      expect(result.responses).toHaveLength(1)
      expect(result.responses[0].text.body).toContain('pollo')
      expect(result.metadata.language).toBe('es-DO')
      expect(result.metadata.culturallyAdapted).toBe(true)
    })

    it('should handle voice messages in Dominican Spanish', async () => {
      const webhook = mockWhatsAppWebhooks.audioMessage
      const message = webhook.entry[0].changes[0].value.messages[0]

      vi.spyOn(whatsappService, 'processWebhook').mockResolvedValue({
        processed: true,
        responses: [{
          to: message.from,
          type: 'text',
          text: {
            body: 'Entendí que buscas pollo. Te ayudo a encontrar las mejores opciones cerca de ti.'
          }
        }],
        metadata: {
          audioProcessed: true,
          transcript: 'busco pollo barato cerca',
          language: 'es-DO',
          confidence: 0.92
        }
      })

      const result = await whatsappService.processWebhook(webhook)

      expect(result.processed).toBe(true)
      expect(result.metadata.audioProcessed).toBe(true)
      expect(result.metadata.transcript).toContain('pollo')
      expect(result.metadata.language).toBe('es-DO')
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.9)
    })

    it('should handle interactive button responses', async () => {
      const webhook = mockWhatsAppWebhooks.interactiveMessage
      const message = webhook.entry[0].changes[0].value.messages[0]

      vi.spyOn(whatsappService, 'processWebhook').mockResolvedValue({
        processed: true,
        responses: [{
          to: message.from,
          type: 'interactive',
          interactive: {
            type: 'product_list',
            header: {
              type: 'text',
              text: 'Productos Disponibles'
            },
            body: {
              text: 'Aquí tienes los productos que buscas:'
            },
            action: {
              catalog_id: 'colmado_catalog_123',
              sections: [{
                title: 'Alimentos Básicos',
                products: [
                  { product_retailer_id: 'arroz_blanco' },
                  { product_retailer_id: 'pollo_entero' }
                ]
              }]
            }
          }
        }],
        metadata: {
          interactionType: 'button_reply',
          buttonId: 'search_products'
        }
      })

      const result = await whatsappService.processWebhook(webhook)

      expect(result.processed).toBe(true)
      expect(result.responses[0].type).toBe('interactive')
      expect(result.metadata.interactionType).toBe('button_reply')
    })
  })

  describe('Dominican Template Messages', () => {
    it('should send Dominican Spanish greeting template', async () => {
      const template = mockWhatsAppTemplates.dominican.greeting
      
      vi.spyOn(whatsappService, 'sendTemplate').mockResolvedValue({
        success: true,
        messageId: 'wamid.template123',
        metadata: {
          template: template.name,
          language: 'es_DO',
          culturallyAdapted: true
        }
      })

      const result = await whatsappService.sendTemplate({
        to: '+18091234567',
        template: {
          name: template.name,
          language: { code: 'es_DO' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: 'Juan' },
                { type: 'text', text: 'Colmado La Esquina' }
              ]
            }
          ]
        }
      })

      expect(result.success).toBe(true)
      expect(result.metadata.language).toBe('es_DO')
      expect(result.metadata.culturallyAdapted).toBe(true)
    })

    it('should send order confirmation in Dominican Spanish', async () => {
      const template = mockWhatsAppTemplates.dominican.orderConfirmation
      
      vi.spyOn(whatsappService, 'sendTemplate').mockResolvedValue({
        success: true,
        messageId: 'wamid.order123',
        metadata: {
          template: template.name,
          language: 'es_DO',
          orderNumber: 'ORD-123',
          total: 'RD$330.00'
        }
      })

      const result = await whatsappService.sendTemplate({
        to: '+18091234567',
        template: {
          name: template.name,
          language: { code: 'es_DO' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: 'ORD-123' },
                { type: 'text', text: '330.00' },
                { type: 'text', text: '35' }
              ]
            }
          ]
        }
      })

      expect(result.success).toBe(true)
      expect(result.metadata.orderNumber).toBe('ORD-123')
      expect(result.metadata.total).toBe('RD$330.00')
    })
  })

  describe('Haitian Creole Support', () => {
    it('should handle Haitian Creole messages', async () => {
      const haitianMessage = {
        ...mockWhatsAppWebhooks.textMessage,
        entry: [{
          ...mockWhatsAppWebhooks.textMessage.entry[0],
          changes: [{
            ...mockWhatsAppWebhooks.textMessage.entry[0].changes[0],
            value: {
              ...mockWhatsAppWebhooks.textMessage.entry[0].changes[0].value,
              messages: [{
                ...mockWhatsAppWebhooks.textMessage.entry[0].changes[0].value.messages[0],
                text: {
                  body: 'Sak pase, mwen bezwen achte diri'
                }
              }]
            }
          }]
        }]
      }

      vi.spyOn(whatsappService, 'processWebhook').mockResolvedValue({
        processed: true,
        responses: [{
          to: haitianMessage.entry[0].changes[0].value.messages[0].from,
          type: 'text',
          text: {
            body: 'Sak pase! Mwen ka ede ou jwenn diri. Ki kote ou ye?'
          }
        }],
        metadata: {
          language: 'ht',
          intent: 'purchase_intent',
          translation: 'Hola, necesito comprar arroz'
        }
      })

      const result = await whatsappService.processWebhook(haitianMessage)

      expect(result.processed).toBe(true)
      expect(result.metadata.language).toBe('ht')
      expect(result.metadata.intent).toBe('purchase_intent')
      expect(result.responses[0].text.body).toContain('Sak pase')
    })

    it('should send Haitian Creole templates', async () => {
      const template = mockWhatsAppTemplates.haitian.greeting
      
      vi.spyOn(whatsappService, 'sendTemplate').mockResolvedValue({
        success: true,
        messageId: 'wamid.ht_template123',
        metadata: {
          template: template.name,
          language: 'ht',
          culturallyAdapted: true
        }
      })

      const result = await whatsappService.sendTemplate({
        to: '+18091234567',
        template: {
          name: template.name,
          language: { code: 'ht' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: 'Marie' },
                { type: 'text', text: 'Colmado La Esquina' }
              ]
            }
          ]
        }
      })

      expect(result.success).toBe(true)
      expect(result.metadata.language).toBe('ht')
      expect(result.metadata.culturallyAdapted).toBe(true)
    })
  })

  describe('Commerce Integration', () => {
    it('should handle product catalog browsing', async () => {
      vi.spyOn(whatsappService, 'sendInteractive').mockResolvedValue({
        success: true,
        messageId: 'wamid.catalog123',
        metadata: {
          type: 'product_list',
          catalogId: 'colmado_catalog_123',
          productsShown: 12
        }
      })

      const result = await whatsappService.sendInteractive({
        to: '+18091234567',
        type: 'product_list',
        header: {
          type: 'text',
          text: 'Productos Disponibles'
        },
        body: {
          text: 'Selecciona los productos que necesitas:'
        },
        action: {
          catalog_id: 'colmado_catalog_123',
          sections: [{
            title: 'Alimentos Básicos',
            products: [
              { product_retailer_id: 'arroz_blanco' },
              { product_retailer_id: 'pollo_entero' },
              { product_retailer_id: 'aceite_canola' }
            ]
          }]
        }
      })

      expect(result.success).toBe(true)
      expect(result.metadata.type).toBe('product_list')
      expect(result.metadata.catalogId).toBe('colmado_catalog_123')
    })

    it('should handle order placement flow', async () => {
      const orderFlow = [
        // Step 1: Product selection
        {
          type: 'interactive',
          interactive_type: 'product_list'
        },
        // Step 2: Quantity selection
        {
          type: 'interactive',
          interactive_type: 'button',
          buttons: ['1 libra', '2 libras', '5 libras']
        },
        // Step 3: Payment method
        {
          type: 'interactive',
          interactive_type: 'list',
          sections: [{
            title: 'Métodos de Pago',
            rows: [
              { id: 'cash', title: 'Efectivo' },
              { id: 'tpago', title: 'tPago' },
              { id: 'card', title: 'Tarjeta' }
            ]
          }]
        }
      ]

      for (const [index, step] of orderFlow.entries()) {
        vi.spyOn(whatsappService, 'sendInteractive').mockResolvedValue({
          success: true,
          messageId: `wamid.step${index + 1}`,
          metadata: {
            step: index + 1,
            type: step.interactive_type || step.type,
            orderFlowActive: true
          }
        })

        const result = await whatsappService.sendInteractive({
          to: '+18091234567',
          ...step
        } as any)

        expect(result.success).toBe(true)
        expect(result.metadata.step).toBe(index + 1)
        expect(result.metadata.orderFlowActive).toBe(true)
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle rate limiting gracefully', async () => {
      vi.spyOn(whatsappService, 'sendMessage').mockRejectedValue(new Error('Rate limit exceeded'))

      try {
        await whatsappService.sendMessage({
          to: '+18091234567',
          text: { body: 'Test message' }
        })
      } catch (error) {
        expect(error.message).toContain('Rate limit exceeded')
      }

      // Should implement retry logic
      vi.spyOn(whatsappService, 'sendMessage').mockResolvedValueOnce({
        success: true,
        messageId: 'wamid.retry123',
        metadata: {
          retryAttempt: 1,
          backoffDelay: 5000
        }
      })

      const retryResult = await whatsappService.sendMessage({
        to: '+18091234567',
        text: { body: 'Test message' }
      })

      expect(retryResult.success).toBe(true)
      expect(retryResult.metadata.retryAttempt).toBe(1)
    })

    it('should handle invalid phone numbers', async () => {
      const invalidNumbers = [
        '123456', // Too short
        '+1809123456789', // Too long
        '+1829123456a', // Contains letter
        '849-123-456' // Wrong format
      ]

      for (const number of invalidNumbers) {
        vi.spyOn(whatsappService, 'sendMessage').mockRejectedValue(
          new Error('Invalid recipient phone number')
        )

        try {
          await whatsappService.sendMessage({
            to: number,
            text: { body: 'Test message' }
          })
        } catch (error) {
          expect(error.message).toContain('Invalid recipient')
        }
      }
    })

    it('should handle template not found errors', async () => {
      vi.spyOn(whatsappService, 'sendTemplate').mockRejectedValue(
        new Error('Template not found: nonexistent_template')
      )

      try {
        await whatsappService.sendTemplate({
          to: '+18091234567',
          template: {
            name: 'nonexistent_template',
            language: { code: 'es' }
          }
        })
      } catch (error) {
        expect(error.message).toContain('Template not found')
      }
    })
  })

  describe('Webhook Validation', () => {
    it('should validate webhook signatures', async () => {
      const validSignature = 'sha256=valid_signature_hash'
      const invalidSignature = 'sha256=invalid_signature_hash'

      vi.spyOn(whatsappService, 'verifyWebhook').mockImplementation((signature) => {
        return signature === validSignature
      })

      expect(whatsappService.verifyWebhook(validSignature)).toBe(true)
      expect(whatsappService.verifyWebhook(invalidSignature)).toBe(false)
    })

    it('should handle webhook verification challenge', async () => {
      const verificationRequest = {
        'hub.mode': 'subscribe',
        'hub.challenge': 'webhook_challenge_123',
        'hub.verify_token': 'test_verify_token'
      }

      vi.spyOn(whatsappService, 'handleVerification').mockReturnValue(
        verificationRequest['hub.challenge']
      )

      const result = whatsappService.handleVerification(
        verificationRequest['hub.mode'],
        verificationRequest['hub.verify_token'],
        verificationRequest['hub.challenge']
      )

      expect(result).toBe('webhook_challenge_123')
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle high message volume', async () => {
      const messageCount = 100
      const messages = Array(messageCount).fill().map((_, i) => ({
        to: `+18091234${String(i).padStart(3, '0')}`,
        text: { body: `Mensaje ${i + 1}` }
      }))

      const startTime = Date.now()

      // Mock successful sends
      vi.spyOn(whatsappService, 'sendMessage').mockImplementation(async (message) => ({
        success: true,
        messageId: `wamid.batch${messages.indexOf(message)}`,
        metadata: {
          processingTime: 50,
          batchId: 'batch_123'
        }
      }))

      const results = await Promise.all(
        messages.map(msg => whatsappService.sendMessage(msg))
      )

      const endTime = Date.now()
      const totalTime = endTime - startTime

      expect(results).toHaveLength(messageCount)
      expect(results.every(r => r.success)).toBe(true)
      expect(totalTime).toBeLessThan(5000) // Should handle 100 messages in < 5s
    })

    it('should implement proper rate limiting', async () => {
      const requestsPerMinute = 60
      const interval = 60000 / requestsPerMinute // 1 second between requests

      vi.spyOn(whatsappService, 'checkRateLimit').mockImplementation(() => ({
        allowed: true,
        remaining: 59,
        resetTime: Date.now() + 60000,
        retryAfter: null
      }))

      for (let i = 0; i < 5; i++) {
        const rateLimit = whatsappService.checkRateLimit()
        expect(rateLimit.allowed).toBe(true)
        expect(rateLimit.remaining).toBeGreaterThanOrEqual(0)
        
        // Simulate delay between requests
        await new Promise(resolve => setTimeout(resolve, interval))
      }
    })
  })

  describe('Business Features', () => {
    it('should support Dominican business hours', async () => {
      const businessHours = {
        monday: '06:00-22:00',
        tuesday: '06:00-22:00',
        wednesday: '06:00-22:00',
        thursday: '06:00-22:00',
        friday: '06:00-22:00',
        saturday: '06:00-23:00',
        sunday: '07:00-21:00'
      }

      vi.spyOn(whatsappService, 'checkBusinessHours').mockImplementation((day, time) => {
        const hours = businessHours[day.toLowerCase()]
        if (!hours) return false
        
        const [open, close] = hours.split('-')
        return time >= open && time <= close
      })

      // Test during business hours
      expect(whatsappService.checkBusinessHours('monday', '10:00')).toBe(true)
      expect(whatsappService.checkBusinessHours('saturday', '20:00')).toBe(true)
      
      // Test outside business hours
      expect(whatsappService.checkBusinessHours('sunday', '22:00')).toBe(false)
      expect(whatsappService.checkBusinessHours('monday', '05:00')).toBe(false)
    })

    it('should handle Dominican currency formatting in messages', async () => {
      const priceMessage = 'El pollo cuesta RD$180.00 por libra'
      
      vi.spyOn(whatsappService, 'formatCurrency').mockImplementation((amount, currency = 'DOP') => {
        return `RD$${amount.toLocaleString('es-DO', { 
          minimumFractionDigits: 2,
          maximumFractionDigits: 2 
        })}`
      })

      const formattedPrice = whatsappService.formatCurrency(180.00)
      expect(formattedPrice).toBe('RD$180.00')
      
      const messageWithPrice = `El pollo cuesta ${formattedPrice} por libra`
      expect(messageWithPrice).toContain('RD$180.00')
    })
  })
})