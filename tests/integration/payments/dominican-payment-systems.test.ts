import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '@/api/src/server'
import { PaymentService } from '@/services/PaymentService'
import axios from 'axios'

// Mock external payment APIs
vi.mock('axios')
const mockedAxios = vi.mocked(axios)

describe('Dominican Payment Systems Integration', () => {
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

  describe('tPago Integration', () => {
    it('should process tPago payments with Dominican phone numbers', async () => {
      const paymentData = {
        amount: 680.00,
        currency: 'DOP',
        description: 'Pedido Colmado El Tigueraje - ORD-2024-001',
        customerPhone: '8091234567',
        paymentMethod: 'tpago',
        orderId: 'ORD-2024-001'
      }

      // Mock tPago API response
      mockedAxios.post.mockResolvedValue({
        data: {
          success: true,
          transactionId: 'TPAGO-12345',
          status: 'completed',
          amount: 680.00,
          currency: 'DOP',
          fee: 10.20, // 1.5% tPago fee
          net: 669.80,
          timestamp: '2024-01-15T14:30:00-04:00'
        },
        status: 200,
      })

      const response = await request(app)
        .post('/api/payments/process')
        .send(paymentData)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        transaction: {
          id: 'TPAGO-12345',
          status: 'completed',
          amount: 680.00,
          currency: 'DOP',
          provider: 'tpago',
          fee: 10.20,
          net: 669.80
        }
      })

      // Verify tPago API was called with correct format
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('api.tpago.com.do'),
        expect.objectContaining({
          amount: '680.00',
          currency: 'DOP',
          phone: '+18091234567', // Should format to international
          description: 'Pedido Colmado El Tigueraje - ORD-2024-001',
          webhook_url: expect.stringContaining('/webhook/tpago'),
          metadata: expect.objectContaining({
            orderId: 'ORD-2024-001',
            businessType: 'colmado'
          })
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer'),
            'X-API-Version': '2.1',
            'Content-Type': 'application/json'
          })
        })
      )
    })

    it('should handle tPago webhook notifications', async () => {
      const tpagoWebhook = {
        event: 'payment.completed',
        data: {
          id: 'TPAGO-12345',
          status: 'completed',
          amount: '680.00',
          currency: 'DOP',
          phone: '+18091234567',
          fee: '10.20',
          net: '669.80',
          reference: 'ORD-2024-001',
          timestamp: '2024-01-15T14:30:00-04:00'
        },
        signature: 'valid-signature-hash'
      }

      const response = await request(app)
        .post('/webhook/tpago')
        .set('X-tPago-Signature', 'valid-signature-hash')
        .send(tpagoWebhook)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: 'Webhook processed successfully'
      })

      // Should update order status
      expect(mockedAxios.patch).toHaveBeenCalledWith(
        expect.stringContaining('/api/orders/ORD-2024-001'),
        expect.objectContaining({
          paymentStatus: 'completed',
          transactionId: 'TPAGO-12345',
          paidAmount: 680.00,
          paymentDate: expect.any(String)
        })
      )
    })

    it('should handle tPago payment failures with Dominican error messages', async () => {
      const paymentData = {
        amount: 680.00,
        currency: 'DOP',
        customerPhone: '8091234567',
        paymentMethod: 'tpago',
        orderId: 'ORD-2024-001'
      }

      mockedAxios.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'insufficient_funds',
            message: 'Fondos insuficientes',
            code: 'TPAGO_4001'
          }
        }
      })

      const response = await request(app)
        .post('/api/payments/process')
        .send(paymentData)
        .expect(400)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Fondos insuficientes en tu cuenta tPago',
        errorCode: 'INSUFFICIENT_FUNDS',
        provider: 'tpago'
      })
    })
  })

  describe('PayPal Integration for Dominican Market', () => {
    it('should process PayPal payments with Dominican peso conversion', async () => {
      const paymentData = {
        amount: 680.00,
        currency: 'DOP',
        description: 'Pedido Colmado - ORD-2024-001',
        customerEmail: 'juan.perez@gmail.com',
        paymentMethod: 'paypal',
        orderId: 'ORD-2024-001'
      }

      // Mock currency conversion DOP to USD
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          rates: {
            USD: 0.0175 // 1 DOP = 0.0175 USD (typical rate)
          }
        },
        status: 200
      })

      // Mock PayPal payment creation
      mockedAxios.post.mockResolvedValue({
        data: {
          id: 'PAYID-12345',
          status: 'CREATED',
          links: [{
            href: 'https://www.paypal.com/checkoutnow?token=EC-12345',
            rel: 'approval_url',
            method: 'REDIRECT'
          }]
        },
        status: 201
      })

      const response = await request(app)
        .post('/api/payments/process')
        .send(paymentData)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        paymentUrl: 'https://www.paypal.com/checkoutnow?token=EC-12345',
        paymentId: 'PAYID-12345',
        originalAmount: 680.00,
        originalCurrency: 'DOP',
        convertedAmount: 11.90, // 680 * 0.0175
        convertedCurrency: 'USD'
      })

      // Should call PayPal with converted USD amount
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('api.paypal.com'),
        expect.objectContaining({
          intent: 'CAPTURE',
          purchase_units: [{
            amount: {
              currency_code: 'USD',
              value: '11.90'
            },
            description: 'Pedido Colmado - ORD-2024-001',
            custom_id: 'ORD-2024-001'
          }],
          application_context: {
            return_url: expect.stringContaining('/paypal/return'),
            cancel_url: expect.stringContaining('/paypal/cancel'),
            locale: 'es_DO', // Dominican Spanish
            user_action: 'PAY_NOW'
          }
        })
      )
    })

    it('should handle PayPal webhooks with Dominican order updates', async () => {
      const paypalWebhook = {
        id: 'WH-12345',
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: {
          id: 'CAPTURE-12345',
          status: 'COMPLETED',
          amount: {
            currency_code: 'USD',
            value: '11.90'
          },
          custom_id: 'ORD-2024-001',
          create_time: '2024-01-15T18:30:00Z'
        }
      }

      // Mock webhook signature verification
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          verification_status: 'SUCCESS'
        },
        status: 200
      })

      const response = await request(app)
        .post('/webhook/paypal')
        .set('PAYPAL-TRANSMISSION-ID', 'transmission-id')
        .set('PAYPAL-CERT-ID', 'cert-id')
        .set('PAYPAL-TRANSMISSION-SIG', 'signature')
        .set('PAYPAL-TRANSMISSION-TIME', '2024-01-15T18:30:00Z')
        .send(paypalWebhook)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: 'PayPal webhook processed'
      })

      // Should update order with converted amount back to DOP
      expect(mockedAxios.patch).toHaveBeenCalledWith(
        expect.stringContaining('/api/orders/ORD-2024-001'),
        expect.objectContaining({
          paymentStatus: 'completed',
          paymentProvider: 'paypal',
          transactionId: 'CAPTURE-12345',
          paidAmount: 680.00, // Converted back to DOP
          paidCurrency: 'DOP',
          originalPaymentAmount: 11.90,
          originalPaymentCurrency: 'USD'
        })
      )
    })
  })

  describe('Dominican Bank Card Processing', () => {
    it('should process local bank cards with Dominican validation', async () => {
      const cardPaymentData = {
        amount: 680.00,
        currency: 'DOP',
        cardNumber: '4111111111111111',
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123',
        cardHolderName: 'JUAN PEREZ',
        paymentMethod: 'card',
        orderId: 'ORD-2024-001'
      }

      // Mock Dominican bank card processing
      mockedAxios.post.mockResolvedValue({
        data: {
          success: true,
          transactionId: 'BPD-789123',
          status: 'approved',
          amount: 680.00,
          currency: 'DOP',
          authCode: 'AUTH123',
          bankName: 'Banco Popular Dominicano',
          cardBrand: 'visa',
          lastFourDigits: '1111'
        },
        status: 200
      })

      const response = await request(app)
        .post('/api/payments/process')
        .send(cardPaymentData)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        transaction: {
          id: 'BPD-789123',
          status: 'approved',
          amount: 680.00,
          currency: 'DOP',
          bank: 'Banco Popular Dominicano',
          cardBrand: 'visa',
          lastFour: '1111'
        }
      })

      // Should validate against Dominican banking standards
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('dominican-payment-gateway'),
        expect.objectContaining({
          amount: '680.00',
          currency: 'DOP',
          card: expect.objectContaining({
            number: expect.any(String), // Should be encrypted
            holder_name: 'JUAN PEREZ',
            exp_month: '12',
            exp_year: '2025'
          }),
          billing: expect.objectContaining({
            country: 'DO',
            currency: 'DOP'
          }),
          compliance: {
            law_172_13: true, // Dominican data protection law
            encryption_standard: 'AES-256'
          }
        })
      )
    })

    it('should handle Dominican bank card validation errors', async () => {
      const invalidCardData = {
        amount: 680.00,
        currency: 'DOP',
        cardNumber: '4000000000000002', // Card declined test number
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123',
        paymentMethod: 'card',
        orderId: 'ORD-2024-001'
      }

      mockedAxios.post.mockRejectedValue({
        response: {
          status: 402,
          data: {
            error: 'card_declined',
            message: 'Tarjeta declinada por el banco emisor',
            code: 'CARD_DECLINED',
            bankResponse: 'INSUFFICIENT_FUNDS'
          }
        }
      })

      const response = await request(app)
        .post('/api/payments/process')
        .send(invalidCardData)
        .expect(402)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Tarjeta declinada por el banco emisor',
        errorCode: 'CARD_DECLINED',
        suggestion: 'Verifica los fondos disponibles o contacta a tu banco'
      })
    })
  })

  describe('Cash Payment Integration', () => {
    it('should generate cash payment codes for Dominican delivery', async () => {
      const cashPaymentData = {
        amount: 680.00,
        currency: 'DOP',
        paymentMethod: 'cash',
        orderId: 'ORD-2024-001',
        deliveryAddress: 'Calle Primera #123, Santo Domingo',
        customerPhone: '8091234567'
      }

      const response = await request(app)
        .post('/api/payments/process')
        .send(cashPaymentData)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        paymentMethod: 'cash',
        amount: 680.00,
        currency: 'DOP',
        paymentCode: expect.stringMatching(/^CASH-\d{8}$/),
        deliveryInstructions: expect.stringContaining('efectivo'),
        changeRequired: expect.any(Boolean)
      })

      // Should schedule cash collection notification
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/notifications/schedule'),
        expect.objectContaining({
          type: 'cash_payment_reminder',
          phone: '8091234567',
          message: expect.stringContaining('RD$680'),
          scheduledFor: expect.any(String) // 15 minutes before delivery
        })
      )
    })

    it('should handle cash payment confirmation from delivery agent', async () => {
      const cashConfirmation = {
        orderId: 'ORD-2024-001',
        paymentCode: 'CASH-12345678',
        amountReceived: 700.00,
        changeGiven: 20.00,
        agentId: 'AGENT-001',
        timestamp: '2024-01-15T19:30:00-04:00'
      }

      const response = await request(app)
        .post('/api/payments/confirm-cash')
        .send(cashConfirmation)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        paymentConfirmed: true,
        amountReceived: 700.00,
        changeGiven: 20.00,
        receiptNumber: expect.stringMatching(/^REC-\d{8}$/)
      })

      // Should update order as paid
      expect(mockedAxios.patch).toHaveBeenCalledWith(
        expect.stringContaining('/api/orders/ORD-2024-001'),
        expect.objectContaining({
          paymentStatus: 'completed',
          paymentMethod: 'cash',
          amountReceived: 700.00,
          changeGiven: 20.00,
          paidDate: expect.any(String)
        })
      )
    })
  })

  describe('Payment Method Routing', () => {
    it('should route payments based on Dominican customer preferences', async () => {
      const customerProfile = {
        phone: '8091234567',
        preferredPayment: 'tpago',
        hasCard: false,
        cashPreference: 'high',
        location: 'santo_domingo_urban'
      }

      const response = await request(app)
        .post('/api/payments/recommend-methods')
        .send({
          amount: 680.00,
          customerPhone: '8091234567'
        })
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        recommendedMethods: [
          expect.objectContaining({
            method: 'tpago',
            priority: 1,
            fee: expect.any(Number),
            processingTime: 'instant'
          }),
          expect.objectContaining({
            method: 'cash',
            priority: 2,
            fee: 0,
            processingTime: 'on_delivery'
          }),
          expect.objectContaining({
            method: 'paypal',
            priority: 3,
            fee: expect.any(Number),
            processingTime: 'instant'
          })
        ]
      })
    })

    it('should adjust payment methods for rural Dominican areas', async () => {
      const response = await request(app)
        .post('/api/payments/recommend-methods')
        .send({
          amount: 680.00,
          customerPhone: '8091234567',
          location: 'rural_santiago'
        })
        .expect(200)

      expect(response.body.recommendedMethods[0]).toMatchObject({
        method: 'cash',
        priority: 1,
        reason: 'Mejor opción para áreas rurales'
      })

      // tPago should have lower priority in rural areas
      const tpagoMethod = response.body.recommendedMethods.find((m: any) => m.method === 'tpago')
      expect(tpagoMethod.priority).toBeGreaterThan(1)
    })
  })

  describe('Dominican Payment Compliance', () => {
    it('should implement Dominican Central Bank reporting requirements', async () => {
      const largePayment = {
        amount: 50000.00, // Large amount requiring reporting
        currency: 'DOP',
        customerPhone: '8091234567',
        paymentMethod: 'tpago',
        orderId: 'ORD-2024-001'
      }

      mockedAxios.post.mockResolvedValue({
        data: { success: true, transactionId: 'TPAGO-12345' },
        status: 200
      })

      const response = await request(app)
        .post('/api/payments/process')
        .send(largePayment)
        .expect(200)

      // Should trigger Central Bank reporting
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/compliance/report-transaction'),
        expect.objectContaining({
          amount: 50000.00,
          currency: 'DOP',
          type: 'large_transaction',
          regulatoryBody: 'banco_central_do',
          customerData: expect.objectContaining({
            phone: '8091234567',
            country: 'DO'
          })
        })
      )
    })

    it('should enforce Dominican Law 172-13 data protection in payments', async () => {
      const paymentData = {
        amount: 680.00,
        currency: 'DOP',
        customerPhone: '8091234567',
        paymentMethod: 'card',
        cardNumber: '4111111111111111'
      }

      const response = await request(app)
        .post('/api/payments/process')
        .send(paymentData)
        .expect(200)

      // Should ensure data protection compliance
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          compliance: expect.objectContaining({
            law_172_13: true,
            dataEncryption: 'AES-256',
            dataRetention: '7_years',
            userConsent: true
          })
        })
      )

      // Should not log sensitive payment data
      const logCalls = mockedAxios.post.mock.calls.filter(call => 
        call[0].includes('/api/audit/log')
      )
      
      logCalls.forEach(call => {
        expect(call[1]).not.toHaveProperty('cardNumber')
        expect(call[1]).not.toHaveProperty('cvv')
      })
    })
  })

  describe('Payment Error Recovery', () => {
    it('should provide Dominican-specific error messages and recovery options', async () => {
      const paymentData = {
        amount: 680.00,
        currency: 'DOP',
        customerPhone: '8091234567',
        paymentMethod: 'tpago'
      }

      mockedAxios.post.mockRejectedValue({
        response: {
          status: 503,
          data: {
            error: 'service_unavailable',
            message: 'Servicio tPago temporalmente no disponible'
          }
        }
      })

      const response = await request(app)
        .post('/api/payments/process')
        .send(paymentData)
        .expect(503)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Servicio tPago temporalmente no disponible',
        alternatives: [
          {
            method: 'cash',
            message: 'Puedes pagar en efectivo al recibir tu pedido'
          },
          {
            method: 'card',
            message: 'Pagar con tarjeta de débito o crédito'
          }
        ],
        retryAfter: expect.any(Number)
      })
    })
  })
})