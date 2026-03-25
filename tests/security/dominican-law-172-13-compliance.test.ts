import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '@/api/src/server'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'

describe('Dominican Law 172-13 Data Protection Compliance', () => {
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

  describe('Data Collection and Consent (Art. 7-12)', () => {
    it('should require explicit consent for personal data collection', async () => {
      const registrationData = {
        phone: '8091234567',
        name: 'Juan Pérez',
        businessName: 'Colmado Juan',
        password: 'SecurePass123!',
        // Missing required consents
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(400)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Consentimiento requerido según Ley 172-13',
        requiredConsents: [
          'dataProcessing',
          'dataStorage',
          'marketingCommunications'
        ],
        lawReference: 'Ley 172-13, Artículos 7-12'
      })
    })

    it('should record consent with proper audit trail', async () => {
      const registrationData = {
        phone: '8091234567',
        name: 'Juan Pérez',
        businessName: 'Colmado Juan',
        password: 'SecurePass123!',
        consents: {
          dataProcessing: {
            granted: true,
            timestamp: new Date().toISOString(),
            ipAddress: '192.168.1.1',
            userAgent: 'WhatsOpí Mobile App 1.0'
          },
          dataStorage: {
            granted: true,
            timestamp: new Date().toISOString(),
            ipAddress: '192.168.1.1',
            userAgent: 'WhatsOpí Mobile App 1.0'
          },
          marketingCommunications: {
            granted: false,
            timestamp: new Date().toISOString(),
            ipAddress: '192.168.1.1',
            userAgent: 'WhatsOpí Mobile App 1.0'
          }
        }
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(201)

      expect(response.body.user).toMatchObject({
        consents: expect.objectContaining({
          dataProcessing: true,
          dataStorage: true,
          marketingCommunications: false
        }),
        consentAudit: expect.arrayContaining([
          expect.objectContaining({
            type: 'dataProcessing',
            granted: true,
            timestamp: expect.any(String),
            ipAddress: '192.168.1.1',
            lawBasis: 'Ley 172-13 Art. 7'
          })
        ])
      })
    })

    it('should allow consent withdrawal at any time', async () => {
      const authToken = 'valid-jwt-token'

      const response = await request(app)
        .patch('/api/privacy/withdraw-consent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          consentType: 'marketingCommunications',
          reason: 'Ya no deseo recibir mensajes promocionales',
          confirmWithdrawal: true
        })
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: 'Consentimiento retirado exitosamente',
        updatedConsents: expect.objectContaining({
          marketingCommunications: false
        }),
        effectiveDate: expect.any(String),
        lawCompliance: 'Ley 172-13 Art. 11'
      })
    })
  })

  describe('Data Subject Rights (Art. 20-28)', () => {
    it('should provide data portability in standard format', async () => {
      const authToken = 'valid-jwt-token'

      const response = await request(app)
        .get('/api/privacy/export-data')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        exportFormat: 'JSON',
        lawCompliance: 'Ley 172-13 Art. 23',
        data: expect.objectContaining({
          personalInformation: expect.objectContaining({
            name: expect.any(String),
            phone: expect.any(String),
            businessName: expect.any(String),
            registrationDate: expect.any(String)
          }),
          businessData: expect.objectContaining({
            orders: expect.any(Array),
            products: expect.any(Array),
            transactions: expect.any(Array)
          }),
          consentHistory: expect.any(Array),
          dataProcessingLog: expect.any(Array)
        }),
        generatedAt: expect.any(String),
        retentionPolicy: expect.stringContaining('7 años')
      })

      // Should not include sensitive system data
      expect(response.body.data).not.toHaveProperty('passwordHash')
      expect(response.body.data).not.toHaveProperty('internalId')
      expect(response.body.data).not.toHaveProperty('systemLogs')
    })

    it('should handle data rectification requests', async () => {
      const authToken = 'valid-jwt-token'

      const response = await request(app)
        .patch('/api/privacy/rectify-data')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          field: 'businessName',
          currentValue: 'Colmado Juan',
          newValue: 'Supermercado Juan Carlos',
          justification: 'Cambio oficial del nombre del negocio',
          supportingDocuments: ['cedula_juridica_updated.pdf']
        })
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: 'Datos actualizados según Ley 172-13',
        changedFields: ['businessName'],
        auditTrail: expect.objectContaining({
          previousValue: 'Colmado Juan',
          newValue: 'Supermercado Juan Carlos',
          changeDate: expect.any(String),
          lawBasis: 'Ley 172-13 Art. 21'
        })
      })
    })

    it('should process erasure requests with legal exceptions', async () => {
      const authToken = 'valid-jwt-token'

      const response = await request(app)
        .delete('/api/privacy/erase-data')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          confirmErasure: true,
          reason: 'Ya no uso la plataforma',
          acknowledgeConsequences: true
        })
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: 'Solicitud de borrado procesada',
        erasureStatus: 'partial', // Some data must be retained by law
        retainedData: expect.objectContaining({
          financialRecords: {
            retained: true,
            reason: 'Obligación legal fiscal - 7 años',
            lawReference: 'Código Tributario Dominicano'
          },
          transactionHistory: {
            retained: true,
            reason: 'Prevención lavado de activos',
            lawReference: 'Ley 155-17'
          }
        }),
        personalDataErased: expect.arrayContaining([
          'profilePicture',
          'preferences',
          'marketingData',
          'locationHistory'
        ]),
        completionDate: expect.any(String)
      })
    })
  })

  describe('Data Security Requirements (Art. 29-35)', () => {
    it('should encrypt personal data at rest using AES-256', async () => {
      const testData = {
        name: 'Juan Pérez',
        phone: '8091234567',
        address: 'Calle Primera #123, Santo Domingo'
      }

      // Test encryption endpoint
      const response = await request(app)
        .post('/api/security/test-encryption')
        .send({ testData })
        .expect(200)

      expect(response.body).toMatchObject({
        encryptionStandard: 'AES-256-GCM',
        encrypted: true,
        keyRotation: expect.any(String),
        lawCompliance: 'Ley 172-13 Art. 31'
      })

      // Encrypted data should not contain original values
      expect(response.body.encryptedData).not.toContain('Juan Pérez')
      expect(response.body.encryptedData).not.toContain('8091234567')
    })

    it('should implement secure data transmission', async () => {
      const response = await request(app)
        .get('/api/security/transmission-test')
        .expect(200)

      expect(response.headers).toMatchObject({
        'strict-transport-security': expect.stringContaining('max-age'),
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY',
        'x-xss-protection': '1; mode=block',
        'content-security-policy': expect.stringContaining('default-src'),
        'referrer-policy': 'strict-origin-when-cross-origin'
      })

      expect(response.body).toMatchObject({
        tlsVersion: expect.stringMatching(/1\.[23]/),
        cipherSuite: expect.stringContaining('AES'),
        lawCompliance: 'Ley 172-13 Art. 32'
      })
    })

    it('should log security events for audit', async () => {
      const suspiciousRequest = {
        phone: '8091234567',
        password: 'password123' // Weak password attempt
      }

      const response = await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', '192.168.1.100')
        .send(suspiciousRequest)
        .expect(401)

      // Should create security audit log
      const auditResponse = await request(app)
        .get('/api/security/audit-logs')
        .set('Authorization', 'Bearer admin-token')
        .expect(200)

      expect(auditResponse.body.logs).toContainEqual(
        expect.objectContaining({
          event: 'FAILED_LOGIN_ATTEMPT',
          ipAddress: '192.168.1.100',
          phone: '8091234567',
          timestamp: expect.any(String),
          riskLevel: 'medium',
          lawCompliance: 'Ley 172-13 Art. 34'
        })
      )
    })
  })

  describe('Cross-Border Data Transfer (Art. 36-42)', () => {
    it('should restrict data transfer to adequate countries only', async () => {
      const transferRequest = {
        userId: 'user-123',
        targetCountry: 'US', // Not in Dominican adequate countries list
        purpose: 'cloud_backup',
        dataTypes: ['personalInfo', 'businessData']
      }

      const response = await request(app)
        .post('/api/privacy/request-transfer')
        .send(transferRequest)
        .expect(403)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Transferencia no autorizada según Ley 172-13',
        reason: 'País de destino sin nivel de protección adecuado',
        adequateCountries: expect.arrayContaining([
          'ES', // Spain
          'CA', // Canada (partial)
          'UY'  // Uruguay
        ]),
        lawReference: 'Ley 172-13 Art. 37',
        alternatives: expect.arrayContaining([
          'Almacenamiento local en República Dominicana',
          'Servidor en país con protección adecuada'
        ])
      })
    })

    it('should require explicit consent for transfers with safeguards', async () => {
      const transferRequest = {
        userId: 'user-123',
        targetCountry: 'US',
        purpose: 'ai_processing',
        dataTypes: ['voiceRecordings'],
        safeguards: {
          contractualClauses: true,
          encryption: 'AES-256',
          dataMinimization: true,
          retentionLimit: '30_days'
        },
        userConsent: {
          granted: true,
          informedConsent: true,
          timestamp: new Date().toISOString()
        }
      }

      const response = await request(app)
        .post('/api/privacy/request-transfer')
        .set('Authorization', 'Bearer valid-token')
        .send(transferRequest)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        transferId: expect.any(String),
        status: 'approved_with_safeguards',
        safeguards: expect.objectContaining({
          contractualClauses: 'Standard_Contractual_Clauses_EU',
          encryption: 'AES-256',
          auditRights: true,
          dataCopyRights: true
        }),
        lawCompliance: 'Ley 172-13 Art. 39',
        monitoring: expect.objectContaining({
          auditSchedule: 'quarterly',
          reportingRequired: true
        })
      })
    })
  })

  describe('Incident Response (Art. 43-48)', () => {
    it('should detect and report data breaches within 72 hours', async () => {
      // Simulate a data breach detection
      const breachSimulation = {
        type: 'unauthorized_access',
        affectedRecords: 150,
        dataTypes: ['phone_numbers', 'business_names'],
        detectionTime: new Date().toISOString(),
        severity: 'medium'
      }

      const response = await request(app)
        .post('/api/security/simulate-breach')
        .set('Authorization', 'Bearer admin-token')
        .send(breachSimulation)
        .expect(200)

      expect(response.body).toMatchObject({
        breachId: expect.any(String),
        status: 'detected',
        automaticResponse: {
          immediateActions: expect.arrayContaining([
            'Secured affected systems',
            'Isolated compromised data',
            'Initiated incident response protocol'
          ]),
          notificationSchedule: {
            authorities: '72_hours', // Ley 172-13 requirement
            affectedUsers: '72_hours',
            publicNotification: 'if_high_risk'
          }
        },
        lawCompliance: 'Ley 172-13 Art. 44',
        reportingDetails: expect.objectContaining({
          authorityToNotify: 'Dirección General de Protección de Datos Personales',
          reportFormat: 'standard_172_13',
          requiredInformation: expect.arrayContaining([
            'nature_of_breach',
            'affected_data_categories',
            'approximate_number_affected',
            'likely_consequences',
            'measures_taken'
          ])
        })
      })
    })

    it('should notify affected users in Dominican Spanish', async () => {
      const breachNotification = {
        breachId: 'BREACH-2024-001',
        affectedUsers: ['8091234567', '8291234568'],
        severity: 'medium',
        dataTypes: ['phone_numbers', 'order_history']
      }

      const response = await request(app)
        .post('/api/security/notify-breach')
        .set('Authorization', 'Bearer admin-token')
        .send(breachNotification)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        notificationsScheduled: 2,
        notificationMethod: 'whatsapp_sms_email',
        language: 'es-DO',
        messageContent: expect.objectContaining({
          subject: 'Notificación Importante de Seguridad - WhatsOpí',
          body: expect.stringContaining('incidente de seguridad'),
          actions: expect.arrayContaining([
            'Cambiar contraseña inmediatamente',
            'Revisar actividad reciente',
            'Contactar soporte si tiene dudas'
          ]),
          lawReferences: 'Según la Ley 172-13, Art. 45',
          contactInfo: {
            support: '+1-809-555-0123',
            email: 'seguridad@whatsopi.do',
            hours: 'Lunes a Viernes, 8 AM - 6 PM'
          }
        })
      })
    })
  })

  describe('Data Protection Officer (DPO) Requirements (Art. 49-52)', () => {
    it('should provide DPO contact information', async () => {
      const response = await request(app)
        .get('/api/privacy/dpo-contact')
        .expect(200)

      expect(response.body).toMatchObject({
        dpo: {
          name: 'Licenciado en Derecho María González',
          title: 'Oficial de Protección de Datos',
          certification: 'Certificado CIPP/LAT',
          contact: {
            email: 'dpo@whatsopi.do',
            phone: '+1-809-555-0100',
            address: 'Av. Abraham Lincoln #123, Santo Domingo'
          },
          languages: ['español', 'english'],
          availability: 'Lunes a Viernes, 9 AM - 5 PM',
          responseTime: '72_hours_maximum'
        },
        lawCompliance: 'Ley 172-13 Art. 50',
        jurisdiction: 'República Dominicana'
      })
    })

    it('should handle DPO complaints and requests', async () => {
      const complaint = {
        type: 'data_processing_objection',
        description: 'No autorizé el uso de mis datos para marketing',
        userInfo: {
          phone: '8091234567',
          name: 'Ana Martínez'
        },
        requestedAction: 'stop_marketing_processing',
        evidence: ['screenshot_marketing_message.jpg']
      }

      const response = await request(app)
        .post('/api/privacy/dpo/complaint')
        .send(complaint)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        complaintId: expect.stringMatching(/^DPO-\d{4}-\d{3}$/),
        status: 'received',
        acknowledgment: 'Su queja ha sido recibida y será procesada según la Ley 172-13',
        timeline: {
          acknowledgmentSent: expect.any(String),
          investigationStart: expect.any(String),
          estimatedResolution: expect.any(String), // Should be within 30 days
          lawDeadline: '30_days_maximum'
        },
        nextSteps: expect.arrayContaining([
          'Investigación del caso',
          'Contacto con usuario afectado',
          'Implementación de medidas correctivas',
          'Respuesta formal con resolución'
        ]),
        lawCompliance: 'Ley 172-13 Art. 51'
      })
    })
  })

  describe('Regulatory Authority Compliance', () => {
    it('should generate compliance reports for authorities', async () => {
      const response = await request(app)
        .get('/api/compliance/annual-report/2024')
        .set('Authorization', 'Bearer admin-token')
        .expect(200)

      expect(response.body).toMatchObject({
        reportType: 'annual_compliance_report',
        year: 2024,
        organization: {
          name: 'WhatsOpí SRL',
          taxId: 'RNC-123456789',
          address: 'Santo Domingo, República Dominicana',
          dpo: expect.any(Object)
        },
        dataProcessingActivities: expect.objectContaining({
          totalUsers: expect.any(Number),
          dataCategories: expect.arrayContaining([
            'contact_information',
            'business_data',
            'transaction_records',
            'voice_recordings'
          ]),
          legalBases: expect.arrayContaining([
            'consent',
            'contract_performance',
            'legal_obligation'
          ]),
          retentionPeriods: expect.any(Object)
        }),
        securityMeasures: expect.objectContaining({
          encryption: 'AES-256',
          accessControls: 'role_based',
          auditLogs: 'comprehensive',
          incidentResponse: 'implemented'
        }),
        breachStatistics: expect.objectContaining({
          totalIncidents: expect.any(Number),
          resolved: expect.any(Number),
          reportedToAuthority: expect.any(Number),
          averageResolutionTime: expect.any(String)
        }),
        lawCompliance: 'Ley 172-13 - Cumplimiento Total',
        certifications: expect.arrayContaining([
          'ISO 27001',
          'SOC 2 Type II'
        ])
      })
    })
  })

  describe('Penalties and Enforcement Awareness', () => {
    it('should implement controls to avoid Law 172-13 penalties', async () => {
      const response = await request(app)
        .get('/api/compliance/penalty-prevention')
        .set('Authorization', 'Bearer admin-token')
        .expect(200)

      expect(response.body).toMatchObject({
        penaltyFramework: {
          minorViolations: 'RD$50,000 - RD$500,000',
          seriousViolations: 'RD$500,001 - RD$5,000,000',
          verySeriousViolations: 'RD$5,000,001 - RD$50,000,000'
        },
        preventiveControls: expect.arrayContaining([
          'Automated consent verification',
          'Data retention policies',
          'Breach detection systems',
          'Regular compliance audits',
          'Staff training programs'
        ]),
        monitoringMetrics: expect.objectContaining({
          consentCompliance: expect.any(Number), // Should be 100%
          dataRetentionCompliance: expect.any(Number),
          securityControlsEffectiveness: expect.any(Number),
          userRightsResponseTime: expect.any(Number)
        }),
        riskMitigation: expect.arrayContaining([
          'Regular legal review',
          'Technical safeguards updates',
          'Staff awareness training',
          'Third-party assessments'
        ])
      })

      // All compliance metrics should be at or near 100%
      expect(response.body.monitoringMetrics.consentCompliance).toBeGreaterThanOrEqual(95)
      expect(response.body.monitoringMetrics.dataRetentionCompliance).toBeGreaterThanOrEqual(95)
    })
  })
})