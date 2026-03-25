import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '@/api/src/server'
import { WhatsAppService } from '@/services/WhatsAppService'
import axios from 'axios'

// Mock external APIs
vi.mock('axios')
const mockedAxios = vi.mocked(axios)

describe('WhatsApp Business API Integration', () => {
  let server: any

  beforeAll(async () => {
    server = app.listen(0)
  })

  afterAll(async () => {
    if (server) {
      server.close()
    }
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Webhook Processing', () => {
    it('should process incoming Dominican Spanish messages', async () => {
      const dominicanMessage = {
        object: 'whatsapp_business_account',
        entry: [{
          id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '15551234567',
                phone_number_id: 'PHONE_NUMBER_ID',
              },
              messages: [{
                from: '18091234567', // Dominican number
                id: 'wamid.ID',
                timestamp: '1677649344',
                text: {
                  body: 'Klk tiguer, busco pollo barato en el colmado'
                },
                type: 'text'
              }]
            },
            field: 'messages'
          }]
        }]
      }

      mockedAxios.post.mockResolvedValue({
        data: { success: true },
        status: 200,
      })

      const response = await request(app)
        .post('/webhook/whatsapp')
        .send(dominicanMessage)
        .expect(200)

      expect(response.body.success).toBe(true)

      // Verify AI processing was called with Dominican context
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/ai/process'),
        expect.objectContaining({
          text: 'Klk tiguer, busco pollo barato en el colmado',
          language: 'es-DO',
          culturalContext: 'dominican',
          intent: 'product_search',
        })
      )
    })

    it('should process Haitian Creole messages with translation', async () => {
      const creoleMessage = {
        object: 'whatsapp_business_account',
        entry: [{
          id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '15551234567',
                phone_number_id: 'PHONE_NUMBER_ID',
              },
              messages: [{
                from: '18091234567',
                id: 'wamid.ID',
                timestamp: '1677649344',
                text: {
                  body: 'Sak pase, mwen bezwen achte diri ak pwa'
                },
                type: 'text'
              }]
            },
            field: 'messages'
          }]
        }]
      }

      mockedAxios.post
        .mockResolvedValueOnce({
          data: {
            translatedText: 'Hola, necesito comprar arroz y habichuelas',
            confidence: 0.92,
            originalLanguage: 'ht',
            targetLanguage: 'es-DO'
          },
          status: 200,
        })
        .mockResolvedValueOnce({
          data: { success: true },
          status: 200,
        })

      const response = await request(app)
        .post('/webhook/whatsapp')
        .send(creoleMessage)
        .expect(200)

      expect(response.body.success).toBe(true)

      // Should call translation service first
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/ai/translate'),
        expect.objectContaining({
          text: 'Sak pase, mwen bezwen achte diri ak pwa',
          from: 'ht',
          to: 'es-DO',
        })
      )

      // Then process with translated text
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/ai/process'),
        expect.objectContaining({
          originalText: 'Sak pase, mwen bezwen achte diri ak pwa',
          translatedText: 'Hola, necesito comprar arroz y habichuelas',
          language: 'ht',
          culturalContext: 'haitian-dominican',
        })
      )
    })

    it('should handle voice messages with Dominican accent recognition', async () => {
      const voiceMessage = {
        object: 'whatsapp_business_account',
        entry: [{
          id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '15551234567',
                phone_number_id: 'PHONE_NUMBER_ID',
              },
              messages: [{
                from: '18091234567',
                id: 'wamid.ID',
                timestamp: '1677649344',
                audio: {
                  id: 'AUDIO_ID',
                  mime_type: 'audio/ogg; codecs=opus'
                },
                type: 'audio'
              }]
            },
            field: 'messages'
          }]
        }]
      }

      // Mock audio download
      mockedAxios.get.mockResolvedValueOnce({
        data: Buffer.from('mock-audio-data'),
        headers: { 'content-type': 'audio/ogg' },
      })

      // Mock speech-to-text with Dominican accent
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          transcript: 'Klk loco, cuánto vale el pollo en el colmado',
          confidence: 0.94,
          language: 'es-DO',
          accent: 'dominican-caribbean',
        },
        status: 200,
      })

      const response = await request(app)
        .post('/webhook/whatsapp')
        .send(voiceMessage)
        .expect(200)

      expect(response.body.success).toBe(true)

      // Should download audio file
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('AUDIO_ID'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer'),
          }),
          responseType: 'arraybuffer',
        })
      )

      // Should transcribe with Dominican accent model
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/voice/transcribe'),
        expect.objectContaining({
          audioData: expect.any(String),
          language: 'es-DO',
          accent: 'dominican',
          culturalContext: true,
        })
      )
    })

    it('should handle interactive button responses for product selection', async () => {
      const buttonMessage = {
        object: 'whatsapp_business_account',
        entry: [{
          id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '15551234567',
                phone_number_id: 'PHONE_NUMBER_ID',
              },
              messages: [{
                from: '18091234567',
                id: 'wamid.ID',
                timestamp: '1677649344',
                interactive: {
                  type: 'button_reply',
                  button_reply: {
                    id: 'product_pollo_entero',
                    title: 'Pollo Entero RD$280'
                  }
                },
                type: 'interactive'
              }]
            },
            field: 'messages'
          }]
        }]
      }

      mockedAxios.post.mockResolvedValue({
        data: { success: true, orderId: 'order-123' },
        status: 200,
      })

      const response = await request(app)
        .post('/webhook/whatsapp')
        .send(buttonMessage)
        .expect(200)

      expect(response.body.success).toBe(true)

      // Should process product selection with Dominican pricing
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/orders/add-item'),
        expect.objectContaining({
          productId: 'product_pollo_entero',
          productName: 'Pollo Entero',
          price: 280,
          currency: 'DOP',
          phone: '18091234567',
        })
      )
    })
  })

  describe('Message Sending', () => {
    it('should send Dominican Spanish response messages', async () => {
      const whatsappService = new WhatsAppService()

      mockedAxios.post.mockResolvedValue({
        data: {
          messaging_product: 'whatsapp',
          contacts: [{ wa_id: '18091234567' }],
          messages: [{ id: 'wamid.ID' }],
        },
        status: 200,
      })

      const result = await whatsappService.sendMessage(
        '18091234567',
        'Klk tiguer! Encontramos pollo fresco en el colmado por RD$320. ¿Te interesa?'
      )

      expect(result.success).toBe(true)

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/messages'),
        expect.objectContaining({
          messaging_product: 'whatsapp',
          to: '18091234567',
          type: 'text',
          text: {
            body: 'Klk tiguer! Encontramos pollo fresco en el colmado por RD$320. ¿Te interesa?'
          }
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer'),
            'Content-Type': 'application/json',
          })
        })
      )
    })

    it('should send interactive product catalog in Dominican Spanish', async () => {
      const whatsappService = new WhatsAppService()

      mockedAxios.post.mockResolvedValue({
        data: {
          messaging_product: 'whatsapp',
          contacts: [{ wa_id: '18091234567' }],
          messages: [{ id: 'wamid.ID' }],
        },
        status: 200,
      })

      const products = [
        { id: 'pollo', name: 'Pollo Entero', price: 320, currency: 'DOP' },
        { id: 'arroz', name: 'Arroz (5 lb)', price: 180, currency: 'DOP' },
        { id: 'habichuelas', name: 'Habichuelas Rojas', price: 120, currency: 'DOP' },
      ]

      const result = await whatsappService.sendProductCatalog('18091234567', products)

      expect(result.success).toBe(true)

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/messages'),
        expect.objectContaining({
          messaging_product: 'whatsapp',
          to: '18091234567',
          type: 'interactive',
          interactive: {
            type: 'list',
            header: {
              type: 'text',
              text: 'Productos Disponibles en el Colmado'
            },
            body: {
              text: 'Selecciona el producto que necesitas:'
            },
            action: {
              button: 'Ver Productos',
              sections: [{
                title: 'Productos Frescos',
                rows: expect.arrayContaining([
                  expect.objectContaining({
                    id: 'pollo',
                    title: 'Pollo Entero',
                    description: 'RD$320'
                  })
                ])
              }]
            }
          }
        })
      )
    })

    it('should send order confirmation with Dominican payment methods', async () => {
      const whatsappService = new WhatsAppService()

      mockedAxios.post.mockResolvedValue({
        data: {
          messaging_product: 'whatsapp',
          contacts: [{ wa_id: '18091234567' }],
          messages: [{ id: 'wamid.ID' }],
        },
        status: 200,
      })

      const orderData = {
        orderId: 'ORD-2024-001',
        items: [
          { name: 'Pollo Entero', quantity: 1, price: 320 },
          { name: 'Arroz (5 lb)', quantity: 2, price: 180 }
        ],
        total: 680,
        currency: 'DOP',
        deliveryAddress: 'Calle Primera #123, Santo Domingo',
        paymentMethods: ['efectivo', 'tpago', 'transferencia']
      }

      const result = await whatsappService.sendOrderConfirmation('18091234567', orderData)

      expect(result.success).toBe(true)

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/messages'),
        expect.objectContaining({
          messaging_product: 'whatsapp',
          to: '18091234567',
          type: 'interactive',
          interactive: {
            type: 'button',
            header: {
              type: 'text',
              text: '✅ Pedido Confirmado - ORD-2024-001'
            },
            body: {
              text: expect.stringContaining('Total: RD$680')
            },
            action: {
              buttons: expect.arrayContaining([
                expect.objectContaining({
                  type: 'reply',
                  reply: {
                    id: 'pay_efectivo',
                    title: 'Pagar en Efectivo'
                  }
                }),
                expect.objectContaining({
                  type: 'reply',
                  reply: {
                    id: 'pay_tpago',
                    title: 'Pagar con tPago'
                  }
                })
              ])
            }
          }
        })
      )
    })
  })

  describe('Template Messages', () => {
    it('should send Dominican Spanish greeting template', async () => {
      const whatsappService = new WhatsAppService()

      mockedAxios.post.mockResolvedValue({
        data: {
          messaging_product: 'whatsapp',
          contacts: [{ wa_id: '18091234567' }],
          messages: [{ id: 'wamid.ID' }],
        },
        status: 200,
      })

      const result = await whatsappService.sendTemplate(
        '18091234567',
        'dominican_greeting',
        ['Juan', 'Colmado El Tigueraje']
      )

      expect(result.success).toBe(true)

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/messages'),
        expect.objectContaining({
          messaging_product: 'whatsapp',
          to: '18091234567',
          type: 'template',
          template: {
            name: 'dominican_greeting',
            language: {
              code: 'es'
            },
            components: [{
              type: 'body',
              parameters: [
                { type: 'text', text: 'Juan' },
                { type: 'text', text: 'Colmado El Tigueraje' }
              ]
            }]
          }
        })
      )
    })

    it('should send delivery notification with Dominican address format', async () => {
      const whatsappService = new WhatsAppService()

      mockedAxios.post.mockResolvedValue({
        data: {
          messaging_product: 'whatsapp',
          contacts: [{ wa_id: '18091234567' }],
          messages: [{ id: 'wamid.ID' }],
        },
        status: 200,
      })

      const deliveryData = {
        orderId: 'ORD-2024-001',
        estimatedTime: '30 minutos',
        address: 'Calle Primera #123, Sector Los Alcarrizos, Santo Domingo',
        driverName: 'Carlos',
        driverPhone: '8291234567'
      }

      const result = await whatsappService.sendDeliveryNotification('18091234567', deliveryData)

      expect(result.success).toBe(true)

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/messages'),
        expect.objectContaining({
          messaging_product: 'whatsapp',
          to: '18091234567',
          type: 'template',
          template: {
            name: 'delivery_notification_do',
            language: { code: 'es' },
            components: expect.arrayContaining([
              expect.objectContaining({
                type: 'body',
                parameters: expect.arrayContaining([
                  { type: 'text', text: 'ORD-2024-001' },
                  { type: 'text', text: '30 minutos' },
                  { type: 'text', text: 'Carlos' },
                  { type: 'text', text: '8291234567' }
                ])
              })
            ])
          }
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle WhatsApp API rate limiting gracefully', async () => {
      const whatsappService = new WhatsAppService()

      mockedAxios.post.mockRejectedValue({
        response: {
          status: 429,
          data: {
            error: {
              message: 'Too many requests',
              code: 4,
              error_subcode: 2018109
            }
          }
        }
      })

      const result = await whatsappService.sendMessage('18091234567', 'Test message')

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/rate limit/i)
      expect(result.retryAfter).toBeDefined()
    })

    it('should handle invalid phone number format', async () => {
      const whatsappService = new WhatsAppService()

      const result = await whatsappService.sendMessage('123456', 'Test message')

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/invalid phone number/i)
    })

    it('should handle webhook signature verification', async () => {
      const invalidSignature = 'invalid-signature'

      const response = await request(app)
        .post('/webhook/whatsapp')
        .set('X-Hub-Signature-256', `sha256=${invalidSignature}`)
        .send({
          object: 'whatsapp_business_account',
          entry: [{ changes: [] }]
        })
        .expect(401)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid signature'
      })
    })
  })

  describe('Dominican Cultural Context', () => {
    it('should adapt message tone for Dominican audience', async () => {
      const messageRequest = {
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            value: {
              messages: [{
                from: '18091234567',
                text: { body: 'Buenos días, ¿tienen pollo?' },
                type: 'text'
              }]
            }
          }]
        }]
      }

      mockedAxios.post.mockResolvedValue({
        data: { success: true },
        status: 200,
      })

      const response = await request(app)
        .post('/webhook/whatsapp')
        .send(messageRequest)
        .expect(200)

      // Should respond with Dominican cultural appropriateness
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/messages'),
        expect.objectContaining({
          text: expect.objectContaining({
            body: expect.stringMatching(/klk|tiguer|loco|brutal/i)
          })
        })
      )
    })

    it('should use Dominican peso currency formatting', async () => {
      const priceInquiry = {
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            value: {
              messages: [{
                from: '18091234567',
                text: { body: 'Cuánto cuesta el arroz?' },
                type: 'text'
              }]
            }
          }]
        }]
      }

      mockedAxios.post.mockResolvedValue({
        data: { success: true },
        status: 200,
      })

      await request(app)
        .post('/webhook/whatsapp')
        .send(priceInquiry)
        .expect(200)

      // Should format prices in Dominican pesos
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/messages'),
        expect.objectContaining({
          text: expect.objectContaining({
            body: expect.stringMatching(/RD\$\d+/i)
          })
        })
      )
    })

    it('should recognize Dominican business hours and context', async () => {
      // Mock current time to be during typical colmado hours (6 AM - 10 PM)
      const mockDate = new Date('2024-01-15T20:00:00-04:00') // 8 PM Dominican time
      vi.setSystemTime(mockDate)

      const orderRequest = {
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            value: {
              messages: [{
                from: '18091234567',
                text: { body: 'Quiero hacer un pedido' },
                type: 'text'
              }]
            }
          }]
        }]
      }

      mockedAxios.post.mockResolvedValue({
        data: { success: true },
        status: 200,
      })

      await request(app)
        .post('/webhook/whatsapp')
        .send(orderRequest)
        .expect(200)

      // Should acknowledge Dominican business hours
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/messages'),
        expect.objectContaining({
          text: expect.objectContaining({
            body: expect.stringMatching(/entrega.*antes.*10.*noche/i)
          })
        })
      )

      vi.useRealTimers()
    })
  })
})