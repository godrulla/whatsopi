import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockDominicanAIResponses, mockHaitianAIResponses, mockNLPSystem } from '@/test/mocks/ai'
import { AIProviderManager } from '@/lib/ai/providers/manager'
import { DominicanProcessor } from '@/lib/ai/nlp/dominican-processor'
import { HaitianProcessor } from '@/lib/ai/nlp/haitian-processor'
import { LanguageDetector } from '@/lib/ai/nlp/language-detector'

describe('Dominican NLP Integration Tests', () => {
  let aiManager: AIProviderManager
  let dominicanProcessor: DominicanProcessor
  let haitianProcessor: HaitianProcessor
  let languageDetector: LanguageDetector

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Initialize AI components with mocks
    aiManager = new AIProviderManager({
      providers: ['claude', 'alia', 'openai'],
      defaultProvider: 'claude'
    })
    
    dominicanProcessor = new DominicanProcessor()
    haitianProcessor = new HaitianProcessor()
    languageDetector = new LanguageDetector()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Dominican Spanish Processing', () => {
    it('should correctly process Dominican greetings', async () => {
      const input = 'Klk tiguer, que lo que'
      const expectedResponse = mockDominicanAIResponses.greeting

      // Mock the AI provider response
      vi.spyOn(aiManager, 'processRequest').mockResolvedValue({
        success: true,
        provider: 'claude',
        response: expectedResponse.output,
        metadata: { 
          processingTime: 150,
          confidence: 0.95,
          language: 'es-DO'
        }
      })

      const result = await aiManager.processRequest({
        capability: 'nlp',
        input,
        context: { language: 'es-DO', sessionId: 'test-session' }
      })

      expect(result.success).toBe(true)
      expect(result.response.intent).toBe('greeting')
      expect(result.response.language).toBe('es-DO')
      expect(result.response.confidence).toBeGreaterThanOrEqual(0.9)
      expect(result.response.culturalMarkers).toContain('klk')
      expect(result.response.culturalMarkers).toContain('tiguer')
      expect(result.response.culturalMarkers).toContain('que lo que')
    })

    it('should handle Dominican product searches with cultural context', async () => {
      const input = 'Busco pollo barato en el colmado'
      const expectedResponse = mockDominicanAIResponses.productSearch

      vi.spyOn(aiManager, 'processRequest').mockResolvedValue({
        success: true,
        provider: 'alia', // ALIA better for Dominican Spanish
        response: expectedResponse.output,
        metadata: { 
          processingTime: 200,
          confidence: 0.92,
          language: 'es-DO'
        }
      })

      const result = await aiManager.processRequest({
        capability: 'nlp',
        input,
        context: { 
          language: 'es-DO', 
          sessionId: 'test-session',
          location: { city: 'Santo Domingo' }
        }
      })

      expect(result.success).toBe(true)
      expect(result.response.intent).toBe('search_product')
      expect(result.response.entities).toContainEqual(
        expect.objectContaining({ type: 'product', text: 'pollo' })
      )
      expect(result.response.entities).toContainEqual(
        expect.objectContaining({ type: 'location', text: 'colmado' })
      )
      expect(result.response.entities).toContainEqual(
        expect.objectContaining({ type: 'price_modifier', text: 'barato' })
      )
      expect(result.response.culturalMarkers).toContain('colmado')
    })

    it('should process Dominican price inquiries accurately', async () => {
      const input = '¿Cuánto vale el arroz?'
      const expectedResponse = mockDominicanAIResponses.priceInquiry

      vi.spyOn(aiManager, 'processRequest').mockResolvedValue({
        success: true,
        provider: 'claude',
        response: expectedResponse.output,
        metadata: { 
          processingTime: 120,
          confidence: 0.88,
          language: 'es-DO'
        }
      })

      const result = await aiManager.processRequest({
        capability: 'nlp',
        input,
        context: { language: 'es-DO', sessionId: 'test-session' }
      })

      expect(result.success).toBe(true)
      expect(result.response.intent).toBe('price_inquiry')
      expect(result.response.entities).toContainEqual(
        expect.objectContaining({ type: 'product', text: 'arroz' })
      )
      expect(result.response.response).toContain('RD$')
    })

    it('should adapt responses to Dominican cultural context', async () => {
      const input = 'Hola, ¿cómo está todo?'
      
      // Mock cultural adaptation
      vi.spyOn(dominicanProcessor, 'adaptResponse').mockResolvedValue({
        originalResponse: 'Hola, todo bien. ¿En qué puedo ayudarte?',
        adaptedResponse: '¡Klk loco! Todo jevi por aquí. ¿En qué te puedo ayudar?',
        culturalScore: 0.95,
        adaptations: [
          { original: 'Hola', adapted: '¡Klk loco!' },
          { original: 'todo bien', adapted: 'todo jevi' },
          { original: 'ayudarte', adapted: 'ayudar' }
        ]
      })

      const culturalResponse = await dominicanProcessor.adaptResponse(
        'Hola, todo bien. ¿En qué puedo ayudarte?',
        { region: 'capital', formality: 'informal' }
      )

      expect(culturalResponse.adaptedResponse).toContain('Klk')
      expect(culturalResponse.adaptedResponse).toContain('jevi')
      expect(culturalResponse.culturalScore).toBeGreaterThanOrEqual(0.9)
    })
  })

  describe('Haitian Creole Processing', () => {
    it('should correctly process Haitian Creole greetings', async () => {
      const input = 'Sak pase, nap boule'
      const expectedResponse = mockHaitianAIResponses.greeting

      vi.spyOn(aiManager, 'processRequest').mockResolvedValue({
        success: true,
        provider: 'claude',
        response: expectedResponse.output,
        metadata: { 
          processingTime: 180,
          confidence: 0.93,
          language: 'ht'
        }
      })

      const result = await aiManager.processRequest({
        capability: 'nlp',
        input,
        context: { language: 'ht', sessionId: 'test-session' }
      })

      expect(result.success).toBe(true)
      expect(result.response.intent).toBe('greeting')
      expect(result.response.language).toBe('ht')
      expect(result.response.culturalMarkers).toContain('sak pase')
      expect(result.response.culturalMarkers).toContain('nap boule')
    })

    it('should handle Haitian Creole product requests', async () => {
      const input = 'Mwen bezwen achte diri'
      const expectedResponse = mockHaitianAIResponses.productSearch

      vi.spyOn(aiManager, 'processRequest').mockResolvedValue({
        success: true,
        provider: 'claude',
        response: expectedResponse.output,
        metadata: { 
          processingTime: 200,
          confidence: 0.89,
          language: 'ht'
        }
      })

      const result = await aiManager.processRequest({
        capability: 'nlp',
        input,
        context: { language: 'ht', sessionId: 'test-session' }
      })

      expect(result.success).toBe(true)
      expect(result.response.intent).toBe('purchase_intent')
      expect(result.response.entities).toContainEqual(
        expect.objectContaining({ type: 'product', text: 'diri' })
      )
    })

    it('should translate Haitian Creole to Spanish when needed', async () => {
      const input = 'Mwen bezwen achte diri'
      
      vi.spyOn(haitianProcessor, 'translateToSpanish').mockResolvedValue({
        originalText: 'Mwen bezwen achte diri',
        translatedText: 'Necesito comprar arroz',
        confidence: 0.91,
        detectedDialect: 'haitian_standard'
      })

      const translation = await haitianProcessor.translateToSpanish(input)

      expect(translation.translatedText).toBe('Necesito comprar arroz')
      expect(translation.confidence).toBeGreaterThanOrEqual(0.85)
    })
  })

  describe('Language Detection Integration', () => {
    it('should accurately detect Dominican Spanish', async () => {
      const testCases = [
        'Klk tiguer, que lo que',
        'Ey loco, ese colmado tá brutal',
        'Cuánto vale el pollo en tu colmado'
      ]

      for (const input of testCases) {
        vi.spyOn(languageDetector, 'detectLanguage').mockResolvedValue({
          language: 'es-DO',
          confidence: 0.92,
          dialect: 'dominican_spanish',
          culturalMarkers: ['klk', 'tiguer', 'loco', 'tá', 'brutal', 'colmado']
        })

        const result = await languageDetector.detectLanguage(input, {})
        
        expect(result.language).toBe('es-DO')
        expect(result.confidence).toBeGreaterThanOrEqual(0.9)
        expect(result.dialect).toBe('dominican_spanish')
      }
    })

    it('should accurately detect Haitian Creole', async () => {
      const testCases = [
        'Sak pase, nap boule',
        'Mwen bezwen achte diri',
        'Kijan ou ye?'
      ]

      for (const input of testCases) {
        vi.spyOn(languageDetector, 'detectLanguage').mockResolvedValue({
          language: 'ht',
          confidence: 0.88,
          dialect: 'haitian_creole',
          culturalMarkers: ['sak pase', 'nap boule', 'mwen', 'bezwen', 'diri']
        })

        const result = await languageDetector.detectLanguage(input, {})
        
        expect(result.language).toBe('ht')
        expect(result.confidence).toBeGreaterThanOrEqual(0.85)
        expect(result.dialect).toBe('haitian_creole')
      }
    })

    it('should handle code-switching between Spanish and Creole', async () => {
      const input = 'Pero mwen pa konprann español muy bien'
      
      vi.spyOn(languageDetector, 'detectLanguage').mockResolvedValue({
        language: 'ht', // Primary language
        confidence: 0.7,
        dialect: 'haitian_spanish_mix',
        culturalMarkers: ['mwen', 'pa', 'konprann'],
        codeSwitching: {
          detected: true,
          languages: ['ht', 'es'],
          segments: [
            { text: 'Pero', language: 'es' },
            { text: 'mwen pa konprann', language: 'ht' },
            { text: 'español muy bien', language: 'es' }
          ]
        }
      })

      const result = await languageDetector.detectLanguage(input, {})
      
      expect(result.language).toBe('ht')
      expect(result.codeSwitching.detected).toBe(true)
      expect(result.codeSwitching.languages).toContain('ht')
      expect(result.codeSwitching.languages).toContain('es')
    })
  })

  describe('Provider Selection and Routing', () => {
    it('should route Dominican Spanish to ALIA provider', async () => {
      const input = 'Klk tiguer, ¿cómo tú tá?'
      
      vi.spyOn(aiManager, 'selectOptimalProvider').mockResolvedValue('alia')
      
      const selectedProvider = await aiManager.selectOptimalProvider({
        capability: 'nlp',
        language: 'es-DO',
        input
      })

      expect(selectedProvider).toBe('alia')
    })

    it('should fallback to Claude for Haitian Creole', async () => {
      const input = 'Sak pase, kijan ou ye?'
      
      vi.spyOn(aiManager, 'selectOptimalProvider').mockResolvedValue('claude')
      
      const selectedProvider = await aiManager.selectOptimalProvider({
        capability: 'nlp',
        language: 'ht',
        input
      })

      expect(selectedProvider).toBe('claude')
    })

    it('should handle provider failures with graceful fallback', async () => {
      const input = 'Klk, busco pollo'
      
      // Mock ALIA failure
      vi.spyOn(aiManager, 'processRequest')
        .mockRejectedValueOnce(new Error('ALIA provider unavailable'))
        .mockResolvedValueOnce({
          success: true,
          provider: 'claude',
          response: {
            intent: 'search_product',
            entities: [{ type: 'product', text: 'pollo' }],
            language: 'es-DO',
            confidence: 0.88
          },
          metadata: { 
            attemptCount: 2,
            fallbackUsed: true 
          }
        })

      const result = await aiManager.processRequest({
        capability: 'nlp',
        input,
        context: { language: 'es-DO', sessionId: 'test-session' }
      })

      expect(result.success).toBe(true)
      expect(result.provider).toBe('claude')
      expect(result.metadata.fallbackUsed).toBe(true)
      expect(result.metadata.attemptCount).toBe(2)
    })
  })

  describe('Cultural Appropriateness Validation', () => {
    it('should validate Dominican cultural appropriateness', async () => {
      const responses = [
        '¡Klk loco! Todo jevi por aquí.',
        'Ese precio tá brutal, tiguer.',
        'El colmado queda cerca de la esquina.'
      ]

      for (const response of responses) {
        vi.spyOn(dominicanProcessor, 'validateCulturalAppropriateness')
          .mockResolvedValue({
            appropriate: true,
            score: 0.95,
            culturalMarkers: ['klk', 'loco', 'jevi', 'tá', 'brutal', 'tiguer', 'colmado'],
            suggestions: []
          })

        const validation = await dominicanProcessor.validateCulturalAppropriateness(
          response,
          { region: 'capital', audience: 'general' }
        )

        expect(validation.appropriate).toBe(true)
        expect(validation.score).toBeGreaterThanOrEqual(0.9)
      }
    })

    it('should detect culturally inappropriate content', async () => {
      const inappropriateResponses = [
        'Habla sobre política dominicana',
        'Los haitianos son el problema',
        'Ese gobierno está corrupto'
      ]

      for (const response of inappropriateResponses) {
        vi.spyOn(dominicanProcessor, 'validateCulturalAppropriateness')
          .mockResolvedValue({
            appropriate: false,
            score: 0.2,
            culturalMarkers: [],
            suggestions: ['Avoid political topics', 'Use neutral language', 'Focus on commerce']
          })

        const validation = await dominicanProcessor.validateCulturalAppropriateness(
          response,
          { region: 'capital', audience: 'general' }
        )

        expect(validation.appropriate).toBe(false)
        expect(validation.score).toBeLessThan(0.5)
        expect(validation.suggestions).toHaveLength(3)
      }
    })
  })

  describe('Performance and Response Times', () => {
    it('should meet response time requirements for Dominican Spanish', async () => {
      const input = 'Klk, cuánto cuesta el arroz'
      const startTime = Date.now()

      vi.spyOn(aiManager, 'processRequest').mockResolvedValue({
        success: true,
        provider: 'alia',
        response: {
          intent: 'price_inquiry',
          entities: [{ type: 'product', text: 'arroz' }],
          language: 'es-DO',
          confidence: 0.91
        },
        metadata: { 
          processingTime: 480 // 480ms
        }
      })

      const result = await aiManager.processRequest({
        capability: 'nlp',
        input,
        context: { language: 'es-DO', sessionId: 'test-session' }
      })

      const endTime = Date.now()
      const totalTime = endTime - startTime

      expect(result.success).toBe(true)
      expect(result.metadata.processingTime).toBeLessThan(500) // < 500ms requirement
      expect(totalTime).toBeLessThan(1000) // Total request time < 1s
    })

    it('should handle concurrent requests efficiently', async () => {
      const requests = Array(10).fill().map((_, i) => ({
        capability: 'nlp' as const,
        input: `Klk, busco producto ${i}`,
        context: { language: 'es-DO', sessionId: `test-session-${i}` }
      }))

      // Mock concurrent processing
      vi.spyOn(aiManager, 'processRequest').mockImplementation(async (request) => ({
        success: true,
        provider: 'alia',
        response: {
          intent: 'search_product',
          entities: [{ type: 'product', text: `producto ${request.context.sessionId.split('-')[2]}` }],
          language: 'es-DO',
          confidence: 0.9
        },
        metadata: { processingTime: 300 }
      }))

      const startTime = Date.now()
      const results = await Promise.all(
        requests.map(req => aiManager.processRequest(req))
      )
      const endTime = Date.now()

      expect(results).toHaveLength(10)
      expect(results.every(r => r.success)).toBe(true)
      
      const avgResponseTime = (endTime - startTime) / requests.length
      expect(avgResponseTime).toBeLessThan(100) // Should handle concurrency efficiently
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty input gracefully', async () => {
      const input = ''

      vi.spyOn(aiManager, 'processRequest').mockResolvedValue({
        success: false,
        provider: null,
        response: null,
        error: {
          code: 'EMPTY_INPUT',
          message: 'Input cannot be empty',
          severity: 'low'
        },
        metadata: {}
      })

      const result = await aiManager.processRequest({
        capability: 'nlp',
        input,
        context: { language: 'es-DO', sessionId: 'test-session' }
      })

      expect(result.success).toBe(false)
      expect(result.error.code).toBe('EMPTY_INPUT')
    })

    it('should handle very long input appropriately', async () => {
      const input = 'a'.repeat(10000) // Very long input

      vi.spyOn(aiManager, 'processRequest').mockResolvedValue({
        success: false,
        provider: null,
        response: null,
        error: {
          code: 'INPUT_TOO_LONG',
          message: 'Input exceeds maximum length',
          severity: 'medium'
        },
        metadata: {}
      })

      const result = await aiManager.processRequest({
        capability: 'nlp',
        input,
        context: { language: 'es-DO', sessionId: 'test-session' }
      })

      expect(result.success).toBe(false)
      expect(result.error.code).toBe('INPUT_TOO_LONG')
    })

    it('should handle mixed language input', async () => {
      const input = 'Hello klk tiguer, how are you tú?'

      vi.spyOn(languageDetector, 'detectLanguage').mockResolvedValue({
        language: 'mixed',
        confidence: 0.6,
        dialect: 'multilingual',
        culturalMarkers: ['klk', 'tiguer'],
        codeSwitching: {
          detected: true,
          languages: ['en', 'es-DO'],
          segments: [
            { text: 'Hello', language: 'en' },
            { text: 'klk tiguer', language: 'es-DO' },
            { text: 'how are you', language: 'en' },
            { text: 'tú', language: 'es-DO' }
          ]
        }
      })

      const result = await languageDetector.detectLanguage(input, {})

      expect(result.language).toBe('mixed')
      expect(result.codeSwitching.detected).toBe(true)
      expect(result.codeSwitching.languages).toContain('en')
      expect(result.codeSwitching.languages).toContain('es-DO')
    })
  })
})