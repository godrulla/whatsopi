import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '@/api/src/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

// Mock database
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  session: {
    create: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
} as any

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}))

describe('Auth API Endpoints', () => {
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

  describe('POST /api/auth/register', () => {
    const validRegistrationData = {
      phone: '8091234567',
      name: 'Juan Pérez',
      password: 'MiContraseña123!',
      businessName: 'Colmado El Tigueraje',
      businessType: 'colmado',
      location: {
        address: 'Calle Primera #123, Santo Domingo',
        coordinates: {
          lat: 18.4861,
          lng: -69.9312
        }
      }
    }

    it('should register a new user with valid Dominican data', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.user.create.mockResolvedValue({
        id: '1',
        phone: '8091234567',
        name: 'Juan Pérez',
        businessName: 'Colmado El Tigueraje',
        createdAt: new Date(),
      })

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(201)

      expect(response.body).toMatchObject({
        success: true,
        user: {
          id: '1',
          phone: '8091234567',
          name: 'Juan Pérez',
          businessName: 'Colmado El Tigueraje',
        },
        token: expect.any(String),
      })

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          phone: '8091234567',
          name: 'Juan Pérez',
          businessName: 'Colmado El Tigueraje',
          password: expect.any(String), // Should be hashed
        }),
      })
    })

    it('should validate Dominican phone numbers', async () => {
      const invalidPhoneData = {
        ...validRegistrationData,
        phone: '1234567890', // Invalid Dominican number
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidPhoneData)
        .expect(400)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Número de teléfono dominicano inválido',
      })
    })

    it('should accept all valid Dominican area codes', async () => {
      const dominicanAreaCodes = ['809', '829', '849']

      for (const areaCode of dominicanAreaCodes) {
        mockPrisma.user.findUnique.mockResolvedValue(null)
        mockPrisma.user.create.mockResolvedValue({
          id: Math.random().toString(),
          phone: `${areaCode}1234567`,
        })

        const testData = {
          ...validRegistrationData,
          phone: `${areaCode}1234567`,
        }

        const response = await request(app)
          .post('/api/auth/register')
          .send(testData)
          .expect(201)

        expect(response.body.success).toBe(true)
      }
    })

    it('should prevent duplicate phone number registration', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        phone: '8091234567',
      })

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(409)

      expect(response.body).toMatchObject({
        success: false,
        error: 'El número de teléfono ya está registrado',
      })
    })

    it('should validate business types for Dominican context', async () => {
      const validBusinessTypes = [
        'colmado',
        'supermercado',
        'farmacia',
        'ferreteria',
        'panaderia',
        'carniceria',
        'verduleria',
        'licoreria',
      ]

      for (const businessType of validBusinessTypes) {
        mockPrisma.user.findUnique.mockResolvedValue(null)
        mockPrisma.user.create.mockResolvedValue({
          id: Math.random().toString(),
          businessType,
        })

        const testData = {
          ...validRegistrationData,
          phone: `809${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
          businessType,
        }

        const response = await request(app)
          .post('/api/auth/register')
          .send(testData)
          .expect(201)

        expect(response.body.user.businessType).toBe(businessType)
      }
    })

    it('should validate password strength requirements', async () => {
      const weakPasswords = [
        '123456',
        'password',
        'abc123',
        'MiContraseña', // Missing number and special char
        '123456789!', // Missing uppercase
      ]

      for (const password of weakPasswords) {
        const testData = {
          ...validRegistrationData,
          password,
        }

        const response = await request(app)
          .post('/api/auth/register')
          .send(testData)
          .expect(400)

        expect(response.body).toMatchObject({
          success: false,
          error: expect.stringMatching(/contraseña debe contener/i),
        })
      }
    })

    it('should create audit log for registration', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.user.create.mockResolvedValue({
        id: '1',
        phone: '8091234567',
      })

      await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(201)

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'USER_REGISTRATION',
          userId: '1',
          details: expect.any(String),
          ipAddress: expect.any(String),
          userAgent: expect.any(String),
        }),
      })
    })
  })

  describe('POST /api/auth/login', () => {
    const validLoginData = {
      phone: '8091234567',
      password: 'MiContraseña123!',
    }

    it('should authenticate user with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('MiContraseña123!', 12)
      
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        phone: '8091234567',
        name: 'Juan Pérez',
        password: hashedPassword,
        businessName: 'Colmado El Tigueraje',
        isActive: true,
        loginAttempts: 0,
      })

      mockPrisma.session.create.mockResolvedValue({
        id: 'session-1',
        userId: '1',
        token: 'mock-jwt-token',
      })

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        user: {
          id: '1',
          phone: '8091234567',
          name: 'Juan Pérez',
          businessName: 'Colmado El Tigueraje',
        },
        token: expect.any(String),
      })
    })

    it('should reject invalid phone number format', async () => {
      const invalidData = {
        ...validLoginData,
        phone: '123456',
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidData)
        .expect(400)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Número de teléfono inválido',
      })
    })

    it('should handle non-existent user securely', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(401)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Credenciales incorrectas',
      })

      // Should not reveal that user doesn't exist
      expect(response.body.error).not.toMatch(/usuario no existe/i)
    })

    it('should handle incorrect password securely', async () => {
      const hashedPassword = await bcrypt.hash('CorrectPassword123!', 12)
      
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        phone: '8091234567',
        password: hashedPassword,
        isActive: true,
        loginAttempts: 0,
      })

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          ...validLoginData,
          password: 'WrongPassword123!',
        })
        .expect(401)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Credenciales incorrectas',
      })
    })

    it('should implement rate limiting for failed attempts', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        phone: '8091234567',
        password: 'hashed-password',
        isActive: true,
        loginAttempts: 5, // Exceeds limit
        lastLoginAttempt: new Date(),
      })

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(429)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.',
      })
    })

    it('should reset login attempts after successful login', async () => {
      const hashedPassword = await bcrypt.hash('MiContraseña123!', 12)
      
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        phone: '8091234567',
        password: hashedPassword,
        isActive: true,
        loginAttempts: 2,
      })

      mockPrisma.user.update.mockResolvedValue({})
      mockPrisma.session.create.mockResolvedValue({
        id: 'session-1',
        token: 'mock-jwt-token',
      })

      await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(200)

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          loginAttempts: 0,
          lastLogin: expect.any(Date),
        },
      })
    })

    it('should create audit log for login attempts', async () => {
      const hashedPassword = await bcrypt.hash('MiContraseña123!', 12)
      
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        phone: '8091234567',
        password: hashedPassword,
        isActive: true,
        loginAttempts: 0,
      })

      mockPrisma.session.create.mockResolvedValue({
        id: 'session-1',
        token: 'mock-jwt-token',
      })

      await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(200)

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'USER_LOGIN',
          userId: '1',
          success: true,
          ipAddress: expect.any(String),
          userAgent: expect.any(String),
        }),
      })
    })
  })

  describe('POST /api/auth/logout', () => {
    it('should logout user and invalidate session', async () => {
      const authToken = 'valid-jwt-token'
      
      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'session-1',
        userId: '1',
        token: authToken,
      })

      mockPrisma.session.delete.mockResolvedValue({})

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: 'Sesión cerrada exitosamente',
      })

      expect(mockPrisma.session.delete).toHaveBeenCalledWith({
        where: { token: authToken },
      })
    })

    it('should handle invalid session token', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null)

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Sesión inválida',
      })
    })

    it('should create audit log for logout', async () => {
      const authToken = 'valid-jwt-token'
      
      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'session-1',
        userId: '1',
        token: authToken,
      })

      mockPrisma.session.delete.mockResolvedValue({})

      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'USER_LOGOUT',
          userId: '1',
          success: true,
        }),
      })
    })
  })

  describe('GET /api/auth/profile', () => {
    it('should return user profile for authenticated user', async () => {
      const authToken = 'valid-jwt-token'
      
      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'session-1',
        userId: '1',
        token: authToken,
        user: {
          id: '1',
          phone: '8091234567',
          name: 'Juan Pérez',
          businessName: 'Colmado El Tigueraje',
          businessType: 'colmado',
          location: {
            address: 'Calle Primera #123, Santo Domingo',
            coordinates: {
              lat: 18.4861,
              lng: -69.9312
            }
          },
          createdAt: new Date(),
        },
      })

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        user: {
          id: '1',
          phone: '8091234567',
          name: 'Juan Pérez',
          businessName: 'Colmado El Tigueraje',
          businessType: 'colmado',
        },
      })

      // Should not return sensitive data
      expect(response.body.user.password).toBeUndefined()
    })

    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Token de autorización requerido',
      })
    })

    it('should handle invalid session token', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null)

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Sesión inválida',
      })
    })
  })

  describe('Security Features', () => {
    it('should hash passwords before storing', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.user.create.mockResolvedValue({
        id: '1',
        phone: '8091234567',
      })

      await request(app)
        .post('/api/auth/register')
        .send({
          phone: '8091234567',
          name: 'Juan Pérez',
          password: 'PlainTextPassword123!',
          businessName: 'Test Business',
          businessType: 'colmado',
        })
        .expect(201)

      const createCall = mockPrisma.user.create.mock.calls[0]
      const hashedPassword = createCall[0].data.password

      expect(hashedPassword).not.toBe('PlainTextPassword123!')
      expect(hashedPassword).toMatch(/^\$2[aby]\$\d+\$/)
    })

    it('should include CSRF protection headers', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401)

      expect(response.headers['x-csrf-protection']).toBe('1')
    })

    it('should set secure session headers', async () => {
      const hashedPassword = await bcrypt.hash('MiContraseña123!', 12)
      
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        phone: '8091234567',
        password: hashedPassword,
        isActive: true,
        loginAttempts: 0,
      })

      mockPrisma.session.create.mockResolvedValue({
        id: 'session-1',
        token: 'mock-jwt-token',
      })

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '8091234567',
          password: 'MiContraseña123!',
        })
        .expect(200)

      expect(response.headers['set-cookie']).toBeDefined()
      expect(response.headers['set-cookie'][0]).toMatch(/HttpOnly/)
      expect(response.headers['set-cookie'][0]).toMatch(/Secure/)
      expect(response.headers['set-cookie'][0]).toMatch(/SameSite/)
    })

    it('should validate request rate limiting', async () => {
      // Make multiple rapid requests
      const requests = Array(20).fill(null).map(() =>
        request(app)
          .post('/api/auth/login')
          .send({
            phone: '8091234567',
            password: 'test',
          })
      )

      const responses = await Promise.all(requests)
      const rateLimitedResponses = responses.filter(r => r.status === 429)

      expect(rateLimitedResponses.length).toBeGreaterThan(0)
    })
  })

  describe('Dominican Law 172-13 Compliance', () => {
    it('should provide data usage consent during registration', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.user.create.mockResolvedValue({
        id: '1',
        phone: '8091234567',
      })

      const registrationData = {
        phone: '8091234567',
        name: 'Juan Pérez',
        password: 'MiContraseña123!',
        businessName: 'Test Business',
        businessType: 'colmado',
        dataConsent: true,
        marketingConsent: false,
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(201)

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          dataConsent: true,
          marketingConsent: false,
          consentDate: expect.any(Date),
        }),
      })
    })

    it('should require explicit data consent', async () => {
      const registrationData = {
        phone: '8091234567',
        name: 'Juan Pérez',
        password: 'MiContraseña123!',
        businessName: 'Test Business',
        businessType: 'colmado',
        // Missing dataConsent: true
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(400)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Consentimiento de datos requerido según Ley 172-13',
      })
    })

    it('should provide data export functionality', async () => {
      const authToken = 'valid-jwt-token'
      
      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'session-1',
        userId: '1',
        user: { id: '1', phone: '8091234567' },
      })

      const response = await request(app)
        .get('/api/auth/export-data')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          personalData: expect.any(Object),
          transactionHistory: expect.any(Array),
          consentHistory: expect.any(Array),
        }),
      })
    })
  })
})